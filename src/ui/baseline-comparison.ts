import { classificationMetrics } from "../learning/metrics";
import type { NeighbourResult } from "../learning/nearest-neighbour";
import type { Evaluation } from "../learning/softmax";
import type { ModelRecord } from "../learning/types";
import { classificationMetricsPanel } from "./classification-metrics";

export interface BaselineComparison {
  record: ModelRecord;
  truth: number[];
  classifier: Evaluation;
  neighbour: NeighbourResult;
  trainCount: number;
  excluded: number;
}
const paragraph = (text: string) => {
  const p = document.createElement("p");
  p.textContent = text;
  return p;
};

/** Two methods, exactly the same validation labels/features. Distances are never confidence. */
export function baselineComparisonPanel(
  result: BaselineComparison,
  finalOpened: boolean,
) {
  const { record, truth, classifier, neighbour } = result;
  const section = document.createElement("div");
  section.id = "tr-baseline-result";
  section.dataset.trainingCount = String(result.trainCount);
  section.dataset.neighbourPredictions = neighbour.predicted.join(",");
  const a = classificationMetrics(
      truth,
      classifier.predicted,
      record.labelIds.length,
    ),
    b = classificationMetrics(
      truth,
      neighbour.predicted,
      record.labelIds.length,
    );
  section.append(
    paragraph(
      `Both methods used the same ${result.trainCount} capped training examples and ${truth.length} independent validation examples from dataset version ${record.datasetVersion}. ${result.excluded} validation examples were excluded by the existing training-copy check for both methods.`,
    ),
    paragraph(
      `Saved softmax: ${a.correct} / ${a.total} correct. 1-nearest neighbour: ${b.correct} / ${b.total} correct. These are measured validation results, not a final test or proof that either method is generally better.`,
    ),
    paragraph(
      `Saved softmax training progress (${record.history.at(-1)?.epoch ?? 0} / ${record.settings.epochs} epochs${record.stoppedEarly ? ", stopped early" : ""}). Softmax training is the parameter-learning method; 1-nearest neighbour updates no weights: it assigns the label of the closest training embedding. Both use the same frozen image encoder and share the current validation embeddings. Recomputed features may differ slightly across devices or runtimes.`,
    ),
    paragraph(
      "Distance is not confidence or accuracy. The rule is one neighbour, squared L2 distance, with exact ties choosing the first example in recorded training order. Hard 1-NN labels have no probability-based cross-entropy or confidence score here.",
    ),
    classificationMetricsPanel(record.labelNames, truth, classifier.predicted, {
      id: "tr-baseline-classifier",
      title: "Saved classifier — shared validation",
    }),
    classificationMetricsPanel(record.labelNames, truth, neighbour.predicted, {
      id: "tr-baseline-neighbour",
      title: "1-nearest neighbour — shared validation",
    }),
    paragraph(
      "No weights changed and no new model was saved by this comparison. Results stay in page memory; reload, dataset edits or deleting the source model clears them. Rerun with the same snapshot, cap and training order to repeat. Small samples, near-copies missed by screening and repeated validation tuning can mislead.",
    ),
  );
  if (finalOpened)
    section.append(
      paragraph(
        "A final test has already been opened for this dataset. This exploratory validation comparison cannot create a fresh independent final claim using those same test images.",
      ),
    );
  return section;
}
