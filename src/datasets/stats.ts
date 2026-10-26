import { DEFAULT_RATIOS } from "./limits";
import {
  SPLITS,
  type ImageRecord,
  type LabelRecord,
  type Split,
} from "./types";

export interface LabelStats {
  labelId: string;
  name: string;
  total: number;
  bySplit: Record<Split, number>;
}

export interface DatasetStats {
  total: number;
  unlabelled: number;
  bySplit: Record<Split, number>;
  labels: LabelStats[];
  /** Groups with two or more images the app identified as related. */
  relatedGroups: number;
  relatedImages: number;
  duplicatesSkipped: number;
  storedBytes: number;
  warnings: string[];
}

export function datasetStats(
  images: readonly Pick<ImageRecord, "labelId" | "split" | "bytes">[],
  labels: readonly Pick<LabelRecord, "id" | "name">[],
  groups: readonly (readonly string[])[],
  duplicatesSkipped: number,
): DatasetStats {
  const empty = (): Record<Split, number> => ({
    train: 0,
    validation: 0,
    test: 0,
  });
  const bySplit = empty();
  const perLabel = new Map(
    labels.map((l) => [
      l.id,
      { labelId: l.id, name: l.name, total: 0, bySplit: empty() },
    ]),
  );
  let unlabelled = 0,
    storedBytes = 0;
  for (const img of images) {
    storedBytes += img.bytes;
    const l = img.labelId ? perLabel.get(img.labelId) : undefined;
    if (!l) {
      unlabelled++;
      continue;
    }
    l.total++;
    if (img.split) {
      l.bySplit[img.split]++;
      bySplit[img.split]++;
    }
  }
  const labelStats = [...perLabel.values()];
  const related = groups.filter((g) => g.length > 1);
  const warnings: string[] = [];
  for (const l of labelStats) {
    if (l.total > 0 && l.total < 5)
      warnings.push(
        `“${l.name}” has only ${l.total} image${l.total === 1 ? "" : "s"}; aim for at least 5 (more is better).`,
      );
    if (l.total >= 5)
      for (const s of SPLITS)
        if (s !== "train" && l.bySplit[s] === 0)
          warnings.push(
            `“${l.name}” has no ${s} images (often because related photos are grouped together).`,
          );
  }
  const used = labelStats.filter((l) => l.total > 0).map((l) => l.total);
  if (used.length >= 2 && Math.max(...used) > 3 * Math.min(...used))
    warnings.push(
      "Labels are imbalanced: the largest has more than 3× the images of the smallest. A model may favour the larger label.",
    );
  return {
    total: images.length,
    unlabelled,
    bySplit,
    labels: labelStats,
    relatedGroups: related.length,
    relatedImages: related.reduce((n, g) => n + g.length, 0),
    duplicatesSkipped,
    storedBytes,
    warnings,
  };
}

/** Target share of each split, for display. */
export const TARGET_SHARES = DEFAULT_RATIOS;
