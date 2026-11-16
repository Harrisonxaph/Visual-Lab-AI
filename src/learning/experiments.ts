import { LIMITS } from "../datasets/limits";
import { validateSettings } from "./trainer";
import { stableHash } from "../datasets/hash";
import type { ExampleSelection } from "./examples";
import { assertNoTestImages } from "./examples";
import type {
  ModelRecord,
  RunExampleRef,
  RunManifest,
  TrainingSettings,
} from "./types";

export const RUN_ALGORITHM = "softmax-sgd-f64/v1";
export const DEFAULT_TRAINING_SEED = 42;

export function validateSeed(seed: number): string | null {
  return Number.isInteger(seed) && seed >= 0 && seed <= 4294967295
    ? null
    : "Seed must be a whole number between 0 and 4294967295.";
}

/** Copies the exact ordered examples; test images must never enter a run manifest. */
export function createRunManifest(
  splitSeed: number,
  selection: ExampleSelection,
): RunManifest {
  assertNoTestImages([...selection.train, ...selection.validation]);
  const refs = (images: ExampleSelection["train"]): RunExampleRef[] =>
    images.map(({ id, sha256, labelId }) => {
      if (!labelId) throw new Error("A run example must have a label.");
      return { id, sha256, labelId };
    });
  return {
    version: 1,
    algorithm: RUN_ALGORITHM,
    splitSeed,
    labelIds: selection.classes.map((c) => c.id),
    train: refs(selection.train),
    validation: refs(selection.validation),
  };
}

const sameLabels = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id, i) => id === b[i]);
const sameExamples = (a: RunExampleRef[], b: RunExampleRef[]) =>
  a.length === b.length &&
  a.every(
    (x, i) =>
      x.id === b[i].id &&
      x.sha256 === b[i].sha256 &&
      x.labelId === b[i].labelId,
  );

function manifestProblem(
  a: RunManifest,
  b: RunManifest,
  requireSameTraining = true,
): string | null {
  if (
    a.version !== 1 ||
    b.version !== 1 ||
    a.algorithm !== RUN_ALGORITHM ||
    b.algorithm !== RUN_ALGORITHM
  )
    return "These runs use an unknown or different training algorithm.";
  if (a.splitSeed !== b.splitSeed) return "The dataset split seeds differ.";
  if (!sameLabels(a.labelIds, b.labelIds)) return "The class order differs.";
  if (
    (requireSameTraining && !sameExamples(a.train, b.train)) ||
    !sameExamples(a.validation, b.validation)
  )
    return "The ordered training or validation examples, labels or image hashes differ.";
  return null;
}

export type ComparisonMode = "same-data" | "dataset-size";

/** Only the cap may change, and the smaller run must be its actual seeded nested subset. */
function datasetSizeProblem(a: ModelRecord, b: ModelRecord): string | null {
  if (
    [a, b].some(
      (m) =>
        validateSettings(m.settings).length > 0 ||
        validateSeed(m.settings.seed) !== null ||
        validateSeed(m.experiment!.splitSeed) !== null ||
        !Number.isInteger(m.settings.batchSize) ||
        m.settings.batchSize < 1 ||
        m.settings.batchSize > LIMITS.maxImagesPerDataset,
    )
  )
    return "Both runs need valid recorded settings and split seeds.";
  if (a.trainCount === b.trainCount)
    return "Choose runs with different training-photo counts.";
  for (const key of ["learningRate", "epochs", "seed", "batchSize"] as const)
    if (a.settings[key] !== b.settings[key])
      return "Only change the photo cap; keep learning rate, epochs, seed and batch size identical.";
  if (
    [a, b].some(
      (m) => m.stoppedEarly || m.history.at(-1)!.epoch !== m.settings.epochs,
    )
  )
    return "Both runs must finish the same planned epoch budget; stopped runs are not controlled size comparisons.";
  for (const m of [a, b]) {
    const { train, validation } = m.experiment!;
    const all = [...train, ...validation];
    if (
      new Set(all.map((r) => r.id)).size !== all.length ||
      all.some((r) => !r.id || !r.sha256 || !m.labelIds.includes(r.labelId))
    )
      return "The run has duplicate, missing or inconsistent example references.";
    const hashes = new Set(train.map((r) => r.sha256));
    if (validation.some((r) => hashes.has(r.sha256)))
      return "Training and validation share a file fingerprint; this is not an independent comparison.";
  }
  const [small, large] = a.trainCount < b.trainCount ? [a, b] : [b, a];
  const cap = small.settings.perLabelCap,
    largerCap = large.settings.perLabelCap;
  if (cap === null || (largerCap !== null && largerCap <= cap))
    return "The smaller run needs a lower per-label photo cap.";
  const larger = large.experiment!.train;
  const expected: RunExampleRef[] = [];
  for (const labelId of large.labelIds) {
    const group = larger.filter((r) => r.labelId === labelId);
    if (!group.length || (largerCap !== null && group.length > largerCap))
      return "The recorded training counts do not match the selected labels or caps.";
    const chosen = new Set(
      group
        .map((ref, order) => ({ ref, order }))
        .sort(
          (x, y) =>
            stableHash(`${large.experiment!.splitSeed}:${x.ref.id}`) -
              stableHash(`${large.experiment!.splitSeed}:${y.ref.id}`) ||
            x.order - y.order,
        )
        .slice(0, cap)
        .map(({ ref }) => ref.id),
    );
    expected.push(...group.filter((r) => chosen.has(r.id)));
  }
  if (!sameExamples(small.experiment!.train, expected))
    return "The smaller run is not the deterministic nested photo-cap subset of the larger run.";
  return null;
}

export interface RecordedComparison {
  ok: boolean;
  reason: string | null;
  changes: string[];
}

/** Compares stored results only, never running inference or opening the sealed test split. */
export function compareRecordedRuns(
  a: ModelRecord,
  b: ModelRecord,
  mode: ComparisonMode = "same-data",
): RecordedComparison {
  const fail = (reason: string): RecordedComparison => ({
    ok: false,
    reason,
    changes: [],
  });
  if (!a.experiment || !b.experiment)
    return fail(
      "An older model has no run manifest. Train and save new runs to compare them.",
    );
  if (a.datasetId !== b.datasetId || a.datasetVersion !== b.datasetVersion)
    return fail("The recorded datasets or dataset versions differ.");
  if (a.encoderKey !== b.encoderKey || a.dims !== b.dims)
    return fail("The encoders or preprocessing differ.");
  if (!sameLabels(a.labelIds, b.labelIds))
    return fail("The class order differs.");
  const problem = manifestProblem(
    a.experiment,
    b.experiment,
    mode !== "dataset-size",
  );
  if (problem) return fail(problem);
  if (
    !sameLabels(a.labelIds, a.experiment.labelIds) ||
    !sameLabels(b.labelIds, b.experiment.labelIds)
  )
    return fail("A model's class order does not match its run manifest.");
  const measured = (m: ModelRecord) => {
    const last = m.history.at(-1);
    return (
      m.experiment!.validation.length > 0 &&
      m.validationCount === m.experiment!.validation.length &&
      m.trainCount === m.experiment!.train.length &&
      last?.validationAccuracy !== null &&
      Number.isFinite(last?.validationAccuracy) &&
      last!.validationAccuracy! >= 0 &&
      last!.validationAccuracy! <= 1 &&
      last?.validationLoss !== null &&
      Number.isFinite(last?.validationLoss) &&
      last!.validationLoss! >= 0 &&
      Number.isFinite(last?.trainLoss) &&
      last!.trainLoss >= 0 &&
      Number.isInteger(last?.epoch) &&
      last!.epoch >= 0 &&
      last!.epoch <= m.settings.epochs
    );
  };
  if (!measured(a) || !measured(b))
    return fail(
      "Both runs need recorded validation measurements and matching example counts.",
    );
  if (mode === "dataset-size") {
    const problem = datasetSizeProblem(a, b);
    if (problem) return fail(problem);
  }
  const changes: string[] = [];
  if (a.trainCount !== b.trainCount) changes.push("training photos");
  for (const [key, name] of [
    ["learningRate", "learning rate"],
    ["epochs", "planned epochs"],
    ["seed", "seed"],
    ["batchSize", "batch size"],
    ["perLabelCap", "photo cap"],
  ] as const)
    if (a.settings[key] !== b.settings[key]) changes.push(name);
  if (a.history.at(-1)!.epoch !== b.history.at(-1)!.epoch)
    changes.push("completed epochs");
  if (a.stoppedEarly !== b.stoppedEarly) changes.push("stop status");
  return { ok: true, reason: null, changes };
}

/** Restoring settings is allowed only when the original examples can still be reproduced. */
export function replayProblem(
  model: ModelRecord,
  context: {
    datasetId: string;
    datasetVersion: number;
    encoderKey: string;
    splitSeed: number;
    selection: ExampleSelection;
  },
): string | null {
  if (!model.experiment)
    return "This older model has no reproducible run manifest.";
  if (
    model.datasetId !== context.datasetId ||
    model.datasetVersion !== context.datasetVersion
  )
    return "The dataset changed; this is no longer the recorded run's snapshot.";
  if (model.encoderKey !== context.encoderKey)
    return "The encoder or preprocessing changed.";
  if (context.selection.problems.length)
    return context.selection.problems.join(" ");
  return (
    validateSeed(model.settings.seed) ??
    manifestProblem(
      model.experiment,
      createRunManifest(context.splitSeed, context.selection),
    )
  );
}

/** A cancelled run repeats its completed work, not its unused planned epoch budget. */
export function repeatSettings(model: ModelRecord): TrainingSettings | null {
  const epochs = model.stoppedEarly
    ? model.history.at(-1)?.epoch
    : model.settings.epochs;
  if (!Number.isInteger(epochs) || !epochs || epochs < 1 || epochs > 300)
    return null;
  return { ...model.settings, epochs };
}
