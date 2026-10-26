import { hammingDistance, stableHash } from "./hash";
import { DEFAULT_RATIOS, NEAR_DUPLICATE_MAX_DISTANCE } from "./limits";
import { SPLITS, type ImageRecord, type Split, type SplitMove } from "./types";

export type SplitRatios = Record<Split, number>;

/** Sorted key for an unordered image pair, used for "not related" decisions. */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

type GroupInput = Pick<ImageRecord, "id" | "dhash">;

/**
 * Groups images the app identifies as related: any two images with close difference hashes
 * are linked, and links chain together (A~B and B~C put A, B and C in one group). Pairs the
 * user marked "not related" are not linked. Returns groups as arrays of image ids; every
 * image appears in exactly one group (most groups have one image).
 */
export function relatedGroups(
  images: readonly GroupInput[],
  notRelated: ReadonlySet<string> = new Set(),
  maxDistance = NEAR_DUPLICATE_MAX_DISTANCE,
): string[][] {
  const parent = images.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) i = parent[i] = parent[parent[i]];
    return i;
  };
  for (let i = 0; i < images.length; i++)
    for (let j = i + 1; j < images.length; j++)
      if (
        hammingDistance(images[i].dhash, images[j].dhash) <= maxDistance &&
        !notRelated.has(pairKey(images[i].id, images[j].id))
      ) {
        const a = find(i),
          b = find(j);
        if (a !== b) parent[Math.max(a, b)] = Math.min(a, b);
      }
  const groups = new Map<number, string[]>();
  images.forEach((img, i) => {
    const root = find(i);
    groups.set(root, [...(groups.get(root) ?? []), img.id]);
  });
  return [...groups.values()];
}

/** Ids of images directly linked to `id` (close hashes, not marked "not related"). */
export function directlyRelated(
  id: string,
  images: readonly GroupInput[],
  notRelated: ReadonlySet<string> = new Set(),
  maxDistance = NEAR_DUPLICATE_MAX_DISTANCE,
): string[] {
  const self = images.find((i) => i.id === id);
  if (!self) return [];
  return images
    .filter(
      (o) =>
        o.id !== id &&
        hammingDistance(o.dhash, self.dhash) <= maxDistance &&
        !notRelated.has(pairKey(o.id, id)),
    )
    .map((o) => o.id);
}

type SplitInput = Pick<
  ImageRecord,
  "id" | "labelId" | "order" | "sha256" | "split"
>;

export interface SplitResult {
  /** New split for every image id (null for unlabelled images). */
  splits: Map<string, Split | null>;
  /** Labelled images that changed split because related groups merged. */
  moves: SplitMove[];
}

/**
 * Decides training / validation / test for every labelled image.
 *
 * Rules, in order:
 * 1. Unlabelled images have no split.
 * 2. Every related group lives in one split. If a group's labelled images were already in
 *    different splits (two groups just merged), the whole group joins the split of its
 *    earliest-added image, and each moved image is reported.
 * 3. A labelled image in a group that already has a split joins it. Existing assignments never
 *    change otherwise, so importing more photos does not reshuffle earlier ones.
 * 4. Groups with no split yet are placed one at a time, in an order shuffled by the seed. Each
 *    goes to the split furthest below its target share for the group's label (the label of its
 *    earliest image). Ties are broken by a seeded hash, so the same data and seed always give
 *    the same result.
 */
export function assignSplits(
  images: readonly SplitInput[],
  groups: readonly (readonly string[])[],
  seed: number,
  ratios: SplitRatios = DEFAULT_RATIOS,
): SplitResult {
  const byId = new Map(images.map((i) => [i.id, i]));
  const splits = new Map<string, Split | null>();
  const moves: SplitMove[] = [];
  const counts = new Map<string, Record<Split, number>>();
  const bump = (label: string, split: Split, n: number) => {
    const c = counts.get(label) ?? { train: 0, validation: 0, test: 0 };
    c[split] += n;
    counts.set(label, c);
  };
  const pending: { key: string; label: string; members: SplitInput[] }[] = [];

  for (const group of groups) {
    const members = group
      .map((id) => byId.get(id))
      .filter((m): m is SplitInput => !!m)
      .sort((a, b) => a.order - b.order);
    for (const m of members) if (!m.labelId) splits.set(m.id, null);
    const labelled = members.filter((m) => m.labelId);
    if (!labelled.length) continue;
    const anchor = labelled.find((m) => m.split);
    if (anchor) {
      for (const m of labelled) {
        if (m.split && m.split !== anchor.split)
          moves.push({ imageId: m.id, from: m.split, to: anchor.split! });
        splits.set(m.id, anchor.split);
        bump(m.labelId!, anchor.split!, 1);
      }
    } else {
      const key = [...labelled.map((m) => m.sha256)].sort()[0];
      pending.push({ key, label: labelled[0].labelId!, members: labelled });
    }
  }

  pending.sort(
    (a, b) =>
      stableHash(`${seed}:${a.key}`) - stableHash(`${seed}:${b.key}`) ||
      (a.key < b.key ? -1 : 1),
  );
  for (const g of pending) {
    const c = counts.get(g.label) ?? { train: 0, validation: 0, test: 0 };
    const total = c.train + c.validation + c.test + g.members.length;
    let best: Split = "train",
      bestScore = -Infinity;
    for (const s of SPLITS) {
      const deficit = ratios[s] * total - c[s];
      const tie = stableHash(`${seed}:${g.key}:${s}`) / 2 ** 32 / 1e6;
      if (deficit + tie > bestScore) {
        bestScore = deficit + tie;
        best = s;
      }
    }
    for (const m of g.members) splits.set(m.id, best);
    bump(g.label, best, g.members.length);
  }
  return { splits, moves };
}
