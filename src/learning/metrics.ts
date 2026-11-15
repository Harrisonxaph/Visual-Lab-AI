export interface ClassMetrics {
  /** Number of photos whose actual label is this class. */
  support: number;
  /** Number of photos predicted as this class. */
  predicted: number;
  truePositive: number;
  falsePositive: number;
  falseNegative: number;
  /** Null when no photos were predicted as this class. */
  precision: number | null;
  /** Null when there are no actual photos of this class. */
  recall: number | null;
}

export interface ClassificationMetrics {
  total: number;
  correct: number;
  /** Null for an empty evaluation. */
  accuracy: number | null;
  /** Rows are actual labels; columns are predicted labels, in class order. */
  confusion: number[][];
  perClass: ClassMetrics[];
}

/**
 * Counts predictions against known labels. These are measured results, not confidence.
 * A missing denominator is null rather than zero or a fabricated perfect score.
 * This function does not select images or establish dataset independence.
 */
export function classificationMetrics(
  truth: readonly number[],
  predicted: readonly number[],
  classes: number,
): ClassificationMetrics {
  if (!Number.isInteger(classes) || classes < 1)
    throw new Error("Invalid class count.");
  if (truth.length !== predicted.length)
    throw new Error("Truth and predictions must have the same length.");
  const valid = (k: number) => Number.isInteger(k) && k >= 0 && k < classes;
  if (!truth.every(valid) || !predicted.every(valid))
    throw new Error("Invalid class index.");

  const confusion = Array.from({ length: classes }, () =>
    Array<number>(classes).fill(0),
  );
  truth.forEach((actual, i) => confusion[actual][predicted[i]]++);
  const perClass = confusion.map((row, k) => {
    const support = row.reduce((a, b) => a + b, 0);
    const count = confusion.reduce((n, r) => n + r[k], 0);
    const truePositive = row[k];
    return {
      support,
      predicted: count,
      truePositive,
      falsePositive: count - truePositive,
      falseNegative: support - truePositive,
      precision: count ? truePositive / count : null,
      recall: support ? truePositive / support : null,
    };
  });
  const correct = perClass.reduce((n, c) => n + c.truePositive, 0);
  return {
    total: truth.length,
    correct,
    accuracy: truth.length ? correct / truth.length : null,
    confusion,
    perClass,
  };
}
