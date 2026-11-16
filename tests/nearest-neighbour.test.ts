import { describe, expect, it } from "vitest";
import {
  nearestNeighbour,
  prepareBaseline,
} from "../src/learning/nearest-neighbour";
import { finalFixture } from "./fixtures/final-check";

const immediate = () => Promise.resolve();

describe("1-nearest-neighbour on frozen features", () => {
  it("returns exact squared distances and labels, not fabricated probabilities", async () => {
    const result = await nearestNeighbour(
      [
        [0, 0],
        [2, 0],
      ],
      [0, 1],
      [
        [0.5, 0],
        [3, 0],
      ],
      2,
      { yieldBetweenQueries: immediate },
    );
    expect(result.predicted).toEqual([0, 1]);
    expect(result.squaredDistances).toEqual([0.25, 1]);
    expect(result).not.toHaveProperty("confidence");
    expect(result).not.toHaveProperty("loss");
  });
  it("breaks exact ties by recorded training order, deterministically", async () => {
    const run = () =>
      nearestNeighbour([[0], [0]], [1, 0], [[0]], 2, {
        yieldBetweenQueries: immediate,
      });
    expect((await run()).predicted).toEqual([1]);
    expect(await run()).toEqual(await run());
  });
  it("does not mutate or fit any supplied vectors or labels", async () => {
    const train = [new Float32Array([0, 1]), new Float32Array([1, 0])],
      labels = [0, 1];
    const before = train.map((v) => Array.from(v));
    await nearestNeighbour(train, labels, [new Float32Array([0.1, 0.9])], 2, {
      yieldBetweenQueries: immediate,
    });
    expect(train.map((v) => Array.from(v))).toEqual(before);
    expect(labels).toEqual([0, 1]);
  });
  it("returns no measurements for empty queries", async () => {
    expect(await nearestNeighbour([[0], [1]], [0, 1], [], 2)).toEqual({
      predicted: [],
      squaredDistances: [],
    });
  });
  it("rejects missing training data, bad labels, dimensions and non-finite features", async () => {
    for (const [xs, ys, queries, classes] of [
      [[], [], [[0]], 2],
      [[[0]], [], [[0]], 2],
      [[[0]], [2], [[0]], 2],
      [[[NaN]], [0], [[0]], 2],
      [[[0]], [0], [[Infinity]], 2],
      [[[0]], [0], [[0, 1]], 2],
      [[[0]], [0], [[0]], 1],
    ] as [number[][], number[], number[][], number][]) {
      await expect(
        nearestNeighbour(xs, ys, queries, classes),
      ).rejects.toThrow();
    }
  });
  it("cancels between bounded query steps instead of publishing a partial comparison", async () => {
    const controller = new AbortController();
    await expect(
      nearestNeighbour([[0], [1]], [0, 1], [[0], [1]], 2, {
        signal: controller.signal,
        yieldBetweenQueries: immediate,
        onProgress: (done) => {
          if (done === 1) controller.abort();
        },
      }),
    ).rejects.toThrow(/cancel/i);
  });
});

describe("baseline comparison data isolation", () => {
  it("uses the saved cap and class order, never test photos", () => {
    const f = finalFixture();
    const plan = prepareBaseline(f, f.model);
    expect(plan.train.map((i) => i.id)).toEqual(["ta", "tb"]);
    expect(plan.validation.map((i) => i.id)).toEqual(["va", "vb"]);
    expect(plan.truth).toEqual([0, 1]);
  });
  it("refuses changed snapshots, missing manifests or unknown training provenance", () => {
    for (const mutate of [
      (f: ReturnType<typeof finalFixture>) => {
        f.dataset.version++;
      },
      (f: ReturnType<typeof finalFixture>) => {
        delete f.model.experiment;
      },
      (f: ReturnType<typeof finalFixture>) => {
        delete f.model.trainImages;
      },
    ]) {
      const f = finalFixture();
      mutate(f);
      expect(() => prepareBaseline(f, f.model)).toThrow();
    }
  });
  it("applies the existing independence exclusions to the shared validation set", () => {
    const f = finalFixture();
    f.images[2].dhash = f.images[0].dhash;
    const plan = prepareBaseline(f, f.model);
    expect(plan.excluded).toBe(1);
    expect(plan.validation.map((i) => i.id)).toEqual(["vb"]);
    expect(plan.truth).toEqual([1]);
  });
});
