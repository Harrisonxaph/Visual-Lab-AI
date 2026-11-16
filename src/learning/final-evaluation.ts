import { hammingDistance } from "../datasets/hash";
import { LIMITS, NEAR_DUPLICATE_MAX_DISTANCE } from "../datasets/limits";
import type {
  DatasetRecord,
  ImageRecord,
  LabelRecord,
} from "../datasets/types";
import { CancelledError } from "./embeddings";
import { ENCODER, ENCODER_KEY } from "./encoder";
import { selectExamples } from "./examples";
import { replayProblem } from "./experiments";
import { checkCompatibility, toSoftmax } from "./models";
import { evaluate } from "./softmax";
import { validateSettings } from "./trainer";
import { prepareMethodComparison } from "./method-comparison";
import {
  parseNetworkFile,
  serializeNetworkFile,
  type NetworkFile,
} from "./network-files";
import { evaluateNetwork, type trainNetwork } from "./nonlinear";
import type {
  ModelRecord,
  RunExampleRef,
  RunManifest,
  TrainingSettings,
} from "./types";

export class FinalCheckError extends Error {}
export type NetworkFinalChoice = Pick<
  NetworkFile,
  "algorithm" | "network" | "history" | "train" | "validation"
>;
/** Only completed in-session comparisons are offered by the UI. Imported files are not eligible.
 * Reuse the same bounded parameter/provenance validator as explicit model-file export. */
export function createNetworkFinalChoice(
  source: ModelRecord,
  run: Pick<
    Awaited<ReturnType<typeof trainNetwork>>,
    "model" | "history" | "stoppedEarly"
  >,
  plan: Parameters<typeof serializeNetworkFile>[2],
): NetworkFinalChoice {
  const file = parseNetworkFile(serializeNetworkFile(source, run, plan));
  return {
    algorithm: file.algorithm,
    network: file.network,
    history: file.history,
    train: file.train,
    validation: file.validation,
  };
}
export interface FinalPlan {
  datasetId: string;
  datasetVersion: number;
  /** Saved source-run ID; networkChoice identifies the actual neural classifier when present. */
  modelId: string;
  encoderKey: string;
  labelIds: string[];
  labelNames: string[];
  settings: TrainingSettings;
  /** Source selection/configuration; the neural method and its own history live in networkChoice. */
  sourceRun: RunManifest;
  test: RunExampleRef[];
  /** Present only when a trusted in-session network was explicitly chosen; absent means legacy softmax. */
  networkChoice?: NetworkFinalChoice;
}
export interface FinalResult {
  completedAt: string;
  loss: number;
  truth: number[];
  predicted: number[];
}
export interface FinalCheckRecord extends FinalPlan {
  id: string;
  createdAt: string;
  modelFingerprint: string;
  status: "locked" | "complete";
  result?: FinalResult;
}
function fail(message: string): never {
  throw new FinalCheckError(message);
}

/** Preflight only: reads metadata, never test pixels. Refuses rather than pruning the test set. */
export function prepareFinalPlan(
  dataset: DatasetRecord,
  labels: readonly LabelRecord[],
  images: readonly ImageRecord[],
  model: ModelRecord,
  networkChoice?: NetworkFinalChoice,
): FinalPlan {
  if (
    model.labelNames.length !== model.labelIds.length ||
    new Set(model.labelIds).size !== model.labelIds.length ||
    model.labelIds.length > LIMITS.maxLabelsPerDataset ||
    validateSettings(model.settings).length ||
    !Number.isInteger(model.settings.batchSize) ||
    model.settings.batchSize < 1 ||
    model.settings.batchSize > LIMITS.maxImagesPerDataset
  )
    fail("The saved model has invalid class metadata or training settings.");
  const compatible = checkCompatibility(model, ENCODER_KEY, dataset, labels);
  if (!compatible.ok) fail(compatible.reason);
  if (
    model.dims !== ENCODER.dimensions ||
    model.stoppedEarly ||
    model.history.at(-1)?.epoch !== model.settings.epochs
  )
    fail(
      "Choose a compatible saved model that finished training before the final check.",
    );
  const selection = selectExamples(
    images,
    labels,
    model.labelIds,
    model.settings.perLabelCap,
    dataset.seed,
  );
  const problem = replayProblem(model, {
    datasetId: dataset.id,
    datasetVersion: dataset.version,
    encoderKey: ENCODER_KEY,
    splitSeed: dataset.seed,
    selection,
  });
  if (problem) fail(problem);
  if (
    model.trainCount !== selection.train.length ||
    model.validationCount !== selection.validation.length
  )
    fail("The recorded training or validation counts are inconsistent.");
  const tests = images.filter(
    (i) =>
      i.split === "test" && i.labelId && model.labelIds.includes(i.labelId),
  );
  if (model.labelIds.some((id) => !tests.some((i) => i.labelId === id)))
    fail("Each selected label needs at least one held-out test photo.");
  if (
    new Set(tests.map((i) => i.id)).size !== tests.length ||
    new Set(tests.map((i) => i.sha256)).size !== tests.length
  )
    fail("The test set contains duplicate references or files.");
  const used = images.filter(
    (i) =>
      (i.split === "train" || i.split === "validation") &&
      i.labelId &&
      model.labelIds.includes(i.labelId),
  );
  if (
    [...used, ...tests].some(
      (i) => !/^[0-9a-f]{16}$/i.test(i.dhash) || !i.sha256,
    )
  )
    fail("Image fingerprint metadata is missing or invalid.");
  if (
    tests.some((t) =>
      used.some(
        (i) =>
          t.id === i.id ||
          t.sha256 === i.sha256 ||
          hammingDistance(t.dhash, i.dhash) <= NEAR_DUPLICATE_MAX_DISTANCE,
      ),
    )
  )
    fail(
      "Test photos overlap with, or look like a near-copy of, training/validation photos. Resolve dataset integrity before a final check.",
    );
  let checkedNetwork: NetworkFinalChoice | undefined;
  if (networkChoice) {
    try {
      const shared = prepareMethodComparison(
        { dataset, labels: [...labels], images: [...images] },
        model,
      );
      checkedNetwork = createNetworkFinalChoice(
        model,
        {
          model: networkChoice.network,
          history: networkChoice.history,
          stoppedEarly: false,
        },
        shared,
      );
      if (
        finalChoiceSignature(model, checkedNetwork) !==
        finalChoiceSignature(model, networkChoice)
      )
        fail(
          "The network's recorded training/validation provenance or method does not match this snapshot.",
        );
    } catch (error) {
      if (error instanceof FinalCheckError) throw error;
      fail(
        "The completed network candidate is invalid or no longer matches the original training snapshot.",
      );
    }
  }
  return {
    datasetId: dataset.id,
    datasetVersion: dataset.version,
    modelId: model.id,
    encoderKey: model.encoderKey,
    labelIds: [...model.labelIds],
    labelNames: [...model.labelNames],
    settings: { ...model.settings },
    sourceRun: structuredClone(model.experiment!),
    test: tests.map(({ id, sha256, labelId }) => ({
      id,
      sha256,
      labelId: labelId!,
    })),
    ...(checkedNetwork ? { networkChoice: checkedNetwork } : {}),
  };
}

/** Internal identity, not exported or uploaded. Includes parameters and their training provenance. */
export function finalModelSignature(m: ModelRecord): string {
  return JSON.stringify([
    m.id,
    m.datasetId,
    m.datasetVersion,
    m.encoderKey,
    m.dims,
    m.labelIds,
    m.labelNames,
    m.settings,
    m.experiment,
    m.trainImages,
    Array.from(m.weights),
    Array.from(m.bias),
  ]);
}
/** Legacy identities remain byte-for-byte unchanged; neural choices bind all parameters and provenance. */
export function finalChoiceSignature(
  model: ModelRecord,
  choice?: NetworkFinalChoice,
): string {
  const source = finalModelSignature(model);
  if (!choice) return source;
  return JSON.stringify([
    source,
    choice.algorithm,
    choice.network.dims,
    choice.network.classes,
    Array.from(choice.network.input),
    Array.from(choice.network.hiddenBias),
    Array.from(choice.network.output),
    Array.from(choice.network.outputBias),
    choice.history,
    choice.train,
    choice.validation,
  ]);
}
export async function fingerprintModel(
  model: ModelRecord,
  choice?: NetworkFinalChoice,
): Promise<string> {
  const bytes = new TextEncoder().encode(finalChoiceSignature(model, choice));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const cancel = () => {
      signal?.removeEventListener("abort", cancel);
      reject(new CancelledError());
    };
    promise.then(
      (v) => {
        signal?.removeEventListener("abort", cancel);
        resolve(v);
      },
      (e) => {
        signal?.removeEventListener("abort", cancel);
        reject(e);
      },
    );
    signal?.addEventListener("abort", cancel, { once: true });
    if (signal?.aborted) cancel();
  });
}

/** Dedicated final-only path: test embeddings stay in memory; nothing is cached or trained. */
export async function runFinalCheck(
  lock: FinalCheckRecord,
  candidate: ModelRecord,
  getImage: (id: string) => Promise<Blob | undefined>,
  embed: (image: Blob) => Promise<Float32Array>,
  options: {
    signal?: AbortSignal;
    onProgress?: (done: number, total: number) => void;
  } = {},
): Promise<FinalResult> {
  if (
    lock.status !== "locked" ||
    lock.modelId !== candidate.id ||
    (await abortable(
      fingerprintModel(candidate, lock.networkChoice),
      options.signal,
    )) !== lock.modelFingerprint
  )
    fail("Only the originally locked model can run this final check.");
  const model = lock.networkChoice ? null : toSoftmax(candidate),
    vectors: Float32Array[] = [],
    truth: number[] = [];
  for (const ref of lock.test) {
    if (options.signal?.aborted) throw new CancelledError();
    const image = await abortable(getImage(ref.id), options.signal);
    if (!image)
      fail("A locked test photo is missing. No partial results were saved.");
    const vector = await abortable(embed(image), options.signal);
    if (vector.length !== candidate.dims || !vector.every(Number.isFinite))
      fail("The encoder returned invalid values; no final result was saved.");
    vectors.push(vector);
    truth.push(lock.labelIds.indexOf(ref.labelId));
    options.onProgress?.(vectors.length, lock.test.length);
  }
  if (options.signal?.aborted) throw new CancelledError();
  const result = lock.networkChoice
    ? evaluateNetwork(lock.networkChoice.network, vectors, truth)
    : evaluate(model!, vectors, truth);
  return {
    completedAt: new Date().toISOString(),
    loss: result.loss,
    truth,
    predicted: result.predicted,
  };
}
