import {
  prepareMethodComparison,
  runMethodComparison,
  type MethodRun,
} from "../learning/method-comparison";
import {
  photoMethodComparisonPanel,
  type PhotoMethodComparison,
} from "./photo-method-comparison";
import {
  BaselineError,
  nearestNeighbour,
  prepareBaseline,
} from "../learning/nearest-neighbour";
import {
  baselineComparisonPanel,
  type BaselineComparison,
} from "./baseline-comparison";
import {
  FinalCheckError,
  prepareFinalPlan,
  fingerprintModel,
  runFinalCheck,
  type FinalCheckRecord,
} from "../learning/final-evaluation";
import { StorageError } from "../datasets/db";
import { DatasetService, UserError } from "../datasets/service";
import type { ImageRecord } from "../datasets/types";
import { Embedder, EncoderError } from "../learning/embedder-client";
import { CancelledError, embedImages } from "../learning/embeddings";
import { ENCODER, ENCODER_KEY } from "../learning/encoder";
import {
  SealedTestError,
  selectExamples,
  type ExampleSelection,
} from "../learning/examples";
import {
  checkCompatibility,
  independentValidation,
  MAX_MODELS_PER_DATASET,
  toSoftmax,
} from "../learning/models";
import {
  evaluate,
  TrainingUnstableError,
  type Evaluation,
} from "../learning/softmax";
import {
  DEFAULT_SETTINGS,
  describeOutcome,
  runTraining,
  SETTING_RANGES,
  validateSettings,
  type TrainingRun,
} from "../learning/trainer";
import type { EpochRecord, ModelRecord } from "../learning/types";
import { drawEpochChart } from "./training-chart";
import { classificationMetricsPanel } from "./classification-metrics";
import { runComparisonPanel } from "./run-comparison";
import { RunReportError } from "../learning/run-report";
import { downloadRunReport } from "./run-report";
import { mountLearningLessons } from "./learning-lessons";
import {
  createRunManifest,
  DEFAULT_TRAINING_SEED,
  replayProblem,
  repeatSettings,
  validateSeed,
  type ComparisonMode,
} from "../learning/experiments";

class DatasetGoneError extends Error {}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> & {
    dataset?: Record<string, string>;
  } = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  const { dataset, ...rest } = props;
  Object.assign(node, rest);
  if (dataset) Object.assign(node.dataset, dataset);
  node.append(...children);
  return node;
}

const button = (
  text: string,
  onClick: () => void,
  extra: Partial<HTMLButtonElement> & { dataset?: Record<string, string> } = {},
) => {
  const b = el(
    "button",
    { type: "button", className: "button secondary", ...extra },
    text,
  );
  b.addEventListener("click", onClick);
  return b;
};

const pct = (x: number | null) =>
  x === null || Number.isNaN(x) ? "—" : `${Math.round(x * 100)}%`;
const num = (x: number | null, digits = 3) =>
  x === null || Number.isNaN(x) ? "—" : x.toFixed(digits);

const COLORS = { train: "#4e7d30", validation: "#2f6fb0" };

interface Draft {
  record: ModelRecord;
  run: TrainingRun;
  selection: ExampleSelection;
  computed: number;
  reused: number;
  saved: boolean;
}

interface Loaded {
  record: ModelRecord;
  warning: string | null;
  validation: ImageRecord[];
  labels: number[];
  evaluation: Evaluation | null;
  /** False if the model has no record of its training photos (independence unknown). */
  known: boolean;
  /** Validation photos left out because the model learned from them or a copy. */
  excluded: number;
}

/**
 * The Training lab: trains a small classifier on top of a frozen, pretrained image encoder,
 * using a dataset from the Dataset lab. Only the classifier's weights change. Photos, embeddings
 * and saved models stay in this browser on this device.
 */
export function mountTrainingLab(root: HTMLElement) {
  let service: DatasetService | null = null;
  let embedder: Embedder | null = null;
  let phase: "idle" | "embedding" | "training" | "final-test" | "baseline" =
    "idle";
  let abort: AbortController | null = null;
  let actionPending = false;
  let lessonRunning = false;
  let reportNames = false;
  let baseline: BaselineComparison | null = null;
  let methodComparison: PhotoMethodComparison | null = null;
  let baselineProgress = "";
  let finalRecord: FinalCheckRecord | null = null;
  let finalReadError = "";
  let finalModelId = "";
  let finalProgress = "";
  let chosen: Set<string> | null = null;
  let chosenFor: string | null = null;
  let learningRate = String(DEFAULT_SETTINGS.learningRate);
  let epochs = String(DEFAULT_SETTINGS.epochs);
  let cap = "";
  let trainingSeed = String(DEFAULT_TRAINING_SEED);
  let regularization = String(DEFAULT_SETTINGS.l2);
  let comparisonLeft = "";
  let comparisonRight = "";
  let comparisonMode: ComparisonMode = "same-data";
  let models: ModelRecord[] = [];
  let draft: Draft | null = null;
  let loaded: Loaded | null = null;
  let live: EpochRecord[] = [];
  let plannedEpochs = 0;
  /** Dataset the running job uses, and whether it was deleted while the job ran. */
  let jobDatasetId: string | null = null;
  let jobDatasetGone = false;
  const thumbs = new Map<string, Promise<ImageBitmap | null>>();

  root.replaceChildren(
    el(
      "div",
      { className: "page-heading" },
      el(
        "div",
        {},
        el("div", { className: "eyebrow" }, "EMBED. TRAIN. COMPARE."),
        el("h1", {}, "Train a classifier", el("span", {}, ".")),
        el(
          "p",
          {},
          "Teach a small model to tell your labels apart, using the photos in a dataset. Watch it learn, then compare its answers before and after.",
        ),
      ),
      el(
        "span",
        { className: "phase-badge" },
        "LAB 03 ",
        el("span", {}, "TRAINING"),
      ),
    ),
  );
  const status = el("p", { className: "ds-status", id: "tr-status" });
  status.setAttribute("role", "status");
  const setup = el("div", { className: "ds-body", id: "tr-setup" });

  // The progress panel is built once and updated in place, so its Cancel button stays put.
  const progressText = el("p", { id: "tr-progress-text" });
  progressText.setAttribute("aria-live", "polite");
  const lossChart = el("canvas", { id: "tr-loss-chart" });
  const accuracyChart = el("canvas", { id: "tr-accuracy-chart" });
  const cancel = button("Cancel", () => abort?.abort(), {
    className: "button stop",
    dataset: { testid: "tr-cancel" },
  });
  const progress = el(
    "section",
    { className: "panel ds-panel", id: "tr-progress", hidden: true },
    el("h2", {}, "Progress"),
    progressText,
    el("div", { className: "tr-charts" }, lossChart, accuracyChart),
    el(
      "p",
      { className: "ds-help" },
      "Loss measures how wrong the model's probabilities are (lower is better). Accuracy is the share of photos it labels correctly. Training photos are the ones it learns from; validation photos are only used to check it.",
    ),
    cancel,
  );
  const results = el("div", { className: "ds-body", id: "tr-results" });
  const saved = el("div", { className: "ds-body", id: "tr-saved" });
  const baselineSection = el("section", {
    className: "panel ds-panel",
    id: "tr-baseline",
  });
  const finalSection = el("section", {
    className: "panel ds-panel",
    id: "tr-final",
  });
  const lessonRoot = el("section", {
    className: "panel ds-panel",
    id: "tr-lessons",
  });
  root.append(
    status,
    setup,
    progress,
    results,
    saved,
    baselineSection,
    finalSection,
    lessonRoot,
    aboutPanel(),
  );

  const say = (text: string) => (status.textContent = text);
  const coreBusy = () => phase !== "idle" || actionPending;
  const busy = () => coreBusy() || lessonRunning;
  const lessons = mountLearningLessons(lessonRoot, {
    onRunning: (value) => {
      lessonRunning = value;
      if (value) renderAll();
      else void refresh();
    },
  });

  function describeError(error: unknown) {
    if (
      error instanceof BaselineError ||
      error instanceof FinalCheckError ||
      error instanceof RunReportError ||
      error instanceof UserError ||
      error instanceof StorageError ||
      error instanceof EncoderError ||
      error instanceof TrainingUnstableError ||
      error instanceof SealedTestError
    )
      return error.message;
    return "Something went wrong. Nothing from this step was saved.";
  }

  function thumbFor(id: string) {
    let t = thumbs.get(id);
    if (!t && service) {
      t = service
        .getBlob(id)
        .then((b) => (b ? createImageBitmap(b.thumb) : null))
        .catch(() => null);
      thumbs.set(id, t);
    }
    return t ?? Promise.resolve(null);
  }

  function thumbCanvas(id: string) {
    const c = el("canvas", { width: 64, height: 64 });
    c.setAttribute("aria-hidden", "true");
    void thumbFor(id).then((bm) => {
      const ctx = c.getContext("2d");
      if (!bm || !ctx) return;
      const s = Math.min(64 / bm.width, 64 / bm.height);
      ctx.drawImage(
        bm,
        (64 - bm.width * s) / 2,
        (64 - bm.height * s) / 2,
        bm.width * s,
        bm.height * s,
      );
    });
    return c;
  }

  function chosenLabels(s: DatasetService) {
    const state = s.current!;
    if (!chosen || chosenFor !== state.dataset.id) {
      chosenFor = state.dataset.id;
      chosen = new Set(
        state.labels
          .filter((l) =>
            state.images.some((i) => i.labelId === l.id && i.split === "train"),
          )
          .map((l) => l.id),
      );
    }
    const picked = chosen;
    for (const id of picked)
      if (!state.labels.some((l) => l.id === id)) picked.delete(id);
    return picked;
  }

  /** Chosen label ids in the dataset's label order. */
  const chosenIds = (s: DatasetService) => {
    const picked = chosenLabels(s);
    return s.current!.labels.filter((l) => picked.has(l.id)).map((l) => l.id);
  };

  function parsedSettings() {
    const l2 = regularization.trim() === "" ? NaN : Number(regularization);
    return {
      learningRate: Number(learningRate),
      seed: trainingSeed.trim() === "" ? NaN : Number(trainingSeed),
      epochs: Number(epochs),
      perLabelCap: cap.trim() === "" ? null : Number(cap),
      ...(l2 === 0 ? {} : { l2 }),
    };
  }

  function renderSetup() {
    const s = service;
    if (!s) {
      setup.replaceChildren();
      return;
    }
    if (!s.current) {
      setup.replaceChildren(
        el(
          "section",
          { className: "panel ds-panel", id: "tr-data" },
          el("h2", {}, "Training data"),
          el(
            "p",
            { className: "ds-help" },
            "No dataset yet. Create one in the Dataset lab (or load its example dataset), then come back here.",
          ),
        ),
      );
      return;
    }
    const state = s.current;
    const picked = chosenLabels(s);
    const select = el("select", { id: "tr-dataset", disabled: busy() });
    select.setAttribute("aria-label", "Dataset to train on");
    for (const d of s.datasets)
      select.append(
        el(
          "option",
          { value: d.id, selected: d.id === state.dataset.id },
          d.name,
        ),
      );
    select.addEventListener("change", () =>
      act(async () => {
        await s.select(select.value);
        draft = null;
        loaded = null;
        await loadModels();
      }),
    );

    const table = el("table", { className: "ds-table", id: "tr-labels" });
    table.append(
      el(
        "tr",
        {},
        el("th", { scope: "col" }, "Use"),
        el("th", { scope: "col" }, "Training"),
        el("th", { scope: "col" }, "Validation"),
        el("th", { scope: "col" }, "Test"),
      ),
    );
    for (const l of state.labels) {
      const count = (split: string) =>
        state.images.filter((i) => i.labelId === l.id && i.split === split)
          .length;
      const box = el("input", {
        type: "checkbox",
        checked: picked.has(l.id),
        disabled: busy(),
      });
      box.setAttribute("aria-label", `Use label ${l.name}`);
      box.addEventListener("change", () => {
        if (box.checked) picked.add(l.id);
        else picked.delete(l.id);
        renderSetup();
      });
      table.append(
        el(
          "tr",
          {},
          el("th", { scope: "row" }, el("label", {}, box, ` ${l.name}`)),
          el("td", {}, String(count("train"))),
          el("td", {}, String(count("validation"))),
          el(
            "td",
            {},
            `${count("test")} ${finalRecord?.status === "complete" && finalRecord.labelIds.includes(l.id) ? (finalRecord.datasetVersion === state.dataset.version ? "held out (final check used)" : "held out (historical check)") : "sealed"}`,
          ),
        ),
      );
    }

    const capInput = el("input", {
      id: "tr-cap",
      type: "number",
      min: "1",
      step: "1",
      value: cap,
      placeholder: "all",
      disabled: busy(),
    });
    capInput.addEventListener("input", () => (cap = capInput.value));
    const lrInput = el("input", {
      id: "tr-lr",
      type: "number",
      min: String(SETTING_RANGES.learningRate.min),
      max: String(SETTING_RANGES.learningRate.max),
      step: "0.01",
      value: learningRate,
      disabled: busy(),
    });
    lrInput.addEventListener("input", () => (learningRate = lrInput.value));
    const l2Input = el("input", {
      id: "tr-l2",
      type: "number",
      min: "0",
      max: "1",
      step: "0.001",
      value: regularization,
      disabled: busy(),
    });
    l2Input.addEventListener("input", () => (regularization = l2Input.value));
    const epochInput = el("input", {
      id: "tr-epochs",
      type: "number",
      min: String(SETTING_RANGES.epochs.min),
      max: String(SETTING_RANGES.epochs.max),
      step: "1",
      value: epochs,
      disabled: busy(),
    });
    epochInput.addEventListener("input", () => (epochs = epochInput.value));

    const seedInput = el("input", {
      id: "tr-seed",
      type: "number",
      min: "0",
      max: "4294967295",
      step: "1",
      value: trainingSeed,
      disabled: busy(),
    });
    seedInput.addEventListener("input", () => (trainingSeed = seedInput.value));

    const selection = selectExamples(
      state.images,
      state.labels,
      chosenIds(s),
      null,
      state.dataset.seed,
    );
    setup.replaceChildren(
      el(
        "section",
        { className: "panel ds-panel", id: "tr-data" },
        el("h2", {}, "Training data"),
        el("div", { className: "ds-row" }, select),
        table,
        el(
          "p",
          { className: "ds-help" },
          "Training photos teach the model. Validation photos check it without updating weights. Test photos are excluded from training and progress checks; use the explicit final check only after choosing a saved model.",
        ),
        selection.problems.length
          ? el(
              "ul",
              { className: "ds-warnings", id: "tr-problems" },
              ...selection.problems.map((p) => el("li", {}, p)),
            )
          : "",
        !selection.problems.length && !selection.validation.length
          ? el(
              "p",
              { className: "ds-notice" },
              "These labels have no validation photos, so training can run but there will be no check on unseen photos.",
            )
          : "",
        el(
          "label",
          { className: "ds-row" },
          "Use at most ",
          capInput,
          " training photos per label (blank uses all)",
        ),
      ),
      el(
        "section",
        { className: "panel ds-panel", id: "tr-settings" },
        el("h2", {}, "Settings"),
        el(
          "label",
          { className: "ds-row" },
          "Learning rate (how big each step is) ",
          lrInput,
        ),
        el(
          "label",
          { className: "ds-row" },
          "L2 strength (0 disables the weight penalty) ",
          l2Input,
        ),
        el(
          "p",
          { className: "ds-help" },
          "L2 discourages large classifier weights: the optimiser minimises mean cross-entropy plus L2 / 2 × sum(weights²). Biases are not penalised. It can reduce overfitting or cause underfitting; improvement is not guaranteed. This is separate from the frozen encoder’s embedding normalisation. The loss curves show prediction cross-entropy only; the penalised training objective is reported separately. Choose settings on validation, not the final test.",
        ),
        el(
          "label",
          { className: "ds-row" },
          "Epochs (passes over the training photos) ",
          epochInput,
        ),
        el(
          "label",
          { className: "ds-row" },
          "Seed (starting weights and shuffle) ",
          seedInput,
        ),
        el(
          "p",
          { className: "ds-help" },
          `Photos per step: ${DEFAULT_SETTINGS.batchSize}. Reuse the seed, data and settings to repeat a run with the same cached embeddings/runtime. Different devices can produce small numerical differences. The photo cap is selected using the dataset split seed.`,
        ),
        button("Train", () => void train(), {
          className: "button primary",
          disabled: busy() || selection.problems.length > 0,
          dataset: { testid: "tr-train" },
        }),
      ),
    );
  }

  function updateProgress() {
    const last = live.at(-1);
    if (phase === "training" && last)
      progressText.textContent = `Epoch ${last.epoch} of ${plannedEpochs}. Training loss ${num(last.trainLoss)}, validation accuracy ${pct(last.validationAccuracy)}.${last.trainObjective === undefined ? "" : ` Penalised training objective ${num(last.trainObjective)}.`}`;
    cancel.disabled = phase === "idle";
    drawCharts(live);
  }

  function drawCharts(history: readonly EpochRecord[]) {
    drawEpochChart(
      lossChart,
      [
        {
          name: "training loss",
          color: COLORS.train,
          values: history.map((h) => h.trainLoss),
        },
        {
          name: "validation loss",
          color: COLORS.validation,
          dashed: true,
          values: history.map((h) => h.validationLoss),
        },
      ],
      { title: "Prediction loss (cross-entropy)" },
    );
    drawEpochChart(
      accuracyChart,
      [
        {
          name: "training accuracy",
          color: COLORS.train,
          values: history.map((h) => h.trainAccuracy),
        },
        {
          name: "validation accuracy",
          color: COLORS.validation,
          dashed: true,
          values: history.map((h) => h.validationAccuracy),
        },
      ],
      { title: "Accuracy", yMax: 1, percent: true },
    );
  }

  async function train() {
    const s = service;
    if (!s?.current || busy()) return;
    const state = s.current;
    const settingsInput = parsedSettings();
    const problems = validateSettings(settingsInput);
    const seedProblem = validateSeed(settingsInput.seed);
    if (seedProblem) problems.push(seedProblem);
    const selection = selectExamples(
      state.images,
      state.labels,
      chosenIds(s),
      problems.length ? null : settingsInput.perLabelCap,
      state.dataset.seed,
    );
    problems.push(...selection.problems);
    if (problems.length) {
      say(problems.join(" "));
      return;
    }
    phase = "embedding";
    jobDatasetId = state.dataset.id;
    jobDatasetGone = false;
    abort = new AbortController();
    const signal = abort.signal;
    draft = null;
    loaded = null;
    live = [];
    plannedEpochs = settingsInput.epochs;
    progress.hidden = false;
    say("");
    renderAll();
    try {
      embedder ??= new Embedder();
      const e = embedder;
      progressText.textContent = "Loading the image encoder…";
      updateProgress();
      const images = [...selection.train, ...selection.validation];
      const embedded = await embedImages(s, (b) => e.embed(b), images, {
        signal,
        onProgress: (done, total) => {
          progressText.textContent = `Turning photos into embeddings: ${done} of ${total}.`;
        },
      });
      phase = "training";
      renderSetup();
      const settings = {
        ...settingsInput,
        batchSize: DEFAULT_SETTINGS.batchSize,
      };
      const vec = (i: ImageRecord) => embedded.vectors.get(i.id)!;
      const run = await runTraining(
        {
          trainX: selection.train.map(vec),
          trainY: selection.trainLabels,
          validationX: selection.validation.map(vec),
          validationY: selection.validationLabels,
          classes: selection.classes.length,
          dims: ENCODER.dimensions,
        },
        settings,
        {
          signal,
          onEpoch: (r) => {
            live.push(r);
            updateProgress();
          },
        },
      );
      if (await jobDatasetDeleted()) throw new DatasetGoneError();
      draft = {
        record: {
          id: crypto.randomUUID(),
          datasetId: state.dataset.id,
          name: `Model ${new Date().toLocaleString()}`,
          createdAt: new Date().toISOString(),
          encoderKey: ENCODER_KEY,
          datasetVersion: state.dataset.version,
          experiment: createRunManifest(
            state.dataset.seed,
            selection,
            settings,
          ),
          labelIds: selection.classes.map((c) => c.id),
          labelNames: selection.classes.map((c) => c.name),
          dims: ENCODER.dimensions,
          weights: run.model.weights,
          bias: run.model.bias,
          settings,
          history: run.history,
          stoppedEarly: run.stoppedEarly,
          trainCount: selection.train.length,
          validationCount: selection.validation.length,
          trainImages: selection.train.map(({ id, sha256, dhash }) => ({
            id,
            sha256,
            dhash,
          })),
        },
        run,
        selection,
        computed: embedded.computed,
        reused: embedded.reused,
        saved: false,
      };
      progressText.textContent = run.stoppedEarly
        ? "Training was cancelled. The results below are from the epochs completed before stopping."
        : "Training finished.";
      say(describeOutcome(run));
    } catch (error) {
      if (
        error instanceof DatasetGoneError ||
        jobDatasetGone ||
        (error instanceof StorageError && error.kind === "missing")
      ) {
        draft = null;
        progressText.textContent = "Training stopped.";
        say(
          "The dataset was deleted while training was running, so the results were discarded and nothing was saved.",
        );
      } else if (error instanceof CancelledError) {
        progressText.textContent = "Cancelled while preparing embeddings.";
        say(
          "Cancelled before training started. Embeddings already computed are saved on this device and will be reused next time.",
        );
      } else {
        progressText.textContent = "Training stopped.";
        say(describeError(error));
      }
    } finally {
      phase = "idle";
      abort = null;
      releaseEncoder();
      const gone = jobDatasetGone;
      jobDatasetId = null;
      // Refreshing was skipped while the job ran; catch up now (the dataset may be gone).
      if (gone) await refresh();
      else renderAll();
    }
  }

  function comparisonTable(
    images: readonly ImageRecord[],
    truth: readonly number[],
    names: readonly string[],
    columns: { title: string; evaluation: Evaluation }[],
    id: string,
  ) {
    const table = el("table", { className: "ds-table tr-compare", id });
    table.append(
      el(
        "tr",
        {},
        el("th", { scope: "col" }, "Photo"),
        el("th", { scope: "col" }, "Label"),
        ...columns.map((c) => el("th", { scope: "col" }, c.title)),
      ),
    );
    images.forEach((img, i) => {
      const cells = columns.map((c) => {
        const k = c.evaluation.predicted[i];
        const right = k === truth[i];
        return el(
          "td",
          {
            className: right ? "tr-right" : "tr-wrong",
            dataset: { correct: String(right) },
          },
          `${right ? "✓" : "✗"} ${names[k]} (${pct(c.evaluation.confidence[i])} sure)`,
        );
      });
      table.append(
        el(
          "tr",
          { dataset: { imageId: img.id } },
          el("td", {}, thumbCanvas(img.id)),
          el("th", { scope: "row" }, names[truth[i]]),
          ...cells,
        ),
      );
    });
    return table;
  }

  function renderResults() {
    const d = draft;
    if (!d) {
      results.replaceChildren();
      return;
    }
    const { run, record, selection } = d;
    const first = run.history[0],
      last = run.history.at(-1)!;
    const summary = el(
      "p",
      {
        className: "ds-summary",
        dataset: {
          testid: "tr-summary",
          validationBefore: String(first.validationAccuracy ?? ""),
          validationAfter: String(last.validationAccuracy ?? ""),
          lossFirst: String(first.trainLoss),
          lossLast: String(last.trainLoss),
          epochs: String(last.epoch),
          stoppedEarly: String(run.stoppedEarly),
        },
      },
      describeOutcome(run),
    );
    const metrics = el(
      "table",
      { className: "ds-table", id: "tr-metrics" },
      el(
        "tr",
        {},
        el("th", { scope: "col" }, ""),
        el("th", { scope: "col" }, "Before (epoch 0)"),
        el("th", { scope: "col" }, `After (epoch ${last.epoch})`),
      ),
      ...(
        [
          ["Training loss", num(first.trainLoss), num(last.trainLoss)],
          [
            "Training accuracy",
            pct(first.trainAccuracy),
            pct(last.trainAccuracy),
          ],
          [
            "Validation loss",
            num(first.validationLoss),
            num(last.validationLoss),
          ],
          [
            "Validation accuracy",
            pct(first.validationAccuracy),
            pct(last.validationAccuracy),
          ],
        ] as const
      ).map(([name, a, b]) =>
        el(
          "tr",
          {},
          el("th", { scope: "row" }, name),
          el("td", {}, a),
          el("td", {}, b),
        ),
      ),
    );
    const ev = run.evidence;
    const k = record.labelIds.length;
    const evidence = el(
      "div",
      { id: "tr-evidence" },
      el("h3", {}, "What changed inside the model"),
      el(
        "ul",
        {},
        el(
          "li",
          { dataset: { testid: "tr-param-count" } },
          `${ev.count.toLocaleString()} numbers were trained: ${k} labels × ${record.dims.toLocaleString()} weights, plus ${k} biases. The encoder's own numbers were not changed.`,
        ),
        el(
          "li",
          {},
          `Overall size of weights and biases (L2 norm): ${num(ev.normBefore)} before, ${num(ev.normAfter)} after.`,
        ),
        el(
          "li",
          {},
          `Average change per number: ${ev.meanAbsChange.toExponential(2)}.`,
        ),
        el(
          "li",
          {},
          "Weight size per label after training: " +
            ev.rowNorms
              .map((n, i) => `${record.labelNames[i]} ${num(n)}`)
              .join(", ") +
            ".",
        ),
      ),
    );
    const names = record.labelNames;
    const compare =
      run.before && run.after
        ? comparisonTable(
            selection.validation,
            selection.validationLabels,
            names,
            [
              { title: "Before training", evaluation: run.before },
              { title: "After training", evaluation: run.after },
            ],
            "tr-compare",
          )
        : el("p", { className: "ds-help" }, "No validation photos to compare.");
    const full = models.length >= MAX_MODELS_PER_DATASET;
    results.replaceChildren(
      el(
        "section",
        { className: "panel ds-panel", id: "tr-result" },
        el("h2", {}, "Results"),
        summary,
        metrics,
        run.after
          ? classificationMetricsPanel(
              record.labelNames,
              selection.validationLabels,
              run.after.predicted,
              {
                id: "tr-validation-metrics",
                title: "Validation details — final classifier",
              },
            )
          : "",
        el(
          "p",
          { className: "ds-help" },
          `${record.trainCount} training and ${record.validationCount} validation photos. Embeddings: ${d.computed} computed now, ${d.reused} reused from this device. Learning rate ${record.settings.learningRate}, seed ${record.settings.seed}, L2 strength ${record.settings.l2 ?? 0}. Prediction loss excludes the penalty.${last.trainObjective === undefined ? "" : ` Final training objective (prediction loss + L2 penalty): ${num(last.trainObjective)}.`}`,
        ),
        evidence,
        el("h3", {}, "Validation photos before and after"),
        el(
          "p",
          { className: "ds-help" },
          "“Sure” is the model's own confidence. It is not the same as being right: a model can be very sure and wrong. Accuracy is measured by counting correct answers.",
        ),
        compare,
        el(
          "div",
          { className: "ds-row" },
          button(
            d.saved ? "Saved" : "Save this model",
            () =>
              act(async () => {
                try {
                  await service!.saveModel(d.record);
                } catch (error) {
                  if (error instanceof StorageError && error.kind === "missing")
                    draft = null;
                  throw error;
                }
                d.saved = true;
                await loadModels();
                return "Model saved on this device.";
              }),
            {
              className: "button primary",
              disabled: busy() || d.saved || full,
              dataset: { testid: "tr-save" },
            },
          ),
          full && !d.saved
            ? el(
                "span",
                { className: "ds-help" },
                `Up to ${MAX_MODELS_PER_DATASET} saved models per dataset. Delete one to save this.`,
              )
            : "",
        ),
      ),
    );
  }

  function renderBaseline() {
    baselineSection.replaceChildren(
      el("h2", {}, "Learning methods — shared frozen features"),
    );
    baselineSection.append(
      el(
        "p",
        { className: "ds-help" },
        "Save a classifier, then choose Compare with 1-nearest neighbour or Compare training methods beside it. Training-method comparison requires a completed source run and trains fresh softmax and hidden-layer classifiers; results are temporary. The comparison requires its unchanged dataset snapshot and actual training subset. Both methods are checked on the same independent validation images. Missing training/validation embeddings may be computed and cached locally; test photos are never opened by this action.",
      ),
    );
    const message = el(
      "p",
      { id: "tr-baseline-status", className: "ds-notice" },
      baselineProgress ||
        "No comparison yet. Results are not saved automatically.",
    );
    message.setAttribute("role", "status");
    baselineSection.append(message);
    if (phase === "baseline")
      baselineSection.append(
        button("Cancel comparison", () => abort?.abort(), {
          className: "button stop",
          dataset: { testid: "tr-baseline-cancel" },
        }),
      );
    if (methodComparison)
      baselineSection.append(
        photoMethodComparisonPanel(
          methodComparison,
          finalRecord?.status === "complete",
        ),
      );
    if (baseline)
      baselineSection.append(
        baselineComparisonPanel(baseline, finalRecord?.status === "complete"),
      );
  }

  async function compareBaseline(
    source: ModelRecord,
    method: "neighbour" | "network" = "neighbour",
  ) {
    const s = service;
    if (!s?.current || busy()) return;
    const candidate = structuredClone(source);
    phase = "baseline";
    baseline = null;
    methodComparison = null;
    baselineProgress = "Preparing shared validation inputs…";
    jobDatasetId = candidate.datasetId;
    jobDatasetGone = false;
    abort = new AbortController();
    const signal = abort.signal;
    let cancelEncoding: (() => void) | undefined;
    progress.hidden = true;
    say("");
    renderAll();
    const progressMessage = (message: string) => {
      if (signal.aborted) return;
      baselineProgress = message;
      const node = baselineSection.querySelector("#tr-baseline-status");
      if (node) node.textContent = message;
    };
    try {
      await s.reload();
      if (!s.current) throw new BaselineError("The dataset was deleted.");
      const prepare =
        method === "network" ? prepareMethodComparison : prepareBaseline;
      const plan = prepare(s.current, candidate);
      if (signal.aborted) throw new CancelledError();
      embedder ??= new Embedder();
      const encoder = embedder;
      const cancelled = new Promise<never>((_, reject) => {
        cancelEncoding = () => reject(new CancelledError());
        signal.addEventListener("abort", cancelEncoding, { once: true });
      });
      const embedded = await Promise.race([
        embedImages(
          s,
          (image) => encoder.embed(image),
          [...plan.train, ...plan.validation],
          {
            signal,
            onProgress: (done, total) =>
              progressMessage(
                `Preparing shared features: ${done} of ${total}.`,
              ),
          },
        ),
        cancelled,
      ]);
      const vector = (image: ImageRecord) => embedded.vectors.get(image.id)!;
      let neighbour: Awaited<ReturnType<typeof nearestNeighbour>> | null = null;
      let trained: MethodRun | null = null;
      if (method === "network") {
        trained = await runMethodComparison(
          {
            trainX: plan.train.map(vector),
            trainY: plan.trainLabels,
            validationX: plan.validation.map(vector),
            validationY: plan.truth,
            classes: candidate.labelIds.length,
            dims: candidate.dims,
          },
          candidate.settings,
          {
            signal,
            onEpoch: (which, row) =>
              progressMessage(
                `Training ${which === "linear" ? "fresh softmax" : "fresh hidden-layer network"}: epoch ${row.epoch} of ${candidate.settings.epochs}. No partial comparison is published.`,
              ),
          },
        );
      } else {
        neighbour = await nearestNeighbour(
          plan.train.map(vector),
          plan.trainLabels,
          plan.validation.map(vector),
          candidate.labelIds.length,
          {
            signal,
            onProgress: (done, total) =>
              progressMessage(
                `Comparing validation images: ${done} of ${total}. No partial comparison is published.`,
              ),
          },
        );
      }
      const classifier =
        trained?.linear.after ??
        evaluate(toSoftmax(candidate), plan.validation.map(vector), plan.truth);
      if (!Number.isFinite(classifier.loss))
        throw new BaselineError(
          "The classifier returned invalid measurements.",
        );
      await s.reload();
      if (signal.aborted) throw new CancelledError();
      if (!s.current)
        throw new BaselineError(
          "The dataset was deleted; the comparison was discarded.",
        );
      prepare(s.current, candidate);
      if (
        !(await s.listModels(candidate.datasetId)).some(
          (m) => m.id === candidate.id,
        )
      )
        throw new BaselineError(
          "The source model was deleted; the comparison was discarded.",
        );
      if (signal.aborted) throw new CancelledError();
      if (trained) {
        methodComparison = {
          record: candidate,
          run: trained,
          truth: plan.truth,
          trainCount: plan.train.length,
          excluded: plan.excluded,
        };
        baselineProgress =
          "Training-method comparison completed — freshly trained models on shared frozen features. Source weights and final-test locks are unchanged.";
      } else {
        baseline = {
          record: candidate,
          truth: plan.truth,
          classifier,
          neighbour: neighbour!,
          trainCount: plan.train.length,
          excluded: plan.excluded,
        };
        baselineProgress =
          "Comparison completed — same validation images and frozen features. No weights changed.";
      }
    } catch (error) {
      baseline = null;
      methodComparison = null;
      baselineProgress =
        signal.aborted || error instanceof CancelledError
          ? "Comparison cancelled. No partial comparison was published; choose Compare again to retry."
          : describeError(error);
      say(baselineProgress);
    } finally {
      if (cancelEncoding) signal.removeEventListener("abort", cancelEncoding);
      phase = "idle";
      abort = null;
      jobDatasetId = null;
      releaseEncoder();
      await refresh();
    }
  }

  function renderFinal() {
    const state = service?.current;
    finalSection.replaceChildren(
      el("h2", {}, "Final held-out test — choose once"),
    );
    if (!state) {
      finalSection.append(el("p", {}, "Choose a dataset first."));
      return;
    }
    finalSection.append(
      el(
        "p",
        { className: "ds-help" },
        "Choose settings using validation first. This final check locks one saved model for this dataset before any test photo is encoded. Cancelled/failed attempts may retry only that same model and unchanged snapshot. No partial predictions are shown. Do not tune using this score: a later independent claim needs fresh held-out images. Clearing storage cannot make seen test images unseen.",
      ),
    );
    if (finalReadError) {
      finalSection.append(el("p", { className: "ds-notice" }, finalReadError));
      return;
    }
    const record = finalRecord;
    const message = el("p", { id: "tr-final-status", className: "ds-notice" });
    message.setAttribute("role", "status");
    if (record?.status === "complete" && record.result) {
      message.textContent = `Final check recorded at ${record.result.completedAt}, dataset version ${record.datasetVersion}. This is a historical result, not a fresh check of current photos. Loss ${num(record.result.loss)}.`;
      finalSection.append(
        message,
        el(
          "p",
          { className: "ds-help" },
          `Locked configuration: learning rate ${record.settings.learningRate}, seed ${record.settings.seed}, ${record.settings.epochs} epochs, L2 strength ${record.settings.l2 ?? 0}. Final prediction loss is cross-entropy without the training penalty.`,
        ),
        classificationMetricsPanel(
          record.labelNames,
          record.result.truth,
          record.result.predicted,
          {
            id: "tr-final-metrics",
            title: "Final test measurements — locked classifier",
          },
        ),
      );
    } else {
      const select = el("select", {
        id: "tr-final-model",
        disabled: busy() || !!record,
      });
      select.setAttribute("aria-label", "Final saved model");
      select.append(
        el("option", { value: "" }, "Choose the final saved model"),
      );
      for (const m of models)
        select.append(
          el(
            "option",
            {
              value: m.id,
              selected: m.id === (record?.modelId ?? finalModelId),
            },
            m.name,
          ),
        );
      select.addEventListener("change", () => {
        finalModelId = select.value;
        renderFinal();
      });
      message.textContent =
        phase === "final-test"
          ? finalProgress
          : record
            ? "The final choice is locked. No complete result yet; retry only this same model and unchanged dataset."
            : "Test photos remain sealed until you confirm a final model.";
      finalSection.append(
        select,
        message,
        button(
          record ? "Retry locked final check" : "Begin one final check",
          () => void finalCheck(),
          {
            className: "button primary",
            disabled:
              busy() ||
              !(record
                ? models.some((m) => m.id === record.modelId)
                : finalModelId),
            dataset: { testid: "tr-final-run" },
          },
        ),
      );
      if (phase === "final-test")
        finalSection.append(
          button("Cancel final check", () => abort?.abort(), {
            className: "button stop",
            dataset: { testid: "tr-final-cancel" },
          }),
        );
    }
    finalSection.append(
      el(
        "p",
        { className: "ds-help" },
        "The frozen encoder and classifier do not learn during evaluation. Test embeddings are temporary and never cached. Detected exact/near-copy overlap blocks the check; heuristics cannot prove all leakage is absent. Labels, fingerprints and the final result stay locally until this dataset is deleted. Deleting a saved model removes its weights but keeps this historical report. Small or generated test sets do not prove real-world accuracy.",
      ),
    );
  }

  async function finalCheck() {
    const s = service;
    if (
      !s?.current ||
      busy() ||
      finalRecord?.status === "complete" ||
      finalReadError
    )
      return;
    const source = models.find(
      (m) => m.id === (finalRecord?.modelId ?? finalModelId),
    );
    if (!source) {
      say("The chosen saved model no longer exists.");
      return;
    }
    const candidate = structuredClone(source);
    try {
      prepareFinalPlan(
        s.current.dataset,
        s.current.labels,
        s.current.images,
        candidate,
      );
    } catch (error) {
      say(describeError(error));
      return;
    }
    if (
      !finalRecord &&
      !confirm(
        "Lock this saved model as the one final choice for this dataset? Test photos will be evaluated only after the lock is saved. Cancellation or failure keeps the choice locked; only the same model and unchanged dataset can retry. Use fresh held-out images for any later independent claim. The local record keeps labels, fingerprints and results until you delete the dataset; test embeddings are not saved.",
      )
    )
      return;
    phase = "final-test";
    jobDatasetId = candidate.datasetId;
    jobDatasetGone = false;
    abort = new AbortController();
    const signal = abort.signal;
    progress.hidden = true;
    finalProgress = "Saving the final model choice…";
    say("");
    renderAll();
    try {
      const fingerprint = await fingerprintModel(candidate);
      if (signal.aborted) throw new CancelledError();
      const lock = await s.finalChecks().claim(candidate, fingerprint, signal);
      finalRecord = lock;
      renderFinal();
      embedder ??= new Embedder();
      const encoder = embedder;
      const result = await runFinalCheck(
        lock,
        candidate,
        async (id) => (await s.getBlob(id))?.image,
        (image) => encoder.embed(image),
        {
          signal,
          onProgress: (done, total) => {
            finalProgress = `Encoding locked test photos: ${done} of ${total}. No partial measurements are published.`;
            const status = finalSection.querySelector("#tr-final-status");
            if (status) status.textContent = finalProgress;
          },
        },
      );
      if (signal.aborted) throw new CancelledError();
      finalRecord = await s
        .finalChecks()
        .complete(lock, candidate, result, signal);
      say(
        "Final test recorded. Further tuning cannot treat these test photos as untouched.",
      );
    } catch (error) {
      say(
        signal.aborted || error instanceof CancelledError
          ? "Final check stopped. No partial results were saved. Any committed model choice stays locked for a retry of that same choice."
          : describeError(error),
      );
    } finally {
      phase = "idle";
      abort = null;
      jobDatasetId = null;
      releaseEncoder();
      await refresh();
    }
  }

  function renderSaved() {
    const s = service;
    if (!s?.current) {
      saved.replaceChildren();
      return;
    }
    const list = el("ul", { className: "ds-label-list", id: "tr-models" });
    for (const m of models) {
      const last = m.history.at(-1);
      list.append(
        el(
          "li",
          { dataset: { testid: "tr-model" } },
          el("strong", {}, m.name),
          el(
            "span",
            { className: "ds-help" },
            ` ${m.labelNames.join(", ")}; ${last?.epoch ?? 0} epochs${m.stoppedEarly ? " (stopped early)" : ""}; learning rate ${m.settings.learningRate}; L2 ${m.settings.l2 ?? 0}; validation accuracy when trained ${pct(last?.validationAccuracy ?? null)}.`,
          ),
          button("Restore run settings", () => act(() => restoreRun(m)), {
            disabled: busy(),
            dataset: { testid: "tr-restore" },
          }),
          button(
            "Download run report (.json)",
            () =>
              act(async () => {
                downloadRunReport(m, reportNames);
                return "Report download requested. Check your browser’s Downloads; no data was uploaded.";
              }),
            {
              disabled: busy(),
              dataset: { testid: "tr-report" },
            },
          ),
          button(
            "Compare with 1-nearest neighbour",
            () => void compareBaseline(m),
            { disabled: busy(), dataset: { testid: "tr-baseline-run" } },
          ),
          button(
            "Compare training methods",
            () => void compareBaseline(m, "network"),
            {
              disabled: busy() || m.stoppedEarly,
              dataset: { testid: "tr-methods-run" },
            },
          ),
          button("Load", () => act(() => loadModel(m)), {
            disabled: busy(),
            dataset: { testid: "tr-load" },
          }),
          button(
            "Delete",
            () => {
              if (confirm(`Delete the saved model “${m.name}”?`))
                act(async () => {
                  await s.deleteModel(m.id);
                  if (loaded?.record.id === m.id) loaded = null;
                  if (draft?.record.id === m.id) draft.saved = false;
                  await loadModels();
                  return "Saved model deleted.";
                });
            },
            {
              className: "button stop",
              disabled: busy(),
              dataset: { testid: "tr-delete" },
            },
          ),
        ),
      );
    }
    const sections: Node[] = [el("h2", {}, "Saved models")];
    if (models.length) {
      const names = el("input", {
        type: "checkbox",
        checked: reportNames,
        disabled: busy(),
        dataset: { testid: "tr-report-names" },
      });
      names.addEventListener("change", () => {
        reportNames = names.checked;
      });
      sections.push(
        el(
          "p",
          { className: "ds-help", id: "tr-report-disclosure" },
          "A report downloads settings, recorded metrics, local IDs and image file fingerprints. No photos, embeddings or model weights. Fingerprints can link matching files; the report is not anonymous. It is not a model backup and cannot be imported. Class names are optional and may contain personal information.",
        ),
        el(
          "label",
          { className: "ds-row" },
          names,
          "Include class names in report downloads",
        ),
      );
    }
    sections.push(
      models.length
        ? list
        : el(
            "p",
            { className: "ds-help" },
            "No saved models for this dataset yet.",
          ),
      runComparisonPanel(models, {
        leftId: comparisonLeft,
        rightId: comparisonRight,
        disabled: busy(),
        mode: comparisonMode,
        onChange: (left, right, mode) => {
          comparisonLeft = left;
          comparisonRight = right;
          comparisonMode = mode;
          renderSaved();
        },
      }),
    );
    if (loaded) {
      const l = loaded;
      const last = l.record.history.at(-1);
      sections.push(
        el(
          "div",
          { id: "tr-loaded" },
          el("h3", {}, `Loaded: ${l.record.name}`),
          l.warning ? el("p", { className: "ds-notice" }, l.warning) : "",
          !l.known
            ? el(
                "p",
                {
                  className: "ds-notice",
                  dataset: { testid: "tr-loaded-unknown" },
                },
                "This saved model has no record of which photos it learned from, so the check below may include photos it was trained on. It is not an independent check.",
              )
            : l.excluded
              ? el(
                  "p",
                  {
                    className: "ds-notice",
                    dataset: { testid: "tr-loaded-excluded" },
                  },
                  `${l.excluded} current validation ${l.excluded === 1 ? "photo was" : "photos were"} left out because this model learned from ${l.excluded === 1 ? "it" : "them"} (or a copy) before the dataset changed. Checking a model on photos it learned from would overstate how well it works.`,
                )
              : "",
          el(
            "p",
            {
              dataset: {
                testid: "tr-loaded-accuracy",
                checked: String(l.validation.length),
                excluded: String(l.excluded),
              },
            },
            l.evaluation
              ? `On the current ${l.validation.length} validation photos${l.known ? " it did not learn from" : ""}, it is right ${pct(l.evaluation.accuracy)} of the time (when trained: ${pct(last?.validationAccuracy ?? null)}).`
              : l.excluded
                ? "No validation photos remain that this model did not learn from, so it cannot be checked independently."
                : "There are no validation photos for its labels now, so it cannot be checked.",
          ),
          l.evaluation
            ? classificationMetricsPanel(
                l.record.labelNames,
                l.labels,
                l.evaluation.predicted,
                {
                  id: "tr-loaded-metrics",
                  title: l.known
                    ? "Current validation details"
                    : "Current photo check — not independent",
                },
              )
            : "",
          l.evaluation
            ? comparisonTable(
                l.validation,
                l.labels,
                l.record.labelNames,
                [{ title: "Its answer", evaluation: l.evaluation }],
                "tr-loaded-compare",
              )
            : "",
        ),
      );
    }
    saved.replaceChildren(
      el("section", { className: "panel ds-panel" }, ...sections),
    );
  }

  async function restoreRun(m: ModelRecord) {
    const s = service!;
    await s.reload();
    const state = s.current;
    if (!state) return "The dataset no longer exists.";
    const compatibility = checkCompatibility(
      m,
      ENCODER_KEY,
      state.dataset,
      state.labels,
    );
    if (!compatibility.ok)
      return `Cannot restore this run: ${compatibility.reason}`;
    const settings = repeatSettings(m);
    if (!settings)
      return "No completed training epochs are available to repeat.";
    if (settings.batchSize !== DEFAULT_SETTINGS.batchSize)
      return "This run uses an unsupported batch size.";
    const settingsProblem = validateSettings(settings);
    if (settingsProblem.length) return settingsProblem.join(" ");
    const selection = selectExamples(
      state.images,
      state.labels,
      m.labelIds,
      m.settings.perLabelCap,
      state.dataset.seed,
    );
    const problem = replayProblem(m, {
      datasetId: state.dataset.id,
      datasetVersion: state.dataset.version,
      encoderKey: ENCODER_KEY,
      splitSeed: state.dataset.seed,
      selection,
    });
    if (problem) return `Cannot restore this run: ${problem}`;
    chosen = new Set(m.labelIds);
    chosenFor = state.dataset.id;
    learningRate = String(m.settings.learningRate);
    epochs = String(settings.epochs);
    trainingSeed = String(m.settings.seed);
    regularization = String(m.settings.l2 ?? 0);
    cap = m.settings.perLabelCap === null ? "" : String(m.settings.perLabelCap);
    return "Run settings restored for the same recorded examples. Choose Train to repeat; nothing runs automatically.";
  }

  async function loadModel(m: ModelRecord) {
    const s = service!;
    const state = s.current!;
    const c = checkCompatibility(m, ENCODER_KEY, state.dataset, state.labels);
    if (!c.ok) {
      loaded = null;
      return `This model cannot be loaded. ${c.reason}`;
    }
    const selection = selectExamples(
      state.images,
      state.labels,
      m.labelIds,
      null,
      state.dataset.seed,
    );
    const check = independentValidation(m, selection.validation);
    const truth = check.keptIndices.map((i) => selection.validationLabels[i]);
    embedder ??= new Embedder();
    const e = embedder;
    let embedded;
    try {
      embedded = await embedImages(s, (b) => e.embed(b), check.kept);
    } finally {
      releaseEncoder();
    }
    const evaluation = check.kept.length
      ? evaluate(
          toSoftmax(m),
          check.kept.map((i) => embedded.vectors.get(i.id)!),
          truth,
        )
      : null;
    loaded = {
      record: m,
      warning: c.warning,
      validation: check.kept,
      labels: truth,
      evaluation,
      known: check.known,
      excluded: check.excluded,
    };
    return `Loaded “${m.name}”.`;
  }

  async function loadModels() {
    const s = service;
    models = s?.current ? await s.listModels(s.current.dataset.id) : [];
    finalRecord = null;
    finalReadError = "";
    if (s?.current) {
      try {
        finalRecord =
          (await s.finalChecks().read(s.current.dataset.id)) ?? null;
      } catch (error) {
        finalReadError =
          error instanceof Error
            ? error.message
            : "Final-check history is unavailable.";
      }
    }
  }

  async function act(action: () => Promise<void | string>) {
    if (busy()) return;
    actionPending = true;
    renderAll();
    try {
      const message = await action();
      say(typeof message === "string" ? message : "");
    } catch (error) {
      say(describeError(error));
    } finally {
      actionPending = false;
      await refresh();
    }
  }

  function renderAll() {
    lessons.setBlocked(coreBusy());
    renderSetup();
    updateProgress();
    renderResults();
    renderSaved();
    renderBaseline();
    renderFinal();
  }

  function aboutPanel() {
    return el(
      "details",
      { className: "panel ds-panel", id: "tr-about" },
      el("summary", {}, "How this works"),
      el(
        "p",
        { className: "ds-help" },
        `Each photo goes through a frozen, pretrained encoder (${ENCODER.name}, ${ENCODER.version}, published by Google MediaPipe). It squeezes the photo to 224 × 224 pixels and outputs ${ENCODER.dimensions.toLocaleString()} numbers, an “embedding”. The encoder is never changed here.`,
      ),
      el(
        "p",
        { className: "ds-help" },
        "What learns is a small classifier on top: one weight per embedding number per label, plus one bias per label. Each training step nudges those weights to make the right label more likely. This is genuine training, but it is not retraining the Detection lab's object detector, which is unchanged.",
      ),
      el(
        "p",
        { className: "ds-help" },
        "Everything runs in this browser. Photos, embeddings and saved models stay on this device and are never uploaded. The encoder file is downloaded from this website the first time you train.",
      ),
    );
  }

  /** Frees the encoder worker's memory between jobs; cached embeddings usually make it unnecessary. */
  function releaseEncoder() {
    embedder?.close();
    embedder = null;
  }

  function clearThumbs() {
    for (const t of thumbs.values()) void t.then((bm) => bm?.close());
    thumbs.clear();
  }

  /** Reloads datasets (the Dataset lab may have changed them). Skipped while training. */
  /** True if the running job's dataset no longer exists (closed storage counts as deleted). */
  async function jobDatasetDeleted() {
    if (jobDatasetGone) return true;
    if (!service || !jobDatasetId) return false;
    try {
      jobDatasetGone = !(await service.datasetExists(jobDatasetId));
    } catch {
      jobDatasetGone = true; // "Delete all" closed this connection
    }
    return jobDatasetGone;
  }

  async function refresh() {
    if (busy()) {
      // Datasets cannot be reloaded mid-job, but a deleted dataset cancels the job.
      if (await jobDatasetDeleted()) abort?.abort();
      return;
    }
    try {
      if (service) {
        try {
          await service.reload();
        } catch {
          // The connection was closed (for example by "Delete all"); open a fresh one.
          service.close();
          service = null;
        }
      }
      service ??= await DatasetService.open();
      await loadModels();
      clearThumbs();
      if (loaded && loaded.record.datasetId !== service.current?.dataset.id)
        loaded = null;
      if (draft && draft.record.datasetId !== service.current?.dataset.id)
        draft = null;
      const comparisonSource = baseline?.record ?? methodComparison?.record;
      if (
        comparisonSource &&
        (comparisonSource.datasetId !== service.current?.dataset.id ||
          comparisonSource.datasetVersion !==
            service.current?.dataset.version ||
          !models.some((m) => m.id === comparisonSource.id))
      ) {
        baseline = null;
        methodComparison = null;
        baselineProgress =
          "Earlier comparison cleared because its dataset or source model changed.";
      }
      if (status.textContent === "Opening local dataset storage…") say("");
    } catch (error) {
      service = null;
      say(
        error instanceof StorageError
          ? `${error.message} The Detection lab still works.`
          : "Dataset storage could not be opened. The Detection lab still works.",
      );
    }
    renderAll();
  }

  const stopEvaluation = () => {
    if (phase === "final-test" || phase === "baseline") abort?.abort();
  };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopEvaluation();
  });
  window.addEventListener("pagehide", stopEvaluation);
  say("Opening local dataset storage…");
  return {
    refresh,
    leave: () => {
      lessons.cancel(true);
      stopEvaluation();
    },
  };
}
