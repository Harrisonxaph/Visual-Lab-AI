import { runCapacityComparison } from "../learning/lessons";
import { drawEpochChart } from "./training-chart";

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text = "") => {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
};
/** Isolated numeric experiment, no dataset/encoder/camera/storage dependencies. */
export function mountNonlinearLesson(
  root: HTMLElement,
  onRunning: (running: boolean) => void,
) {
  root.id = "capacity-lesson";
  let running = false,
    blocked = false,
    discard = false;
  let abort: AbortController | null = null;
  const start = el("button", "Compare linear model and tiny neural network");
  start.className = "button primary";
  start.type = "button";
  start.dataset.testid = "capacity-run";
  const stop = el("button", "Cancel comparison");
  stop.className = "button stop";
  stop.type = "button";
  stop.dataset.testid = "capacity-cancel";
  const controls = el("div");
  controls.className = "ds-row";
  controls.append(start, stop);
  const status = el(
    "p",
    "Run to measure both methods on the same numeric task.",
  );
  status.id = "capacity-status";
  status.setAttribute("role", "status");
  const result = el("p");
  result.dataset.testid = "capacity-result";
  const loss = el("canvas"),
    accuracy = el("canvas"),
    charts = el("div");
  charts.className = "tr-charts";
  charts.hidden = true;
  charts.append(loss, accuracy);
  root.append(
    el("h3", "Why add a hidden layer?"),
    el(
      "p",
      "Both methods receive the same 48 training and 80 separate validation numeric examples: matching signs form one class, opposite signs the other. Softmax regression has a straight boundary (6 parameters). The network has 2 inputs, 8 tanh hidden units and 2 softmax outputs (42 parameters). A hidden unit learns a nonlinear combination of the inputs; backpropagation carries the error through both layers.",
    ),
    el(
      "p",
      "Both start from seeded random weights and train with mini-batch SGD: seed 42, learning rate 0.5, batch size 16, 100 epochs, no L2 penalty. Their initialisation scales differ: small normal weights for softmax, Xavier uniform weights for the network. Equal epochs are not equal compute. These fixed teaching settings were chosen for this task, not selected using your data.",
    ),
    controls,
    status,
    result,
    charts,
    el(
      "p",
      "Synthetic numeric task only: no camera, photos, encoder or test split. Nothing is saved or uploaded. Both network layers learn from scratch; no pretrained model is fine-tuned. This illustrates capacity, not proof the network is generally better. For photo-model comparisons and model-file export/reload, use the saved-run controls above. This numeric lesson does not produce photo models.",
    ),
  );
  function sync() {
    start.disabled = blocked || running;
    stop.disabled = !running;
  }
  function cancel(leaving = false) {
    if (!running) return;
    discard = leaving;
    abort?.abort();
    result.textContent = "";
    charts.hidden = true;
    status.textContent = leaving
      ? "Stopped when leaving; no complete comparison published."
      : "Cancelled; no complete comparison published.";
  }
  start.addEventListener(
    "click",
    () =>
      void (async () => {
        if (running || blocked) return;
        running = true;
        discard = false;
        abort = new AbortController();
        result.textContent = "";
        for (const key of Object.keys(result.dataset))
          if (key !== "testid") delete result.dataset[key];
        charts.hidden = true;
        sync();
        onRunning(true);
        try {
          const comparison = await runCapacityComparison({
            signal: abort.signal,
            onEpoch: (method, row) => {
              if (!discard && !abort?.signal.aborted)
                status.textContent = `Training ${method === "linear" ? "linear classifier" : "hidden-layer network"}: epoch ${row.epoch} / 100.`;
            },
          });
          if (!comparison.complete || discard) return;
          const network = comparison.network!,
            a = comparison.linear.history.at(-1)!,
            b = network.history.at(-1)!;
          const series = (
            key:
              | "trainLoss"
              | "validationLoss"
              | "trainAccuracy"
              | "validationAccuracy",
          ) => {
            const training = key.startsWith("train");
            return [
              {
                name: `linear ${training ? "training" : "validation"}`,
                color: "#4e7d30",
                dashed: !training,
                values: comparison.linear.history.map((row) => row[key]),
              },
              {
                name: `network ${training ? "training" : "validation"}`,
                color: "#2f6fb0",
                dashed: !training,
                values: network.history.map((row) => row[key]),
              },
            ];
          };
          charts.hidden = false;
          drawEpochChart(
            loss,
            [...series("trainLoss"), ...series("validationLoss")],
            { title: "Same-task prediction cross-entropy" },
          );
          drawEpochChart(
            accuracy,
            [...series("trainAccuracy"), ...series("validationAccuracy")],
            { title: "Same-task accuracy", percent: true, yMax: 1 },
          );
          const pct = (v: number | null) => `${((v ?? 0) * 100).toFixed(1)}%`;
          Object.assign(result.dataset, {
            linearAccuracy: String(a.validationAccuracy),
            networkAccuracy: String(b.validationAccuracy),
          });
          result.textContent = `Completed both methods: 100 epochs each. Linear training / validation accuracy: ${pct(a.trainAccuracy)} / ${pct(a.validationAccuracy)}; network: ${pct(b.trainAccuracy)} / ${pct(b.validationAccuracy)}. Validation loss: linear ${a.validationLoss!.toFixed(3)}, network ${b.validationLoss!.toFixed(3)} (network before training ${network.history[0].validationLoss!.toFixed(3)}). Both network weight matrices changed: mean absolute input-layer change ${network.evidence.inputMeanAbsChange.toExponential(2)}, output-layer change ${network.evidence.outputMeanAbsChange.toExponential(2)}. All 42 weights and biases were trainable. These measured results describe this fixed task only.`;
          status.textContent =
            "Completed synthetic comparison. Validation examples were checked, never used for gradient updates.";
        } catch {
          if (!discard)
            status.textContent =
              "The numeric comparison could not finish. No model or dataset was saved.";
        } finally {
          running = false;
          abort = null;
          sync();
          onRunning(false);
        }
      })(),
  );
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancel(true);
  });
  stop.addEventListener("click", () => cancel());
  window.addEventListener("pagehide", () => cancel(true));
  sync();
  return {
    cancel,
    setBlocked(value: boolean) {
      blocked = value;
      if (value) cancel(true);
      sync();
    },
  };
}
