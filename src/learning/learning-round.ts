import { selectExamples } from "./examples";
import type { DatasetState } from "../datasets/service";
import type { ImageRecord } from "../datasets/types";
import { ReviewError } from "./active-review";
import { CancelledError } from "./embeddings";
import { prepareBaseline } from "./nearest-neighbour";
import { preparePromotion } from "./review-promotion";
import { evaluate } from "./softmax";
import { toSoftmax } from "./models";
import { runTraining } from "./trainer";
import type { ModelRecord } from "./types";

/** First round: exactly one atomic approval batch since the completed uncapped source. */
export function prepareLearningRound(state: DatasetState, source: ModelRecord) {
  if (source.settings.perLabelCap !== null)
    throw new ReviewError(
      "Use a source trained without a per-label cap for this first controlled round.",
    );
  if (state.dataset.version !== source.datasetVersion + 1)
    throw new ReviewError(
      "The round needs exactly one approval commit after its source. Later dataset edits require a new source and review batch.",
    );
  const added = state.images.filter(
    (i) =>
      i.review?.sourceModelId === source.id &&
      i.review.sourceDatasetVersion === source.datasetVersion,
  );
  if (
    !added.length ||
    added.length > 50 ||
    added.some(
      (i) =>
        i.split !== "train" ||
        i.labelId !== i.review!.approvedLabelId ||
        i.review!.encoderKey !== source.encoderKey,
    ) ||
    new Set(added.map((i) => i.review!.approvedAt)).size !== 1
  )
    throw new ReviewError(
      "A complete matching training-only approval batch is required.",
    );
  const ids = new Set(added.map((i) => i.id));
  const previous = {
    ...state,
    dataset: { ...state.dataset, version: source.datasetVersion },
    images: state.images.map((i) =>
      ids.has(i.id) ? { ...i, labelId: null, split: null } : i,
    ),
  };
  const baseline = prepareBaseline(previous, source);
  if (
    baseline.excluded ||
    baseline.validation.length !== source.validationCount
  )
    throw new ReviewError(
      "The full recorded validation cohort must be independent and unchanged.",
    );
  // Revalidate the saved approval provenance and protected copy groups using the promotion policy.
  preparePromotion(
    previous,
    source,
    added.map((i) => ({
      imageId: i.id,
      proposedLabelId: i.review!.proposedLabelId,
      confidence: i.review!.confidence,
      margin: i.review!.margin,
      entropy: i.review!.entropy,
    })),
    Object.fromEntries(
      added.map((i) => [
        i.id,
        { kind: "approve" as const, labelId: i.labelId! },
      ]),
    ),
    added[0].review!.order,
    added[0].review!.approvedAt,
  );
  const expanded = selectExamples(
    state.images,
    state.labels,
    source.labelIds,
    null,
    state.dataset.seed,
  );
  const expected = new Set([...baseline.train, ...added].map((i) => i.id));
  if (
    expanded.train.length !== expected.size ||
    expanded.train.some((i) => !expected.has(i.id))
  )
    throw new ReviewError("The expanded training cohort changed.");
  return {
    ...baseline,
    expandedTrain: expanded.train,
    expandedLabels: expanded.trainLabels,
    added,
    datasetId: state.dataset.id,
    datasetVersion: state.dataset.version,
  };
}
export type LearningRoundPlan = ReturnType<typeof prepareLearningRound>;

/** Both heads learn afresh using shared features and the source seed/settings. No persistence. */
export async function runLearningRound(
  plan: LearningRoundPlan,
  vectors: ReadonlyMap<string, Float32Array>,
  source: ModelRecord,
  options: {
    signal?: AbortSignal;
    yieldBetweenEpochs?: () => Promise<void>;
    onEpoch?: (arm: "control" | "expanded", epoch: number) => void;
  } = {},
) {
  if (options.signal?.aborted) throw new CancelledError();
  const vector = (i: ImageRecord) => {
    const x = vectors.get(i.id);
    if (
      i.split === "test" ||
      !x ||
      x.length !== source.dims ||
      !x.every(Number.isFinite)
    )
      throw new ReviewError(
        "Invalid or protected round features; no comparison produced.",
      );
    return x;
  };
  const validationX = plan.validation.map(vector);
  const train = plan.expandedTrain;
  const data = {
    trainX: plan.train.map(vector),
    trainY: plan.trainLabels,
    validationX,
    validationY: plan.truth,
    classes: source.labelIds.length,
    dims: source.dims,
  };
  const expandedX = train.map(vector),
    expandedY = plan.expandedLabels;
  if (expandedY.some((y) => y < 0))
    throw new ReviewError("Unknown training class.");
  const savedSource = evaluate(toSoftmax(source), validationX, plan.truth);
  const control = await runTraining(data, source.settings, {
    ...options,
    onEpoch: (row) => options.onEpoch?.("control", row.epoch),
  });
  if (control.stoppedEarly || options.signal?.aborted)
    throw new CancelledError();
  const expanded = await runTraining(
    { ...data, trainX: expandedX, trainY: expandedY },
    source.settings,
    { ...options, onEpoch: (row) => options.onEpoch?.("expanded", row.epoch) },
  );
  if (expanded.stoppedEarly || options.signal?.aborted)
    throw new CancelledError();
  return { savedSource, control, expanded };
}
export type LearningRound = Awaited<ReturnType<typeof runLearningRound>>;
