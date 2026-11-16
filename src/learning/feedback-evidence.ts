import type { ImageRecord } from "../datasets/types";
import type { LearningRound } from "./learning-round";
import type { ModelRecord, RunExampleRef } from "./types";
export interface FeedbackEvidence {
  version: 1;
  protocol: "one-batch-fresh-softmax/v1";
  sourceModelId: string;
  sourceDatasetVersion: number;
  originalTrain: RunExampleRef[];
  approved: RunExampleRef[];
  validation: RunExampleRef[];
  savedSource: { accuracy: number; loss: number };
  control: { accuracy: number; loss: number };
  expanded: { accuracy: number; loss: number };
}
const ref = ({ id, sha256, labelId }: ImageRecord): RunExampleRef => ({
  id,
  sha256,
  labelId: labelId!,
});
export function feedbackEvidence(
  source: ModelRecord,
  train: ImageRecord[],
  approved: ImageRecord[],
  validation: ImageRecord[],
  run: LearningRound,
): FeedbackEvidence {
  return cleanFeedback({
    version: 1,
    protocol: "one-batch-fresh-softmax/v1",
    sourceModelId: source.id,
    sourceDatasetVersion: source.datasetVersion,
    originalTrain: train.map(ref),
    approved: approved.map(ref),
    validation: validation.map(ref),
    savedSource: run.savedSource,
    control: run.control.after!,
    expanded: run.expanded.after!,
  });
}
/** Explicit allowlist: do not retain predictions, confidence, names, images or unexpected fields. */
export function cleanFeedback(e: FeedbackEvidence): FeedbackEvidence {
  const text = (v: string) =>
    typeof v === "string" && v.length > 0 && v.length <= 512;
  if (
    !e ||
    e.version !== 1 ||
    e.protocol !== "one-batch-fresh-softmax/v1" ||
    !text(e.sourceModelId) ||
    !Number.isSafeInteger(e.sourceDatasetVersion) ||
    e.sourceDatasetVersion < 1
  )
    throw new Error("Invalid feedback evidence.");
  const refs = (items: RunExampleRef[], max: number) => {
    if (
      !Array.isArray(items) ||
      !items.length ||
      items.length > max ||
      items.some((r) => !text(r.id) || !text(r.sha256) || !text(r.labelId))
    )
      throw new Error("Invalid feedback cohort.");
    return items.map(({ id, sha256, labelId }) => ({ id, sha256, labelId }));
  };
  const originalTrain = refs(e.originalTrain, 500),
    approved = refs(e.approved, 50),
    validation = refs(e.validation, 500);
  const all = [...originalTrain, ...approved, ...validation];
  if (
    all.length > 500 ||
    new Set(all.map((r) => r.id)).size !== all.length ||
    new Set(all.map((r) => r.sha256)).size !== all.length
  )
    throw new Error("Overlapping feedback cohorts.");
  const metric = (v: { accuracy: number; loss: number }) => {
    if (
      !v ||
      !Number.isFinite(v.accuracy) ||
      v.accuracy < 0 ||
      v.accuracy > 1 ||
      !Number.isFinite(v.loss) ||
      v.loss < 0
    )
      throw new Error("Invalid feedback measurements.");
    return { accuracy: v.accuracy, loss: v.loss };
  };
  return {
    version: 1,
    protocol: e.protocol,
    sourceModelId: e.sourceModelId,
    sourceDatasetVersion: e.sourceDatasetVersion,
    originalTrain,
    approved,
    validation,
    savedSource: metric(e.savedSource),
    control: metric(e.control),
    expanded: metric(e.expanded),
  };
}
/** An attached comparison must describe this exact saved classifier, not an unrelated run. */
export function checkedFeedback(model: ModelRecord): FeedbackEvidence | null {
  if (!model.feedback) return null;
  const e = cleanFeedback(model.feedback),
    manifest = model.experiment;
  const same = (a: RunExampleRef[], b: RunExampleRef[]) =>
    a.length === b.length &&
    a.every((r) =>
      b.some(
        (x) =>
          x.id === r.id && x.sha256 === r.sha256 && x.labelId === r.labelId,
      ),
    );
  if (
    !manifest ||
    e.sourceModelId === model.id ||
    model.datasetVersion !== e.sourceDatasetVersion + 1 ||
    !same(manifest.train, [...e.originalTrain, ...e.approved]) ||
    !same(manifest.validation, e.validation) ||
    model.stoppedEarly ||
    model.history.at(-1)?.epoch !== model.settings.epochs ||
    !Number.isFinite(model.history.at(-1)?.validationAccuracy) ||
    !Number.isFinite(model.history.at(-1)?.validationLoss) ||
    Math.abs(model.history.at(-1)!.validationAccuracy! - e.expanded.accuracy) >
      1e-12 ||
    Math.abs(model.history.at(-1)!.validationLoss! - e.expanded.loss) > 1e-12
  )
    throw new Error("Feedback evidence does not match the saved classifier.");
  return e;
}
