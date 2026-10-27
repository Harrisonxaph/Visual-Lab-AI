/** A split says what an image is used for: learning, checking progress, or the final exam. */
export type Split = "train" | "validation" | "test";
export const SPLITS: readonly Split[] = ["train", "validation", "test"];

export interface DatasetRecord {
  id: string;
  name: string;
  createdAt: string;
  /** Seed for repeatable split decisions; changes only on explicit Re-split. */
  seed: number;
  /** Increments on every change so later experiments can record which data they used. */
  version: number;
  isExample: boolean;
  /** For the generated example: true only once every expected image was saved. */
  exampleComplete?: boolean;
  /** Next import order number; orders define "earliest added" deterministically. */
  nextOrder: number;
  /** Exact duplicates refused on import (cumulative). */
  duplicatesSkipped: number;
  /** Image-id pairs ("a|b", sorted) the user marked as not related. */
  notRelated: string[];
}

export interface LabelRecord {
  id: string;
  datasetId: string;
  name: string;
  createdAt: string;
}

export interface ImageRecord {
  id: string;
  datasetId: string;
  labelId: string | null;
  /** SHA-256 of the original file bytes: identical files share this value. */
  sha256: string;
  /** 64-bit difference hash (16 hex characters): similar-looking images have close values. */
  dhash: string;
  width: number;
  height: number;
  /** Stored (downscaled JPEG) size in bytes. */
  bytes: number;
  order: number;
  addedAt: string;
  source: "upload" | "example";
  /** Unlabelled images have no split until they receive a label. */
  split: Split | null;
}

export interface BlobRecord {
  id: string;
  image: Blob;
  thumb: Blob;
}

export interface SplitMove {
  imageId: string;
  from: Split;
  to: Split;
}
