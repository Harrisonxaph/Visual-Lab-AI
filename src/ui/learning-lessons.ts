import {
  createLesson,
  LESSON_IDS,
  runLesson,
  type LessonId,
} from "../learning/lessons";
import type { EpochRecord } from "../learning/types";
import { drawEpochChart } from "./training-chart";
import { mountNonlinearLesson } from "./nonlinear-lesson";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = "") {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}

/** Isolated, bounded numeric training: no camera, encoder, database or saved-model access. */
export function mountLearningLessons(
  root: HTMLElement,
  options: { onRunning: (running: boolean) => void },
) {
  let running = false,
    blocked = false,
    discarded = false;
  let abort: AbortController | null = null;
  let comparisonRunning = false;
  let comparison: ReturnType<typeof mountNonlinearLesson> | null = null;
  const select = el("select");
  select.id = "lesson-scenario";
  select.setAttribute("aria-label", "Synthetic learning lesson");
  for (const id of LESSON_IDS) {
    const option = el("option", createLesson(id).title);
    option.value = id;
    select.append(option);
  }
  const explanation = el("p", createLesson("learnable").explanation);
  explanation.className = "ds-help";
  const run = el("button", "Run synthetic lesson");
  run.type = "button";
  run.className = "button primary";
  run.dataset.testid = "lesson-run";
  const stop = el("button", "Cancel lesson");
  stop.type = "button";
  stop.className = "button stop";
  stop.dataset.testid = "lesson-cancel";
  const controls = el("div");
  controls.className = "ds-row";
  controls.append(select, run, stop);
  const status = el(
    "p",
    "Choose a task, then run the real optimiser and watch its measured curves.",
  );
  status.id = "lesson-status";
  status.setAttribute("role", "status");
  const output = el("div");
  output.hidden = true;
  const summary = el("p");
  summary.dataset.testid = "lesson-summary";
  const details = el("p");
  details.className = "ds-help";
  const loss = el("canvas");
  loss.id = "lesson-loss-chart";
  const accuracy = el("canvas");
  accuracy.id = "lesson-accuracy-chart";
  const charts = el("div");
  charts.className = "tr-charts";
  charts.append(loss, accuracy);
  output.append(summary, details, charts);
  root.replaceChildren(
    el("h2", "Learning patterns — controlled lessons"),
    el(
      "p",
      "Synthetic numeric features: no camera, photos or pretrained encoder. The single-model lessons use the same softmax optimiser as photo training. Weights really change. Nothing here is saved or uploaded.",
    ),
    controls,
    explanation,
    status,
    output,
    el(
      "p",
      "Each lesson deliberately uses a different task. Do not rank learning methods by comparing these scores. On your own photos, curves are clues rather than a diagnosis: check labels, sample size, leakage and variability. These lessons do not access your test photos.",
    ),
  );
  const sync = () => {
    select.disabled = run.disabled = blocked || running || comparisonRunning;
    stop.disabled = !running;
    comparison?.setBlocked(blocked || running);
  };
  const draw = (history: EpochRecord[]) => {
    const series = (
      train: "trainLoss" | "trainAccuracy",
      validation: "validationLoss" | "validationAccuracy",
    ) => [
      {
        name: "training",
        color: "#4e7d30",
        values: history.map((r) => r[train]),
      },
      {
        name: "validation",
        color: "#2f6fb0",
        dashed: true,
        values: history.map((r) => r[validation]),
      },
    ];
    drawEpochChart(loss, series("trainLoss", "validationLoss"), {
      title: "Synthetic loss",
    });
    drawEpochChart(accuracy, series("trainAccuracy", "validationAccuracy"), {
      title: "Synthetic accuracy",
      percent: true,
      yMax: 1,
    });
  };
  function cancel(discard = false) {
    comparison?.cancel(discard);
    if (!running) return;
    if (discard) {
      discarded = true;
      summary.textContent = "";
      output.hidden = true;
      status.textContent =
        "Stopped when leaving the lesson; no completed result was published.";
    }
    abort?.abort();
  }
  async function start() {
    if (running || blocked || comparisonRunning) return;
    running = true;
    discarded = false;
    abort = new AbortController();
    const id = select.value as LessonId;
    const lesson = createLesson(id);
    explanation.textContent = lesson.explanation;
    summary.textContent = "";
    for (const key of Object.keys(summary.dataset))
      if (key !== "testid") delete summary.dataset[key];
    details.textContent = `${lesson.data.trainX.length} training and ${lesson.data.validationX.length} validation numeric examples, ${lesson.data.dims} features; seed ${lesson.settings.seed}, learning rate ${lesson.settings.learningRate}.`;
    output.hidden = false;
    options.onRunning(true);
    sync();
    const history: EpochRecord[] = [];
    let lastPaint = -Infinity;
    try {
      const { run: trained } = await runLesson(id, {
        signal: abort.signal,
        onEpoch: (row) => {
          history.push(row);
          if (discarded) return;
          status.dataset.epoch = String(row.epoch);
          const now = performance.now();
          if (row.epoch && now - lastPaint < 100) return;
          lastPaint = now;
          status.textContent = `Synthetic lesson: epoch ${row.epoch} of ${lesson.settings.epochs}.`;
          draw(history);
        },
      });
      if (discarded) return;
      const last = trained.history.at(-1)!;
      draw(trained.history);
      Object.assign(summary.dataset, {
        trainAccuracy: String(last.trainAccuracy),
        validationAccuracy: String(last.validationAccuracy),
        stoppedEarly: String(trained.stoppedEarly),
        epochs: String(last.epoch),
      });
      summary.textContent = `${trained.stoppedEarly ? "Stopped early" : "Completed"} after ${last.epoch} epochs. Training accuracy ${(last.trainAccuracy * 100).toFixed(1)}%; validation accuracy ${((last.validationAccuracy ?? 0) * 100).toFixed(1)}%. Mean parameter change ${trained.evidence.meanAbsChange.toExponential(2)}.`;
      status.textContent = trained.stoppedEarly
        ? "Partial numeric results only; the full lesson was not completed."
        : "Synthetic lesson completed. These measurements describe this controlled task, not real-image accuracy.";
    } catch {
      if (!discarded)
        status.textContent =
          "The numeric lesson could not finish. No model or dataset was saved.";
    } finally {
      running = false;
      abort = null;
      sync();
      options.onRunning(false);
    }
  }
  run.addEventListener("click", () => void start());
  stop.addEventListener("click", () => cancel());
  select.addEventListener("change", () => {
    explanation.textContent = createLesson(
      select.value as LessonId,
    ).explanation;
    summary.textContent = "";
    output.hidden = true;
    status.textContent = "Choose Run to start this numeric lesson.";
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancel(true);
  });
  window.addEventListener("pagehide", () => cancel(true));
  const comparisonRoot = el("section");
  root.append(comparisonRoot);
  comparison = mountNonlinearLesson(comparisonRoot, (value) => {
    comparisonRunning = value;
    sync();
    options.onRunning(value);
  });
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
