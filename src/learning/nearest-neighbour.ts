import { LIMITS } from "../datasets/limits";
import type { DatasetState } from "../datasets/service";
import { CancelledError } from "./embeddings";
import { ENCODER, ENCODER_KEY } from "./encoder";
import { selectExamples } from "./examples";
import { replayProblem } from "./experiments";
import { checkCompatibility, independentValidation } from "./models";
import type { Vector } from "./softmax";
import { validateSettings } from "./trainer";
import type { ModelRecord } from "./types";

export class BaselineError extends Error {}
export const NEIGHBOUR_METHOD = "1nn/squared-l2/first-in-recorded-order/v1";
export interface NeighbourResult {
  predicted: number[];
  squaredDistances: number[];
}

/** Frozen features only. No optimisation, probabilities, confidence scores or cross-entropy. */
export async function nearestNeighbour(
  train: readonly Vector[],
  labels: readonly number[],
  queries: readonly Vector[],
  classes: number,
  options: {
    signal?: AbortSignal;
    onProgress?: (done: number, total: number) => void;
    yieldBetweenQueries?: () => Promise<void>;
  } = {},
): Promise<NeighbourResult> {
  const dims = train[0]?.length ?? 0;
  if (
    !train.length ||
    train.length > LIMITS.maxImagesPerDataset ||
    queries.length > LIMITS.maxImagesPerDataset ||
    labels.length !== train.length ||
    !Number.isInteger(classes) ||
    classes < 2 ||
    classes > LIMITS.maxLabelsPerDataset ||
    !dims ||
    dims > ENCODER.dimensions ||
    !labels.every((y) => Number.isInteger(y) && y >= 0 && y < classes)
  )
    throw new BaselineError("Invalid nearest-neighbour inputs or labels.");
  for (const vector of [...train, ...queries]) {
    if (vector.length !== dims)
      throw new BaselineError("Feature dimensions differ.");
    for (let j = 0; j < dims; j++)
      if (!Number.isFinite(vector[j]))
        throw new BaselineError("Features must be finite numbers.");
  }
  const result: NeighbourResult = { predicted: [], squaredDistances: [] };
  const yieldNext =
    options.yieldBetweenQueries ??
    (() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
  for (const query of queries) {
    await yieldNext();
    if (options.signal?.aborted) throw new CancelledError();
    let best = 0,
      distance = Infinity;
    for (let i = 0; i < train.length; i++) {
      let squared = 0;
      for (let j = 0; j < dims; j++) {
        const difference = query[j] - train[i][j];
        squared += difference * difference;
      }
      if (!Number.isFinite(squared))
        throw new BaselineError("A feature distance could not be represented.");
      // Strict comparison preserves the earliest example on an exact tie.
      if (squared < distance) {
        best = i;
        distance = squared;
      }
    }
    result.predicted.push(labels[best]);
    result.squaredDistances.push(distance);
    options.onProgress?.(result.predicted.length, queries.length);
  }
  if (options.signal?.aborted) throw new CancelledError();
  return result;
}

/** Same snapshot and capped training order as the saved classifier, with one shared validation set. */
export function prepareBaseline(state: DatasetState, model: ModelRecord) {
  const compatible = checkCompatibility(
    model,
    ENCODER_KEY,
    state.dataset,
    state.labels,
  );
  if (!compatible.ok) throw new BaselineError(compatible.reason);
  if (
    model.dims !== ENCODER.dimensions ||
    new Set(model.labelIds).size !== model.labelIds.length ||
    model.labelNames.length !== model.labelIds.length ||
    validateSettings(model.settings).length ||
    !Number.isInteger(model.settings.batchSize) ||
    model.settings.batchSize < 1
  )
    throw new BaselineError("The saved model's configuration is invalid.");
  const selected = selectExamples(
    state.images,
    state.labels,
    model.labelIds,
    model.settings.perLabelCap,
    state.dataset.seed,
  );
  const problem = replayProblem(model, {
    datasetId: state.dataset.id,
    datasetVersion: state.dataset.version,
    encoderKey: ENCODER_KEY,
    splitSeed: state.dataset.seed,
    selection: selected,
  });
  if (problem) throw new BaselineError(problem);
  if (
    model.trainCount !== selected.train.length ||
    model.validationCount !== selected.validation.length ||
    !model.trainImages ||
    model.trainImages.length !== selected.train.length ||
    model.trainImages.some(
      (ref, i) =>
        ref.id !== selected.train[i].id ||
        ref.sha256 !== selected.train[i].sha256 ||
        ref.dhash !== selected.train[i].dhash,
    )
  )
    throw new BaselineError(
      "Complete matching training provenance is required for this comparison.",
    );
  if (
    [...selected.train, ...selected.validation].some(
      (i) => !/^[0-9a-f]{16}$/i.test(i.dhash),
    )
  )
    throw new BaselineError("Image fingerprints are invalid.");
  const check = independentValidation(model, selected.validation);
  if (!check.known || !check.kept.length)
    throw new BaselineError(
      "No independently checkable validation photos remain.",
    );
  return {
    train: selected.train,
    trainLabels: selected.trainLabels,
    validation: check.kept,
    truth: check.keptIndices.map((i) => selected.validationLabels[i]),
    excluded: check.excluded,
  };
}
