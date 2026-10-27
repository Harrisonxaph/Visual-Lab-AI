import type { DatasetRecord, LabelRecord } from "../datasets/types";
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
        ? "The dataset has changed since this model was trained. Its saved results describe the earlier data; the check below uses the current validation photos."
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
