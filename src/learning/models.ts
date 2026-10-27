import { hammingDistance } from "../datasets/hash";
import { NEAR_DUPLICATE_MAX_DISTANCE } from "../datasets/limits";
import type {
  DatasetRecord,
  ImageRecord,
  LabelRecord,
} from "../datasets/types";
import type { SoftmaxModel } from "./softmax";
import type { ModelRecord } from "./types";

export const MAX_MODELS_PER_DATASET = 5;

export type Compatibility =
  | { ok: true; warning: string | null }
  | { ok: false; reason: string };

/**
 * Decides whether a saved model can be used with the current encoder and dataset. A model is
 * refused if its numbers are damaged, it was made by a different encoder or preprocessing, it
 * belongs to another dataset, or any of its labels no longer exists. If the dataset changed
 * since training, it loads with a warning, because its saved results describe older data.
 */
export function checkCompatibility(
  model: ModelRecord,
  encoderKey: string,
  dataset: DatasetRecord,
  labels: readonly LabelRecord[],
): Compatibility {
  const k = model.labelIds?.length ?? 0;
  if (
    k < 2 ||
    !(model.weights instanceof Float64Array) ||
    !(model.bias instanceof Float64Array) ||
    model.weights.length !== k * model.dims ||
    model.bias.length !== k ||
    !model.weights.every(Number.isFinite) ||
    !model.bias.every(Number.isFinite)
  )
    return {
      ok: false,
      reason: "This saved model is damaged and cannot be used.",
    };
  if (model.encoderKey !== encoderKey)
    return {
      ok: false,
      reason:
        "This model was trained on embeddings from a different encoder or preprocessing, so its weights do not fit the current embeddings.",
    };
  if (model.datasetId !== dataset.id)
    return { ok: false, reason: "This model belongs to a different dataset." };
  const missing = model.labelIds
    .map((id, i) =>
      labels.some((l) => l.id === id) ? null : model.labelNames[i],
    )
    .filter((n): n is string => n !== null);
  if (missing.length)
    return {
      ok: false,
      reason: `This model needs labels that no longer exist: ${missing.join(", ")}.`,
    };
  return {
    ok: true,
    warning:
      model.datasetVersion !== dataset.version
        ? "The dataset has changed since this model was trained. Its saved results describe the earlier data; the check below uses current validation photos the model did not learn from."
        : null,
  };
}

export function toSoftmax(model: ModelRecord): SoftmaxModel {
  return {
    classes: model.labelIds.length,
    dims: model.dims,
    weights: model.weights.slice(),
    bias: model.bias.slice(),
  };
}

export interface IndependentCheck<T> {
  /** Whether the model recorded which photos it learned from. */
  known: boolean;
  /** Validation photos that are independent of the model's training photos (all of them when unknown). */
  kept: T[];
  /** Positions in the input of the photos that were kept. */
  keptIndices: number[];
  /** How many validation photos were left out because the model learned from them or a copy. */
  excluded: number;
}

/**
 * A validation check is only independent if the model never learned from the photos it is
 * checked on. After a re-split (or edits), photos a saved model trained on can be in the
 * validation split. This leaves out every current validation photo that is one of the model's
 * training photos, the same file imported again, or a likely near-copy (same rule as the
 * Dataset lab, ignoring "not related" marks, so it errs towards leaving photos out).
 */
export function independentValidation<
  T extends Pick<ImageRecord, "id" | "sha256" | "dhash">,
>(
  model: Pick<ModelRecord, "trainImages">,
  validation: readonly T[],
): IndependentCheck<T> {
  const trained = model.trainImages;
  if (!trained)
    return {
      known: false,
      kept: [...validation],
      keptIndices: validation.map((_, i) => i),
      excluded: 0,
    };
  const ids = new Set(trained.map((t) => t.id));
  const hashes = new Set(trained.map((t) => t.sha256));
  const kept: T[] = [];
  const keptIndices: number[] = [];
  validation.forEach((img, i) => {
    const learned =
      ids.has(img.id) ||
      hashes.has(img.sha256) ||
      trained.some(
        (t) =>
          hammingDistance(t.dhash, img.dhash) <= NEAR_DUPLICATE_MAX_DISTANCE,
      );
    if (!learned) {
      kept.push(img);
      keptIndices.push(i);
    }
  });
  return {
    known: true,
    kept,
    keptIndices,
    excluded: validation.length - kept.length,
  };
}
