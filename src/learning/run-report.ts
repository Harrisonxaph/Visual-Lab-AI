import { LIMITS } from "../datasets/limits";
import { runAlgorithm, validateSeed } from "./experiments";
import { validateSettings } from "./trainer";
import type { ModelRecord, RunExampleRef } from "./types";

export class RunReportError extends Error {}

function requireValid(condition: boolean) {
  if (!condition)
    throw new Error("Invalid saved-run metadata or measurements.");
}
const count = (n: number, max: number) =>
  Number.isInteger(n) && n >= 0 && n <= max;
const text = (s: string) =>
  typeof s === "string" && s.length > 0 && s.length <= 512;
const loss = (n: number | null) => n !== null && Number.isFinite(n) && n >= 0;
const accuracy = (n: number | null) =>
  n !== null && Number.isFinite(n) && n >= 0 && n <= 1;

/** Explicit allowlist: never serialize a model record wholesale, even with a JSON replacer. */
function report(m: ModelRecord, includeClassNames: boolean) {
  requireValid(text(m.id) && text(m.datasetId) && text(m.encoderKey));
  requireValid(text(m.createdAt) && Number.isFinite(Date.parse(m.createdAt)));
  requireValid(
    count(m.datasetVersion, Number.MAX_SAFE_INTEGER) &&
      count(m.dims, 4096) &&
      m.dims > 0,
  );
  requireValid(
    m.labelIds.length >= 2 &&
      m.labelIds.length <= LIMITS.maxLabelsPerDataset &&
      m.labelIds.every(text) &&
      new Set(m.labelIds).size === m.labelIds.length,
  );
  requireValid(
    m.labelNames.length === m.labelIds.length &&
      m.labelNames.every(
        (n) => typeof n === "string" && n.length <= LIMITS.maxLabelLength,
      ),
  );
  requireValid(
    validateSettings(m.settings).length === 0 &&
      validateSeed(m.settings.seed) === null &&
      count(m.settings.batchSize, LIMITS.maxImagesPerDataset) &&
      m.settings.batchSize > 0,
  );
  requireValid(
    count(m.trainCount, LIMITS.maxImagesPerDataset) &&
      m.trainCount > 0 &&
      count(m.validationCount, LIMITS.maxImagesPerDataset - m.trainCount),
  );
  requireValid(
    typeof m.stoppedEarly === "boolean" &&
      m.history.length >= 1 &&
      m.history.length <= m.settings.epochs + 1,
  );
  requireValid(
    m.history.every(
      (r, i) =>
        r.epoch === i &&
        loss(r.trainLoss) &&
        accuracy(r.trainAccuracy) &&
        (r.trainObjective === undefined
          ? (m.settings.l2 ?? 0) === 0
          : Number.isFinite(r.trainObjective) &&
            r.trainObjective >= r.trainLoss) &&
        (m.validationCount
          ? loss(r.validationLoss) && accuracy(r.validationAccuracy)
          : r.validationLoss === null && r.validationAccuracy === null),
    ),
  );
  const completedEpochs = m.history.at(-1)!.epoch;
  requireValid(m.stoppedEarly || completedEpochs === m.settings.epochs);
  const manifest = m.experiment;
  if (manifest) {
    requireValid(
      manifest.version === 1 &&
        manifest.algorithm === runAlgorithm(m.settings) &&
        validateSeed(manifest.splitSeed) === null,
    );
    requireValid(
      manifest.labelIds.length === m.labelIds.length &&
        manifest.labelIds.every((id, i) => id === m.labelIds[i]),
    );
    requireValid(
      manifest.train.length === m.trainCount &&
        manifest.validation.length === m.validationCount,
    );
    const refs = [...manifest.train, ...manifest.validation];
    requireValid(
      refs.every(
        (r) => text(r.id) && text(r.sha256) && m.labelIds.includes(r.labelId),
      ) && new Set(refs.map((r) => r.id)).size === refs.length,
    );
    const trainingHashes = new Set(manifest.train.map((r) => r.sha256));
    requireValid(
      !manifest.validation.some((r) => trainingHashes.has(r.sha256)),
    );
  }
  const refs = (items: RunExampleRef[]) =>
    items.map(({ id, sha256, labelId }) => ({ id, sha256, labelId }));
  return {
    schema: "visual-labs.run-report/v1",
    evaluationScope: "recorded training and validation only",
    testResultsIncluded: false,
    runId: m.id,
    createdAt: m.createdAt,
    dataset: { id: m.datasetId, version: m.datasetVersion },
    encoderKey: m.encoderKey,
    dimensions: m.dims,
    classes: m.labelIds.map((id, i) =>
      includeClassNames ? { id, name: m.labelNames[i] } : { id },
    ),
    settings: {
      learningRate: m.settings.learningRate,
      epochs: m.settings.epochs,
      batchSize: m.settings.batchSize,
      perLabelCap: m.settings.perLabelCap,
      seed: m.settings.seed,
      ...(m.settings.l2 === undefined ? {} : { l2: m.settings.l2 }),
    },
    trainCount: m.trainCount,
    validationCount: m.validationCount,
    completedEpochs,
    stoppedEarly: m.stoppedEarly,
    history: m.history.map(
      ({
        epoch,
        trainLoss,
        trainAccuracy,
        validationLoss,
        validationAccuracy,
        trainObjective,
      }) => ({
        epoch,
        trainLoss,
        trainAccuracy,
        validationLoss,
        validationAccuracy,
        ...(trainObjective === undefined ? {} : { trainObjective }),
      }),
    ),
    replayMetadata: manifest ? "recorded" : "unavailable",
    manifest: manifest
      ? {
          version: manifest.version,
          algorithm: manifest.algorithm,
          splitSeed: manifest.splitSeed,
          labelIds: [...manifest.labelIds],
          train: refs(manifest.train),
          validation: refs(manifest.validation),
        }
      : null,
    limitations: [
      "This is a report, not a reloadable model or dataset backup. There is no report import feature.",
      "Repeating a run needs the original dataset snapshot, encoder and compatible implementation; identical bits across devices are not guaranteed.",
      "Local identifiers and image file fingerprints are included. Fingerprints can link matching files; this report is not anonymous.",
      "Recorded validation scores are not a fresh evaluation or a final held-out test. Repeated validation tuning may overfit validation.",
    ],
  };
}

/** Called only by explicit export. No data reads, inference, uploads or persistence. */
export function serializeRunReport(
  model: ModelRecord,
  includeClassNames = false,
): string {
  try {
    const json =
      JSON.stringify(report(model, includeClassNames), null, 2) + "\n";
    requireValid(new TextEncoder().encode(json).byteLength <= 1024 * 1024);
    return json;
  } catch {
    throw new RunReportError(
      "Cannot export this saved run: metadata or measurements are invalid. Train and save a new run instead.",
    );
  }
}
