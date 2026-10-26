import { describe, expect, it } from "vitest";
import {
  assignSplits,
  directlyRelated,
  pairKey,
  relatedGroups,
} from "../src/datasets/splits";
import { datasetStats } from "../src/datasets/stats";
import { validateDatasetName, validateLabelName } from "../src/datasets/limits";
import { SPLITS, type Split } from "../src/datasets/types";

interface Img {
  id: string;
  dhash: string;
  labelId: string | null;
  order: number;
  sha256: string;
  split: Split | null;
  bytes: number;
}

/** Deterministic pseudo-random generator for repeatable randomised tests. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hex = (n: number) => n.toString(16).padStart(16, "0");
/** Distinct, far-apart hashes; `near` flips one bit of another image's hash. */
const farHash = (i: number) => {
  const r = rng(i * 7919 + 1);
  let s = "";
  for (let k = 0; k < 16; k++) s += Math.floor(r() * 16).toString(16);
  return s;
};
const flipBit = (h: string, bit: number) =>
  hex(Number(BigInt("0x" + h) ^ (1n << BigInt(bit))));

function img(
  i: number,
  labelId: string | null,
  dhash = farHash(i),
  split: Split | null = null,
): Img {
  return {
    id: `img-${i}`,
    dhash,
    labelId,
    order: i,
    sha256: `sha-${String(i).padStart(4, "0")}`,
    split,
    bytes: 1000,
  };
}

function apply(images: Img[], seed: number, notRelated = new Set<string>()) {
  const groups = relatedGroups(images, notRelated);
  const result = assignSplits(images, groups, seed);
  for (const im of images) im.split = result.splits.get(im.id) ?? null;
  return { groups, result };
}

function groupsCrossSplits(images: Img[], groups: string[][]) {
  const byId = new Map(images.map((i) => [i.id, i]));
  return groups.some(
    (g) =>
      new Set(
        g
          .map((id) => byId.get(id)!)
          .filter((i) => i.labelId)
          .map((i) => i.split),
      ).size > 1,
  );
}

describe("related groups", () => {
  it("links close hashes transitively and respects 'not related'", () => {
    const a = img(1, "L"),
      b = img(2, "L", flipBit(a.dhash, 0)),
      c = img(3, "L", flipBit(flipBit(a.dhash, 0), 1)),
      d = img(4, "L");
    const groups = relatedGroups([a, b, c, d]);
    expect(groups.map((g) => g.length).sort()).toEqual([1, 3]);
    const apart = new Set([pairKey(a.id, b.id), pairKey(b.id, c.id)]);
    expect(
      relatedGroups([a, b, c, d], apart)
        .map((g) => g.length)
        .sort(),
    ).toEqual([1, 1, 2]);
    expect(directlyRelated(b.id, [a, b, c, d]).sort()).toEqual([a.id, c.id]);
  });
});

describe("split assignment", () => {
  it("is deterministic for the same images and seed", () => {
    const make = () =>
      Array.from({ length: 40 }, (_, i) => img(i, i % 2 ? "A" : "B"));
    const x = make(),
      y = make();
    apply(x, 42);
    apply(y, 42);
    expect(x.map((i) => i.split)).toEqual(y.map((i) => i.split));
    const z = make();
    apply(z, 43);
    expect(z.map((i) => i.split)).not.toEqual(x.map((i) => i.split));
  });

  it("approximates 70/15/15 per label and gives labels with ≥5 images validation and test", () => {
    for (const n of [5, 6, 10, 20, 50]) {
      const images = Array.from({ length: n }, (_, i) => img(i, "A"));
      apply(images, 1);
      const c = Object.fromEntries(
        SPLITS.map((s) => [s, images.filter((i) => i.split === s).length]),
      ) as Record<Split, number>;
      expect(c.validation).toBeGreaterThanOrEqual(1);
      expect(c.test).toBeGreaterThanOrEqual(1);
      expect(Math.abs(c.train - 0.7 * n)).toBeLessThanOrEqual(1);
    }
  });

  it("never moves existing images when more are imported", () => {
    const images = Array.from({ length: 20 }, (_, i) =>
      img(i, i % 3 ? "A" : "B"),
    );
    apply(images, 7);
    const before = new Map(images.map((i) => [i.id, i.split]));
    images.push(...Array.from({ length: 15 }, (_, i) => img(100 + i, "A")));
    const { result } = apply(images, 7);
    expect(result.moves).toEqual([]);
    for (const [id, s] of before)
      expect(images.find((i) => i.id === id)!.split).toBe(s);
  });

  it("leaves unlabelled images without a split and keeps relabelled images in place", () => {
    const images = Array.from({ length: 10 }, (_, i) => img(i, "A"));
    images.push(img(50, null));
    apply(images, 3);
    expect(images.at(-1)!.split).toBeNull();
    const moved = images[0].split;
    images[0].labelId = "B";
    apply(images, 3);
    expect(images[0].split).toBe(moved);
    images[1].labelId = null;
    apply(images, 3);
    expect(images[1].split).toBeNull();
  });

  it("an image joining an existing group takes the group's split", () => {
    const a = img(1, "A");
    const images = [
      a,
      ...Array.from({ length: 8 }, (_, i) => img(10 + i, "A")),
    ];
    apply(images, 5);
    const twin = img(99, "A", flipBit(a.dhash, 3));
    images.push(twin);
    apply(images, 5);
    expect(twin.split).toBe(a.split);
  });

  it("merging groups moves the later group to the earliest image's split and reports it", () => {
    // left and right start in different splits; bridge (imported later) is close to both.
    const left = img(1, "A", "0000000000000000"),
      right = img(2, "A", "00000000000000ff"); // 8 bits apart: not related
    const images = [left, right];
    left.split = "train";
    right.split = "test";
    const bridge = img(3, "A", "000000000000000f"); // 4 bits from each
    images.push(bridge);
    const { groups, result } = apply(images, 9);
    expect(groups.find((g) => g.length === 3)).toBeTruthy();
    expect(new Set(images.map((i) => i.split))).toEqual(new Set(["train"]));
    expect(result.moves).toEqual([
      { imageId: right.id, from: "test", to: "train" },
    ]);
  });

  it("randomised: identified related groups never span splits, through imports, links, relabels and deletions", () => {
    const r = rng(2026);
    for (let trial = 0; trial < 300; trial++) {
      let images: Img[] = [];
      const notRelated = new Set<string>();
      let next = 0;
      const seed = Math.floor(r() * 1e9);
      for (let step = 0; step < 12; step++) {
        const action = r();
        if (action < 0.55 || images.length < 3) {
          const k = 1 + Math.floor(r() * 6);
          for (let j = 0; j < k; j++) {
            const base =
              images.length && r() < 0.35
                ? images[Math.floor(r() * images.length)].dhash
                : null;
            const dh = base
              ? flipBit(base, Math.floor(r() * 64))
              : farHash(next + trial * 1000);
            images.push(
              img(
                next++,
                r() < 0.1 ? null : ["A", "B", "C"][Math.floor(r() * 3)],
                dh,
              ),
            );
          }
        } else if (action < 0.7) {
          images.splice(Math.floor(r() * images.length), 1);
        } else if (action < 0.85) {
          const im = images[Math.floor(r() * images.length)];
          im.labelId = r() < 0.2 ? null : ["A", "B", "C"][Math.floor(r() * 3)];
          if (!im.labelId) im.split = null;
        } else {
          const im = images[Math.floor(r() * images.length)];
          for (const o of directlyRelated(im.id, images, notRelated))
            notRelated.add(pairKey(im.id, o));
        }
        const { groups } = apply(images, seed, notRelated);
        expect(groupsCrossSplits(images, groups)).toBe(false);
        for (const im of images)
          expect(im.split === null).toBe(im.labelId === null);
      }
      images = [];
    }
  });
});

describe("statistics", () => {
  it("counts per label and split, unlabelled, related groups and warnings", () => {
    const images = [
      ...Array.from({ length: 20 }, (_, i) => img(i, "A")),
      ...Array.from({ length: 3 }, (_, i) => img(100 + i, "B")),
      img(200, null),
    ];
    images[1].dhash = flipBit(images[0].dhash, 2);
    const { groups } = apply(images, 11);
    const s = datasetStats(
      images,
      [
        { id: "A", name: "mug" },
        { id: "B", name: "plant" },
        { id: "C", name: "empty" },
      ],
      groups,
      4,
    );
    expect(s.total).toBe(24);
    expect(s.unlabelled).toBe(1);
    expect(s.labels.find((l) => l.labelId === "A")!.total).toBe(20);
    expect(SPLITS.reduce((n, sp) => n + s.labels[0].bySplit[sp], 0)).toBe(20);
    expect(s.relatedGroups).toBe(1);
    expect(s.relatedImages).toBe(2);
    expect(s.duplicatesSkipped).toBe(4);
    expect(s.storedBytes).toBe(24000);
    expect(s.warnings.join(" ")).toContain("only 3 images");
    expect(s.warnings.join(" ")).toContain("imbalanced");
  });
});

describe("name validation", () => {
  it("rejects empty, too long, duplicate (case-insensitive) and too many labels", () => {
    expect(validateLabelName("  ", [])).toMatch(/Enter/);
    expect(validateLabelName("x".repeat(41), [])).toMatch(/at most 40/);
    expect(validateLabelName(" Cat ", ["cat"])).toMatch(/already exists/);
    expect(
      validateLabelName(
        "new",
        Array.from({ length: 10 }, (_, i) => `l${i}`),
      ),
    ).toMatch(/at most 10/);
    expect(validateLabelName("mug", ["plant"])).toBeNull();
    expect(validateDatasetName("")).toMatch(/Enter/);
    expect(validateDatasetName("x".repeat(61))).toMatch(/at most 60/);
    expect(validateDatasetName("Kitchen")).toBeNull();
  });
});
