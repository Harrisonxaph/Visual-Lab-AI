import type { DatasetState } from "../datasets/service";
import type { ImageRecord } from "../datasets/types";
import { hammingDistance, stableHash } from "../datasets/hash";
import { NEAR_DUPLICATE_MAX_DISTANCE } from "../datasets/limits";
import { relatedGroups } from "../datasets/splits";
import { prepareBaseline } from "./nearest-neighbour";
import { predict } from "./softmax";
import { toSoftmax } from "./models";
import type { ModelRecord } from "./types";

export class ReviewError extends Error {}
export type ReviewOrder = "uncertainty" | "random";
export interface ReviewScore {
  imageId: string;
  proposedLabelId: string;
  confidence: number;
  margin: number;
  entropy: number;
}
export type ReviewDecision =
  | { kind: "approve"; labelId: string }
  | { kind: "skip" };
export type ReviewDecisions = Record<string, ReviewDecision>;
const isPool = (i: ImageRecord) => i.labelId === null && i.split === null;

/** Strict current source snapshot in this first slice. Never repurpose a labelled split as a pool.
 * Hash screening is conservative, ignoring manual 'not related' overrides for protected data. */
export function prepareReviewPool(state: DatasetState, model: ModelRecord) {
  if (
    model.stoppedEarly ||
    model.history.at(-1)?.epoch !== model.settings.epochs
  )
    throw new ReviewError("Choose a completed saved classifier for review.");
  prepareBaseline(state, model);
  if (
    state.images.some(
      (i) => typeof i.dhash !== "string" || !/^[0-9a-f]{16}$/.test(i.dhash),
    )
  )
    throw new ReviewError(
      "Image fingerprints are invalid; repair the dataset before review.",
    );
  const pool = state.images
    .filter(isPool)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const protectedImages = state.images.filter((i) => !isPool(i));
  const eligible = pool.filter(
    (i) =>
      !protectedImages.some(
        (p) =>
          i.id === p.id ||
          i.sha256 === p.sha256 ||
          hammingDistance(i.dhash, p.dhash) <= NEAR_DUPLICATE_MAX_DISTANCE,
      ),
  );
  const groups = relatedGroups(eligible);
  const representatives = new Set(groups.map((group) => group[0]));
  const unique = eligible.filter((i) => representatives.has(i.id));
  if (!unique.length)
    throw new ReviewError(
      "No eligible unlabelled photos remain. Import unlabelled photos before training/saving this snapshot; known protected copies are excluded.",
    );
  return {
    images: unique.slice(0, 50),
    total: pool.length,
    excluded: pool.length - unique.length,
    deferred: Math.max(0, unique.length - 50),
  };
}
/** Real softmax head outputs. Confidence/margin/entropy are not measured accuracy. No optimisation. */
export function scoreReviewPool(
  images: readonly ImageRecord[],
  vectors: ReadonlyMap<string, Float32Array>,
  source: ModelRecord,
): ReviewScore[] {
  if (images.length > 50 || images.some((i) => !isPool(i)))
    throw new ReviewError(
      "Only a bounded unlabelled, unsplit pool can be scored.",
    );
  const model = toSoftmax(source);
  return images.map((image) => {
    const vector = vectors.get(image.id);
    if (
      !vector ||
      vector.length !== source.dims ||
      !vector.every(Number.isFinite)
    )
      throw new ReviewError(
        "Features are invalid; no review ranking was produced.",
      );
    const probabilities = predict(model, vector);
    if (!probabilities.every(Number.isFinite))
      throw new ReviewError("The classifier returned invalid probabilities.");
    const order = Array.from(probabilities, (_, k) => k).sort(
      (a, b) => probabilities[b] - probabilities[a] || a - b,
    );
    return {
      imageId: image.id,
      proposedLabelId: source.labelIds[order[0]],
      confidence: probabilities[order[0]],
      margin: probabilities[order[0]] - probabilities[order[1]],
      entropy: probabilities.reduce(
        (sum, p) => sum - (p > 0 ? p * Math.log(p) : 0),
        0,
      ),
    };
  });
}
export function orderReview(
  scores: readonly ReviewScore[],
  mode: ReviewOrder,
  seed: number,
): ReviewScore[] {
  return [...scores].sort(
    (a, b) =>
      (mode === "uncertainty"
        ? a.margin - b.margin
        : stableHash(`${seed}:${a.imageId}`) -
          stableHash(`${seed}:${b.imageId}`)) ||
      a.imageId.localeCompare(b.imageId),
  );
}
/** Page-memory decisions only. No dataset/split, storage, training or evaluation side effects. */
export function setReviewDecision(
  current: ReviewDecisions,
  scores: readonly ReviewScore[],
  labelIds: readonly string[],
  imageId: string,
  decision: ReviewDecision,
): ReviewDecisions {
  if (
    !scores.some((s) => s.imageId === imageId) ||
    (decision.kind !== "skip" &&
      (decision.kind !== "approve" || !labelIds.includes(decision.labelId)))
  )
    throw new ReviewError(
      "Choose an eligible review image and an existing model label.",
    );
  return { ...current, [imageId]: { ...decision } };
}
