import type { FeedbackEvidence } from "./feedback-evidence";
/** One photo's cached embedding: 1,024 numbers from the frozen encoder. */
export interface EmbeddingRecord {
  imageId: string;
  datasetId: string;
  /** Which encoder, runtime and preprocessing produced `vector` (see ENCODER_KEY). */
  encoderKey: string;
  vector: Float32Array;
}

/** Results after one pass over the training examples. */
export interface EpochRecord {
  epoch: number;
  trainLoss: number;
  trainAccuracy: number;
  /** Mean training CE plus L2 weight penalty, present only for regularised runs. */
  trainObjective?: number;
  /** Null when the selection had no validation photos. */
  validationLoss: number | null;
  validationAccuracy: number | null;
}

export interface TrainingSettings {
  learningRate: number;
  epochs: number;
  batchSize: number;
  /** Most training photos used per label; null uses all of them. */
  perLabelCap: number | null;
  /** Seed for the starting weights and the shuffle order. */
  seed: number;
  /** Missing means zero: preserve older unregularised runs without rewriting them. */
  l2?: number;
}

/** A trained classifier saved on this device, with what it needs to be checked before reuse. */
export interface ModelRecord {
  id: string;
  datasetId: string;
  name: string;
  createdAt: string;
  encoderKey: string;
  /** Dataset version when training started. */
  datasetVersion: number;
  /** Label ids in class order: row k of the weights belongs to labelIds[k]. */
  labelIds: string[];
  /** Label names when trained, for display if a label is later renamed or deleted. */
  labelNames: string[];
  dims: number;
  weights: Float64Array;
  bias: Float64Array;
  settings: TrainingSettings;
  history: EpochRecord[];
  /** True if training was cancelled before the last epoch. */
  stoppedEarly: boolean;
  trainCount: number;
  validationCount: number;
  /**
   * The photos this model learned from, so a later check can leave them (and copies of them)
   * out after the dataset is re-split or changed. Missing on a record means independence of a
   * later check cannot be established.
   */
  trainImages?: TrainImageRef[];
  /** Versioned input selection for restoring settings and fair recorded comparisons. */
  experiment?: RunManifest;
  /** Saved only with explicit classifier Save; historical validation comparison, never test results. */
  feedback?: FeedbackEvidence;
}

export interface TrainImageRef {
  id: string;
  /** SHA-256 of the original file: finds the same photo imported again under a new id. */
  sha256: string;
  /** Difference hash: finds likely near-copies, as the Dataset lab does. */
  dhash: string;
}

export interface RunExampleRef {
  id: string;
  sha256: string;
  labelId: string;
}

export interface RunManifest {
  version: 1;
  algorithm: "softmax-sgd-f64/v1" | "softmax-sgd-f64-l2/v1";
  splitSeed: number;
  labelIds: string[];
  /** Actual training order, including the chosen per-label subset. */
  train: RunExampleRef[];
  validation: RunExampleRef[];
}
