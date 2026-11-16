import { seededRandom } from "../src/datasets/example";
import { describe, expect, it } from "vitest";
import { finalFixture } from "./fixtures/final-check";
import {
  prepareReviewPool,
  scoreReviewPool,
  orderReview,
  setReviewDecision,
} from "../src/learning/active-review";
import { ENCODER } from "../src/learning/encoder";
function fixture() {
  const f = finalFixture();
  f.images.push({
    ...f.images[0],
    id: "u1",
    sha256: "u1",
    dhash: "0123456789abcdef",
    labelId: null,
    split: null,
    order: 6,
  });
  f.images.push({
    ...f.images[6],
    id: "u2",
    sha256: "u2",
    dhash: "fedcba9876543210",
    order: 7,
  });
  return f;
}
describe("active-learning review queue", () => {
  it("uses only unlabelled unsplit photos, excluding protected exact/near copies and duplicate pool groups", () => {
    const f = fixture();
    f.images.push({
      ...f.images[6],
      id: "copy",
      sha256: "other",
      dhash: f.images[4].dhash,
      order: 8,
    });
    f.images.push({
      ...f.images[6],
      id: "poolcopy",
      sha256: "another",
      order: 9,
    });
    const plan = prepareReviewPool(f, f.model);
    expect(plan.images.map((i) => i.id).sort()).toEqual(["u1", "u2"]);
    expect(plan.excluded).toBe(2);
    expect(
      plan.images.every((i) => i.labelId === null && i.split === null),
    ).toBe(true);
  });
  it("refuses stale and incomplete sources", () => {
    const f = fixture();
    f.dataset.version++;
    expect(() => prepareReviewPool(f, f.model)).toThrow();
    f.dataset.version--;
    f.model.stoppedEarly = true;
    expect(() => prepareReviewPool(f, f.model)).toThrow(/complete/i);
  });
  it("bounds a larger eligible pool to 50 and reports the deferred remainder", () => {
    const f = fixture(),
      random = seededRandom(2026);
    const hex = () =>
      Math.floor(random() * 2 ** 32)
        .toString(16)
        .padStart(8, "0");
    for (let i = 0; i < 60; i++)
      f.images.push({
        ...f.images[6],
        id: `extra-${i}`,
        sha256: `extra-${i}`,
        dhash: hex() + hex(),
        order: 8 + i,
      });
    const plan = prepareReviewPool(f, f.model);
    expect(plan.images).toHaveLength(50);
    expect(plan.deferred).toBe(12);
    expect(plan.total).toBe(62);
  });
  it("computes real probability margins/entropy and deterministic random ordering without learning", () => {
    const f = fixture(),
      plan = prepareReviewPool(f, f.model);
    f.model.weights[0] = 2;
    const scoringBefore = structuredClone(f.model);
    const vector = (n: number) =>
      Float32Array.from({ length: ENCODER.dimensions }, (_, i) =>
        i === 0 ? n : 0,
      );
    const scores = scoreReviewPool(
      plan.images,
      new Map([
        ["u1", vector(-0.5)],
        ["u2", vector(1)],
      ]),
      f.model,
    );
    expect(orderReview(scores, "uncertainty", 42)[0].imageId).toBe("u1");
    expect(scores[0].margin).toBeCloseTo(0);
    expect(scores[0].entropy).toBeCloseTo(Math.log(2));
    expect(orderReview(scores, "random", 42)).toEqual(
      orderReview(scores, "random", 42),
    );
    expect(scores.every((s) => s.confidence >= 0 && s.confidence <= 1)).toBe(
      true,
    );
    expect(f.model).toEqual(scoringBefore);
  });
  it("accepts, corrects or skips locally; never mutates dataset labels or accepts unknown classes", () => {
    const f = fixture(),
      original = structuredClone(f.images),
      plan = prepareReviewPool(f, f.model);
    const vector = new Float32Array(ENCODER.dimensions);
    const scores = scoreReviewPool(
      plan.images,
      new Map(plan.images.map((i) => [i.id, vector])),
      f.model,
    );
    let decisions = setReviewDecision({}, scores, f.model.labelIds, "u1", {
      kind: "approve",
      labelId: "b",
    });
    expect(decisions.u1).toEqual({ kind: "approve", labelId: "b" });
    decisions = setReviewDecision(decisions, scores, f.model.labelIds, "u1", {
      kind: "skip",
    });
    expect(decisions.u1.kind).toBe("skip");
    expect(() =>
      setReviewDecision(decisions, scores, f.model.labelIds, "u2", {
        kind: "approve",
        labelId: "unknown",
      }),
    ).toThrow();
    expect(f.images).toEqual(original);
  });
  it("rejects non-finite features instead of fabricating uncertainty", () => {
    const f = fixture(),
      plan = prepareReviewPool(f, f.model),
      vector = new Float32Array(ENCODER.dimensions);
    vector[0] = NaN;
    expect(() =>
      scoreReviewPool(
        plan.images,
        new Map(plan.images.map((i) => [i.id, vector])),
        f.model,
      ),
    ).toThrow();
  });
});
