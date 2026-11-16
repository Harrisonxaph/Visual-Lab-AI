import { BaselineError } from "./nearest-neighbour";
import { relatedGroups } from "../datasets/splits";
import type { DatasetState } from "../datasets/service";
import {
  prepareReviewPool,
  ReviewError,
  type ReviewScore,
  type ReviewDecisions,
  type ReviewOrder,
} from "./active-review";
import type { ModelRecord } from "./types";

/** Build a training-only change from current transaction metadata. Never recompute splits. */
export function preparePromotion(
  state: DatasetState,
  source: ModelRecord,
  scores: readonly ReviewScore[],
  decisions: ReviewDecisions,
  order: ReviewOrder,
  approvedAt: string,
) {
  let eligible: Set<string>;
  try {
    eligible = new Set(
      prepareReviewPool(state, source).images.map((i) => i.id),
    );
  } catch (error) {
    if (error instanceof BaselineError) throw new ReviewError(error.message);
    throw error;
  }
  if (
    !Number.isFinite(Date.parse(approvedAt)) ||
    !["random", "uncertainty"].includes(order)
  )
    throw new ReviewError("Invalid review provenance; nothing saved.");
  // A pool-only bridge must not connect an approved photo to a protected cohort.
  const protectedIds = new Set(
    state.images
      .filter((i) => i.labelId !== null || i.split !== null)
      .map((i) => i.id),
  );
  for (const group of relatedGroups(state.images))
    if (group.some((id) => protectedIds.has(id)))
      for (const id of group) eligible.delete(id);
  const approved = Object.entries(decisions).filter(
    ([, d]) => d.kind === "approve",
  );
  if (!approved.length || approved.length > 50)
    throw new ReviewError(
      "Approve at least one eligible photo before committing.",
    );
  const images = approved.map(([id, decision]) => {
    const image = state.images.find((i) => i.id === id);
    const score = scores.find((s) => s.imageId === id);
    if (
      !image ||
      !eligible.has(id) ||
      !score ||
      decision.kind !== "approve" ||
      !source.labelIds.includes(decision.labelId) ||
      !source.labelIds.includes(score.proposedLabelId) ||
      ![score.confidence, score.margin, score.entropy].every(Number.isFinite)
    )
      throw new ReviewError(
        "The review source, photo or label changed, or a photo is linked to protected data; nothing saved. Score again.",
      );
    return {
      ...image,
      labelId: decision.labelId,
      split: "train" as const,
      review: {
        sourceModelId: source.id,
        sourceDatasetVersion: source.datasetVersion,
        encoderKey: source.encoderKey,
        proposedLabelId: score.proposedLabelId,
        approvedLabelId: decision.labelId,
        approvedAt,
        order,
        seed: source.settings.seed,
        confidence: score.confidence,
        margin: score.margin,
        entropy: score.entropy,
      },
    };
  });
  return {
    dataset: { ...state.dataset, version: state.dataset.version + 1 },
    images,
  };
}
