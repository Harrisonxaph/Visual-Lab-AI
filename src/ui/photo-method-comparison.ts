import type { MethodRun } from "../learning/method-comparison";
import type { ModelRecord } from "../learning/types";
import { classificationMetricsPanel } from "./classification-metrics";
import { drawEpochChart } from "./training-chart";

export interface PhotoMethodComparison {
  record: ModelRecord;
  run: MethodRun;
  truth: number[];
  trainCount: number;
  excluded: number;
}
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text = "") => {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
};
/** Page-memory results only; no inference, storage or test-set reads in presentation. */
export function photoMethodComparisonPanel(
  result: PhotoMethodComparison,
  finalOpened: boolean,
) {
  const { record, run, truth } = result;
  const section = el("div");
  section.id = "tr-methods-result";
  const a = run.linear.history.at(-1)!,
    b = run.network.history.at(-1)!;
  const measurements = el("p");
  measurements.dataset.testid = "methods-measurements";
  measurements.textContent = `Both freshly trained models completed ${record.settings.epochs} epochs. Prediction cross-entropy: linear training ${a.trainLoss.toFixed(4)}, validation ${a.validationLoss!.toFixed(4)}; network training ${b.trainLoss.toFixed(4)}, validation ${b.validationLoss!.toFixed(4)}. Network before training: validation loss ${run.network.history[0].validationLoss!.toFixed(4)}, accuracy ${(run.network.history[0].validationAccuracy! * 100).toFixed(1)}%. Network input-layer mean weight change ${run.network.evidence.inputMeanAbsChange.toExponential(3)}; output-layer ${run.network.evidence.outputMeanAbsChange.toExponential(3)}.`;
  section.append(
    el(
      "h3",
      "Fresh linear vs hidden-layer training — shared frozen image features",
    ),
    el(
      "p",
      `Source ${record.name}, dataset version ${record.datasetVersion}: ${result.trainCount} training and ${truth.length} independent validation photos, with ${result.excluded} validation copies excluded for both. The source saved model supplies the exact snapshot, ordered capped training examples and configuration; its weights and recorded scores are not used as either result. Both methods are freshly trained on the same current embeddings. No test photos are opened.`,
    ),
    el(
      "p",
      `Fixed comparison: seed ${record.settings.seed}, learning rate ${record.settings.learningRate}, batch size ${record.settings.batchSize}, ${record.settings.epochs} epochs, L2 strength ${record.settings.l2 ?? 0}. Softmax has ${run.linear.evidence.count} trainable parameters. The network has ${record.dims} inputs, 8 tanh hidden units, ${record.labelIds.length} outputs and ${run.network.evidence.count} trainable parameters. Both network layers start random and learn; the pretrained encoder stays frozen. Softmax uses small normal initial weights, the network Xavier uniform; biases start zero. Equal epochs are not equal compute.`,
    ),
    measurements,
    el(
      "p",
      "All displayed losses are prediction cross-entropy. L2 penalises each method's weight matrices, not biases. Different architectures define different penalised objectives: compare shared validation predictions instead. Confidence is not accuracy. This run does not establish that either method is generally better.",
    ),
    classificationMetricsPanel(
      record.labelNames,
      truth,
      run.linear.after!.predicted,
      { id: "tr-methods-linear", title: "Fresh softmax — shared validation" },
    ),
    classificationMetricsPanel(
      record.labelNames,
      truth,
      run.networkEvaluation.predicted,
      {
        id: "tr-methods-network",
        title: "Fresh hidden-layer network — shared validation",
      },
    ),
  );
  const charts = el("div"),
    loss = el("canvas"),
    accuracy = el("canvas");
  charts.className = "tr-charts";
  charts.append(loss, accuracy);
  section.append(
    charts,
    el(
      "p",
      "Results and both newly trained models are temporary page memory. The saved source model and final-test locks are unchanged; missing train/validation features may be cached locally. Reload, relevant dataset edits or deleting the source clears this result. No network save/reload or neural-network final-test path is offered yet. Repeat on the same source and features to reproduce; recomputed embeddings may differ across runtimes. Repeated validation tuning and small samples can mislead.",
    ),
  );
  if (finalOpened)
    section.append(
      el(
        "p",
        "A final test has already been opened for this dataset. Comparing methods cannot make those images an untouched final test again; obtain fresh held-out data for a new independent final claim.",
      ),
    );
  queueMicrotask(() => {
    if (!section.isConnected) return;
    const series = (
      training: "trainLoss" | "trainAccuracy",
      validation: "validationLoss" | "validationAccuracy",
    ) => [
      {
        name: "linear training",
        color: "#4e7d30",
        values: run.linear.history.map((row) => row[training]),
      },
      {
        name: "linear validation",
        color: "#4e7d30",
        dashed: true,
        values: run.linear.history.map((row) => row[validation]),
      },
      {
        name: "network training",
        color: "#2f6fb0",
        values: run.network.history.map((row) => row[training]),
      },
      {
        name: "network validation",
        color: "#2f6fb0",
        dashed: true,
        values: run.network.history.map((row) => row[validation]),
      },
    ];
    drawEpochChart(loss, series("trainLoss", "validationLoss"), {
      title: "Shared-feature prediction cross-entropy",
    });
    drawEpochChart(accuracy, series("trainAccuracy", "validationAccuracy"), {
      title: "Shared-feature accuracy",
      percent: true,
      yMax: 1,
    });
  });
  return section;
}
