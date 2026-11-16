import { describe, expect, it } from "vitest";
import { finalFixture } from "./fixtures/final-check";
import { preparePromotion } from "../src/learning/review-promotion";
import {
  prepareLearningRound,
  runLearningRound,
} from "../src/learning/learning-round";
import { ENCODER } from "../src/learning/encoder";
function fixture() {
  const f = finalFixture();
  f.images.push({
    ...f.images[0],
    id: "pool",
    sha256: "pool",
    dhash: "0123456789abcdef",
    split: null,
    labelId: null,
    order: 8,
  });
  const change = preparePromotion(
    f,
    f.model,
    [
      {
        imageId: "pool",
        proposedLabelId: "a",
        confidence: 0.6,
        margin: 0.2,
        entropy: 0.67,
      },
    ],
    { pool: { kind: "approve", labelId: "b" } },
    "uncertainty",
    "2026-11-16T00:00:00Z",
  );
  return {
    ...f,
    dataset: change.dataset,
    images: f.images.map((i) => change.images.find((c) => c.id === i.id) ?? i),
  };
}
describe("measured human-feedback training round", () => {
  it("uses exactly the parent training set plus approved photos and the same validation cohort", () => {
    const f = fixture(),
      before = structuredClone(f),
      plan = prepareLearningRound(f, f.model);
    expect(plan.train.map((i) => i.id)).toEqual(["ta", "tb"]);
    expect(plan.added.map((i) => i.id)).toEqual(["pool"]);
    expect(plan.validation.map((i) => i.id)).toEqual(["va", "vb"]);
    expect(
      [...plan.train, ...plan.added, ...plan.validation].some(
        (i) => i.split === "test",
      ),
    ).toBe(false);
    expect(f).toEqual(before);
  });
  it("rejects later edits, unsupported capped sources and altered validation roles", () => {
    const f = fixture();
    f.dataset.version++;
    expect(() => prepareLearningRound(f, f.model)).toThrow();
    f.dataset.version--;
    f.model.settings.perLabelCap = 1;
    expect(() => prepareLearningRound(f, f.model)).toThrow(/cap/i);
    f.model.settings.perLabelCap = null;
    f.images.find((i) => i.id === "va")!.split = "train";
    expect(() => prepareLearningRound(f, f.model)).toThrow();
  });
  it("really optimises both heads, returns actual validation results and is deterministic", async () => {
    const f = fixture(),
      plan = prepareLearningRound(f, f.model),
      before = structuredClone(f.model);
    const vectors = new Map(
      [...plan.train, ...plan.added, ...plan.validation].map((i) => [
        i.id,
        Float32Array.from({ length: ENCODER.dimensions }, (_, j) =>
          j === 0 ? (i.labelId === "a" ? 1 : -1) : 0,
        ),
      ]),
    );
    const options = { yieldBetweenEpochs: async () => {} };
    const a = await runLearningRound(plan, vectors, f.model, options);
    const b = await runLearningRound(plan, vectors, f.model, options);
    expect(a.expanded.evidence.meanAbsChange).toBeGreaterThan(0);
    expect(a.control.evidence.meanAbsChange).toBeGreaterThan(0);
    expect(a.expanded.model.weights).toEqual(b.expanded.model.weights);
    expect(a.control.initial.weights).toEqual(a.expanded.initial.weights);
    expect(a.expanded.after!.predicted.length).toBe(2);
    expect(a.savedSource.predicted.length).toBe(2);
    expect(f.model).toEqual(before);
  });
  it("cancellation and non-finite features publish no round", async () => {
    const f = fixture(),
      plan = prepareLearningRound(f, f.model),
      abort = new AbortController();
    const vectors = new Map(
      [...plan.train, ...plan.added, ...plan.validation].map((i) => [
        i.id,
        new Float32Array(ENCODER.dimensions),
      ]),
    );
    abort.abort();
    await expect(
      runLearningRound(plan, vectors, f.model, { signal: abort.signal }),
    ).rejects.toThrow();
    vectors.get("pool")![0] = NaN;
    await expect(runLearningRound(plan, vectors, f.model)).rejects.toThrow();
  });
  it("reports no accuracy gain on a no-signal validation set", async () => {
    const f = fixture(),
      plan = prepareLearningRound(f, f.model);
    const vectors = new Map(
      [...plan.train, ...plan.added, ...plan.validation].map((i) => [
        i.id,
        new Float32Array(ENCODER.dimensions),
      ]),
    );
    const result = await runLearningRound(plan, vectors, f.model, {
      yieldBetweenEpochs: async () => {},
    });
    expect(result.control.after!.accuracy).toBe(0.5);
    expect(result.expanded.after!.accuracy).toBe(0.5);
  });
  it("discards the entire comparison if cancelled after the control completes", async () => {
    const f = fixture(),
      plan = prepareLearningRound(f, f.model),
      abort = new AbortController();
    const vectors = new Map(
      [...plan.train, ...plan.added, ...plan.validation].map((i) => [
        i.id,
        new Float32Array(ENCODER.dimensions),
      ]),
    );
    await expect(
      runLearningRound(plan, vectors, f.model, {
        signal: abort.signal,
        yieldBetweenEpochs: async () => {},
        onEpoch: (arm) => {
          if (arm === "expanded") abort.abort();
        },
      }),
    ).rejects.toThrow(/cancel/i);
  });
});
