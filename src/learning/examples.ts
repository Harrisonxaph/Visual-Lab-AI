import { stableHash } from "../datasets/hash";
import type { ImageRecord, LabelRecord } from "../datasets/types";

export class SealedTestError extends Error {
  constructor() {
    super(
      "Test photos are sealed: they are kept for a final check in a later lab and are never used for training or progress checks here.",
    );
  }
}

/** Refuses any test-split photo. Called before photos are embedded or evaluated. */
export function assertNoTestImages(
  images: readonly Pick<ImageRecord, "split">[],
) {
  if (images.some((i) => i.split === "test")) throw new SealedTestError();
}

export interface ExampleSelection {
  /** Class order: class k is classes[k]. */
  classes: Pick<LabelRecord, "id" | "name">[];
  train: ImageRecord[];
  trainLabels: number[];
  validation: ImageRecord[];
  validationLabels: number[];
  /** Reasons training cannot start; empty when it can. */
  problems: string[];
}

/**
 * Chooses the photos for one training run: training-split photos of the chosen labels (at most
 * `perLabelCap` per label, picked by a seeded hash so the same dataset gives the same subset)
 * and every validation-split photo of those labels. Test photos are never included.
 */
export function selectExamples(
  images: readonly ImageRecord[],
  labels: readonly LabelRecord[],
  chosenLabelIds: readonly string[],
  perLabelCap: number | null,
  seed: number,
): ExampleSelection {
  // Class order follows chosenLabelIds, so a saved model's rows line up with its labels.
  const classes = chosenLabelIds.flatMap((id) => {
    const l = labels.find((x) => x.id === id);
    return l ? [{ id: l.id, name: l.name }] : [];
  });
  const problems: string[] = [];
  if (classes.length < 2) problems.push("Choose at least two labels.");
  const train: ImageRecord[] = [];
  const trainLabels: number[] = [];
  const validation: ImageRecord[] = [];
  const validationLabels: number[] = [];
  classes.forEach((c, k) => {
    let mine = images.filter((i) => i.labelId === c.id && i.split === "train");
    if (!mine.length)
      problems.push(
        `“${c.name}” has no training photos. Add photos or leave it out.`,
      );
    if (perLabelCap !== null && mine.length > perLabelCap)
      mine = [...mine]
        .sort(
          (a, b) =>
            stableHash(`${seed}:${a.id}`) - stableHash(`${seed}:${b.id}`) ||
            a.order - b.order,
        )
        .slice(0, perLabelCap)
        .sort((a, b) => a.order - b.order);
    train.push(...mine);
    trainLabels.push(...mine.map(() => k));
    const check = images.filter(
      (i) => i.labelId === c.id && i.split === "validation",
    );
    validation.push(...check);
    validationLabels.push(...check.map(() => k));
  });
  assertNoTestImages([...train, ...validation]);
  return {
    classes,
    train,
    trainLabels,
    validation,
    validationLabels,
    problems,
  };
}
