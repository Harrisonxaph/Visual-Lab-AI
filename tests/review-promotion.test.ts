import { describe, expect, it } from "vitest";
import { finalFixture } from "./fixtures/final-check";
import { preparePromotion } from "../src/learning/review-promotion";
function fixture() {
  const f = finalFixture();
  f.images.push({
    ...f.images[0],
    id: "pool",
    sha256: "pool",
    dhash: "0123456789abcdef",
    labelId: null,
    split: null,
    order: 8,
  });
  return f;
}
const score = {
  imageId: "pool",
  proposedLabelId: "a",
  confidence: 0.6,
  margin: 0.2,
  entropy: 0.67,
};
describe("training-only review promotion", () => {
  it("promotes only explicit approvals, freezes all other records and records provenance", () => {
    const f = fixture(),
      before = structuredClone(f);
    const result = preparePromotion(
      f,
      f.model,
      [score],
      { pool: { kind: "approve", labelId: "b" } },
      "uncertainty",
      "2026-11-16T00:00:00Z",
    );
    expect(result.images).toHaveLength(1);
    expect(result.images[0]).toMatchObject({
      id: "pool",
      labelId: "b",
      split: "train",
      review: {
        sourceModelId: "m",
        sourceDatasetVersion: 1,
        proposedLabelId: "a",
        approvedLabelId: "b",
        order: "uncertainty",
      },
    });
    expect(result.dataset.version).toBe(2);
    expect(f).toEqual(before);
  });
  it("refuses skipped-only, unknown decisions, stale snapshots and protected copies", () => {
    const f = fixture();
    expect(() =>
      preparePromotion(
        f,
        f.model,
        [score],
        { pool: { kind: "skip" } },
        "random",
        "2026-11-16T00:00:00Z",
      ),
    ).toThrow();
    expect(() =>
      preparePromotion(
        f,
        f.model,
        [score],
        { xa: { kind: "approve", labelId: "a" } },
        "random",
        "2026-11-16T00:00:00Z",
      ),
    ).toThrow();
    f.images.at(-1)!.dhash = f.images[4].dhash;
    expect(() =>
      preparePromotion(
        f,
        f.model,
        [score],
        { pool: { kind: "approve", labelId: "a" } },
        "random",
        "2026-11-16T00:00:00Z",
      ),
    ).toThrow();
    f.dataset.version++;
    expect(() =>
      preparePromotion(
        f,
        f.model,
        [score],
        { pool: { kind: "approve", labelId: "a" } },
        "random",
        "2026-11-16T00:00:00Z",
      ),
    ).toThrow();
  });
  it("rejects a pool bridge to a protected group, even if not directly similar", () => {
    const f = fixture();
    f.images.at(-1)!.dhash = "00000000000000ff";
    f.images.push({
      ...f.images.at(-1)!,
      id: "bridge",
      sha256: "bridge",
      dhash: "000000000000000f",
      order: 9,
    });
    expect(() =>
      preparePromotion(
        f,
        f.model,
        [score],
        { pool: { kind: "approve", labelId: "a" } },
        "random",
        "2026-11-16T00:00:00Z",
      ),
    ).toThrow();
  });
});
