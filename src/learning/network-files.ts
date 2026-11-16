import { LIMITS } from "../datasets/limits";
import type { DatasetState } from "../datasets/service";
import type { ImageRecord } from "../datasets/types";
import { ENCODER, ENCODER_KEY } from "./encoder";
import { validateSeed } from "./experiments";
import { independentValidation } from "./models";
import type { TinyNetwork, trainNetwork } from "./nonlinear";
import { validateSettings } from "./trainer";
import type {
  EpochRecord,
  ModelRecord,
  RunExampleRef,
  TrainingSettings,
} from "./types";

export const MAX_NETWORK_FILE_BYTES = 1024 * 1024;
export class NetworkFileError extends Error {}
export interface NetworkFile {
  schema: "visual-labs.network-model/v1";
  id: string;
  createdAt: string;
  algorithm: "tanh8-sgd-f64/v1" | "tanh8-sgd-f64-l2/v1";
  encoderKey: string;
  dataset: { id: string; version: number; splitSeed: number };
  sourceRunId: string;
  dims: number;
  classes: { id: string; name?: string }[];
  settings: TrainingSettings;
  history: EpochRecord[];
  train: (RunExampleRef & { dhash: string })[];
  validation: RunExampleRef[];
  network: TinyNetwork;
}
const text = (x: unknown) =>
  typeof x === "string" && x.length > 0 && x.length <= 512;
const count = (n: number, max: number) =>
  Number.isInteger(n) && n > 0 && n <= max;
const loss = (x: unknown) =>
  typeof x === "number" && Number.isFinite(x) && x >= 0;
const accuracy = (x: unknown) => loss(x) && (x as number) <= 1;
function valid(condition: boolean) {
  if (!condition) throw new Error("Invalid network metadata.");
}
const algorithm = (s: TrainingSettings): NetworkFile["algorithm"] =>
  (s.l2 ?? 0) > 0 ? "tanh8-sgd-f64-l2/v1" : "tanh8-sgd-f64/v1";
const settingsCopy = (s: TrainingSettings): TrainingSettings => ({
  learningRate: s.learningRate,
  epochs: s.epochs,
  batchSize: s.batchSize,
  perLabelCap: s.perLabelCap,
  seed: s.seed,
  ...(s.l2 === undefined ? {} : { l2: s.l2 }),
});
const rowCopy = (r: EpochRecord): EpochRecord => ({
  epoch: r.epoch,
  trainLoss: r.trainLoss,
  trainAccuracy: r.trainAccuracy,
  validationLoss: r.validationLoss,
  validationAccuracy: r.validationAccuracy,
  ...(r.trainObjective === undefined
    ? {}
    : { trainObjective: r.trainObjective }),
});
const refCopy = ({ id, sha256, labelId }: RunExampleRef): RunExampleRef => ({
  id,
  sha256,
  labelId,
});

/** Bounded, data-only parsing. Unknown properties are discarded; nothing is executed or saved. */
export function parseNetworkFile(json: string): NetworkFile {
  if (
    json.length > MAX_NETWORK_FILE_BYTES ||
    new TextEncoder().encode(json).byteLength > MAX_NETWORK_FILE_BYTES
  )
    throw new NetworkFileError(
      "Network file is too large. Maximum size: 1 MiB.",
    );
  try {
    const a = JSON.parse(json) as Omit<NetworkFile, "network"> & {
      network: {
        input: number[];
        hiddenBias: number[];
        output: number[];
        outputBias: number[];
      };
    };
    valid(
      a.schema === "visual-labs.network-model/v1" &&
        text(a.id) &&
        text(a.sourceRunId) &&
        text(a.encoderKey),
    );
    valid(text(a.createdAt) && Number.isFinite(Date.parse(a.createdAt)));
    valid(
      text(a.dataset.id) &&
        count(a.dataset.version, Number.MAX_SAFE_INTEGER) &&
        validateSeed(a.dataset.splitSeed) === null,
    );
    valid(
      a.dims === ENCODER.dimensions &&
        Array.isArray(a.classes) &&
        a.classes.length >= 2 &&
        a.classes.length <= LIMITS.maxLabelsPerDataset,
    );
    valid(
      a.classes.every(
        (c) =>
          text(c.id) &&
          (c.name === undefined ||
            (typeof c.name === "string" &&
              c.name.length <= LIMITS.maxLabelLength)),
      ),
    );
    const ids = a.classes.map((c) => c.id);
    valid(new Set(ids).size === ids.length);
    valid(
      validateSettings(a.settings).length === 0 &&
        validateSeed(a.settings.seed) === null &&
        count(a.settings.batchSize, LIMITS.maxImagesPerDataset),
    );
    valid(a.algorithm === algorithm(a.settings));
    valid(
      Array.isArray(a.train) &&
        Array.isArray(a.validation) &&
        count(a.train.length, LIMITS.maxImagesPerDataset) &&
        count(a.validation.length, LIMITS.maxImagesPerDataset - a.train.length),
    );
    const refs = [...a.train, ...a.validation];
    valid(
      refs.every(
        (r) => text(r.id) && text(r.sha256) && ids.includes(r.labelId),
      ) && new Set(refs.map((r) => r.id)).size === refs.length,
    );
    valid(
      a.train.every(
        (r) => typeof r.dhash === "string" && /^[0-9a-f]{16}$/i.test(r.dhash),
      ) && ids.every((id) => a.train.some((r) => r.labelId === id)),
    );
    const hashes = new Set(a.train.map((r) => r.sha256));
    valid(!a.validation.some((r) => hashes.has(r.sha256)));
    valid(
      Array.isArray(a.history) && a.history.length === a.settings.epochs + 1,
    );
    valid(
      a.history.every(
        (r, i) =>
          r.epoch === i &&
          loss(r.trainLoss) &&
          accuracy(r.trainAccuracy) &&
          loss(r.validationLoss) &&
          accuracy(r.validationAccuracy) &&
          ((a.settings.l2 ?? 0) > 0
            ? loss(r.trainObjective) && r.trainObjective! >= r.trainLoss
            : r.trainObjective === undefined),
      ),
    );
    const sizes = {
      input: a.dims * 8,
      hiddenBias: 8,
      output: ids.length * 8,
      outputBias: ids.length,
    };
    for (const key of ["input", "hiddenBias", "output", "outputBias"] as const)
      valid(
        Array.isArray(a.network[key]) &&
          a.network[key].length === sizes[key] &&
          a.network[key].every(Number.isFinite),
      );
    if ((a.settings.l2 ?? 0) > 0) {
      const penalty =
        (a.settings.l2! / 2) *
        [...a.network.input, ...a.network.output].reduce(
          (s, w) => s + w * w,
          0,
        );
      const last = a.history.at(-1)!;
      valid(
        Number.isFinite(penalty) &&
          Math.abs(last.trainObjective! - last.trainLoss - penalty) <=
            1e-9 * Math.max(1, last.trainObjective!),
      );
    }
    return {
      schema: "visual-labs.network-model/v1",
      id: a.id,
      createdAt: a.createdAt,
      algorithm: a.algorithm,
      encoderKey: a.encoderKey,
      dataset: {
        id: a.dataset.id,
        version: a.dataset.version,
        splitSeed: a.dataset.splitSeed,
      },
      sourceRunId: a.sourceRunId,
      dims: a.dims,
      classes: a.classes.map((c) => ({
        id: c.id,
        ...(c.name === undefined ? {} : { name: c.name }),
      })),
      settings: settingsCopy(a.settings),
      history: a.history.map(rowCopy),
      train: a.train.map((r) => ({
        ...refCopy(r),
        dhash: r.dhash.toLowerCase(),
      })),
      validation: a.validation.map(refCopy),
      network: {
        dims: a.dims,
        classes: ids.length,
        input: new Float64Array(a.network.input),
        hiddenBias: new Float64Array(a.network.hiddenBias),
        output: new Float64Array(a.network.output),
        outputBias: new Float64Array(a.network.outputBias),
      },
    };
  } catch {
    throw new NetworkFileError(
      "This is not a valid supported network-model file. Check its format, parameters and training metadata.",
    );
  }
}

/** Explicit export only: learned parameters and provenance, never pixels or cached embeddings. */
export function serializeNetworkFile(
  source: ModelRecord,
  run: Pick<
    Awaited<ReturnType<typeof trainNetwork>>,
    "model" | "history" | "stoppedEarly"
  >,
  plan: { train: ImageRecord[]; validation: ImageRecord[] },
  includeNames = false,
): string {
  try {
    valid(
      !run.stoppedEarly &&
        !!source.experiment &&
        run.model.dims === source.dims &&
        run.model.classes === source.labelIds.length,
    );
    valid(
      plan.train.length === source.trainCount &&
        plan.train.every(
          (r, i) =>
            r.split === "train" &&
            r.id === source.experiment!.train[i]?.id &&
            r.sha256 === source.experiment!.train[i]?.sha256 &&
            r.labelId === source.experiment!.train[i]?.labelId &&
            r.dhash === source.trainImages?.[i]?.dhash,
        ),
    );
    valid(
      plan.validation.length > 0 &&
        plan.validation.every(
          (r) =>
            r.split === "validation" &&
            source.experiment!.validation.some(
              (v) =>
                v.id === r.id &&
                v.sha256 === r.sha256 &&
                v.labelId === r.labelId,
            ),
        ),
    );
    const refs = (images: ImageRecord[]) =>
      images.map((i) => ({ id: i.id, sha256: i.sha256, labelId: i.labelId! }));
    const payload = {
      schema: "visual-labs.network-model/v1",
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      algorithm: algorithm(source.settings),
      encoderKey: source.encoderKey,
      dataset: {
        id: source.datasetId,
        version: source.datasetVersion,
        splitSeed: source.experiment!.splitSeed,
      },
      sourceRunId: source.id,
      dims: source.dims,
      classes: source.labelIds.map((id, i) => ({
        id,
        ...(includeNames ? { name: source.labelNames[i] } : {}),
      })),
      settings: settingsCopy(source.settings),
      history: run.history.map(rowCopy),
      train: refs(plan.train).map((r, i) => ({
        ...r,
        dhash: plan.train[i].dhash,
      })),
      validation: refs(plan.validation),
      network: {
        input: Array.from(run.model.input),
        hiddenBias: Array.from(run.model.hiddenBias),
        output: Array.from(run.model.output),
        outputBias: Array.from(run.model.outputBias),
      },
    };
    const json = JSON.stringify(payload, null, 2) + "\n";
    parseNetworkFile(json);
    return json;
  } catch {
    throw new NetworkFileError(
      "Cannot export this network: incomplete training or invalid model/validation metadata. Run a complete comparison again.",
    );
  }
}

/** Current validation only; recorded training IDs and fingerprints screen known copies.
 * Imported provenance is a file claim, not independent proof of what trained the model. */
export function prepareNetworkCheck(state: DatasetState, file: NetworkFile) {
  if (file.encoderKey !== ENCODER_KEY)
    throw new NetworkFileError(
      "This file needs a different encoder or preprocessing.",
    );
  if (file.dataset.id !== state.dataset.id)
    throw new NetworkFileError(
      "Choose the original dataset for this network file.",
    );
  const ids = file.classes.map((c) => c.id);
  if (ids.some((id) => !state.labels.some((label) => label.id === id)))
    throw new NetworkFileError(
      "This file needs labels that no longer exist in the dataset.",
    );
  const validation = state.images.filter(
    (i) => i.split === "validation" && i.labelId && ids.includes(i.labelId),
  );
  if (validation.some((i) => !/^[0-9a-f]{16}$/i.test(i.dhash)))
    throw new NetworkFileError("Validation fingerprints are invalid.");
  const check = independentValidation({ trainImages: file.train }, validation);
  if (!check.known || !check.kept.length)
    throw new NetworkFileError(
      "No validation photos remain after screening recorded training copies.",
    );
  return {
    images: check.kept,
    truth: check.kept.map((i) => ids.indexOf(i.labelId!)),
    excluded: check.excluded,
    names: ids.map((id) => state.labels.find((l) => l.id === id)!.name),
    warning:
      file.dataset.version !== state.dataset.version
        ? "The dataset has changed since training. File-reported scores describe the earlier snapshot; the fresh check uses current validation photos screened against recorded training copies."
        : null,
  };
}
