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
}

/**
 * The Training lab: trains a small classifier on top of a frozen, pretrained image encoder,
 * using a dataset from the Dataset lab. Only the classifier's weights change. Photos, embeddings
 * and saved models stay in this browser on this device.
 */
export function mountTrainingLab(root: HTMLElement) {
  let service: DatasetService | null = null;
  let embedder: Embedder | null = null;
  let phase: "idle" | "embedding" | "training" = "idle";
  let abort: AbortController | null = null;
  let chosen: Set<string> | null = null;
  let chosenFor: string | null = null;
  let learningRate = String(DEFAULT_SETTINGS.learningRate);
  let epochs = String(DEFAULT_SETTINGS.epochs);
  let cap = "";
  let models: ModelRecord[] = [];
  let draft: Draft | null = null;
  let loaded: Loaded | null = null;
  let live: EpochRecord[] = [];
  let plannedEpochs = 0;
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
  root.append(status, setup, progress, results, saved, aboutPanel());

  const say = (text: string) => (status.textContent = text);
  const busy = () => phase !== "idle";

  function describeError(error: unknown) {
    if (
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
    return {
      learningRate: Number(learningRate),
      epochs: Number(epochs),
      perLabelCap: cap.trim() === "" ? null : Number(cap),
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
          el("td", {}, `${count("test")} sealed`),
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
          "Training photos teach the model. Validation photos check it on photos it never learns from. Test photos stay sealed for a final check in a later lab: they are never used here.",
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
          "Epochs (passes over the training photos) ",
          epochInput,
        ),
        el(
          "p",
          { className: "ds-help" },
          `Photos per step: ${DEFAULT_SETTINGS.batchSize}. Starting weights are small random numbers from a seed recorded with the results, so a run can be repeated exactly.`,
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
      progressText.textContent = `Epoch ${last.epoch} of ${plannedEpochs}. Training loss ${num(last.trainLoss)}, validation accuracy ${pct(last.validationAccuracy)}.`;
    cancel.disabled = !busy();
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
      { title: "Loss" },
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
      const seed = crypto.getRandomValues(new Uint32Array(1))[0];
      const settings = {
        ...settingsInput,
        batchSize: DEFAULT_SETTINGS.batchSize,
        seed,
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
      draft = {
        record: {
          id: crypto.randomUUID(),
          datasetId: state.dataset.id,
          name: `Model ${new Date().toLocaleString()}`,
          createdAt: new Date().toISOString(),
          encoderKey: ENCODER_KEY,
          datasetVersion: state.dataset.version,
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
      if (error instanceof CancelledError) {
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
      renderAll();
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
          {},
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
          `Overall size of the weights (L2 norm): ${num(ev.normBefore)} before, ${num(ev.normAfter)} after.`,
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
        el(
          "p",
          { className: "ds-help" },
          `${record.trainCount} training and ${record.validationCount} validation photos. Embeddings: ${d.computed} computed now, ${d.reused} reused from this device. Learning rate ${record.settings.learningRate}, seed ${record.settings.seed}.`,
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
                await service!.saveModel(d.record);
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
            ` ${m.labelNames.join(", ")}; ${last?.epoch ?? 0} epochs${m.stoppedEarly ? " (stopped early)" : ""}; learning rate ${m.settings.learningRate}; validation accuracy when trained ${pct(last?.validationAccuracy ?? null)}.`,
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
    const sections: Node[] = [
      el("h2", {}, "Saved models"),
      models.length
        ? list
        : el(
            "p",
            { className: "ds-help" },
            "No saved models for this dataset yet.",
          ),
    ];
    if (loaded) {
      const l = loaded;
      const last = l.record.history.at(-1);
      sections.push(
        el(
          "div",
          { id: "tr-loaded" },
          el("h3", {}, `Loaded: ${l.record.name}`),
          l.warning ? el("p", { className: "ds-notice" }, l.warning) : "",
          el(
            "p",
            { dataset: { testid: "tr-loaded-accuracy" } },
            l.evaluation
              ? `On the current ${l.validation.length} validation photos it is right ${pct(l.evaluation.accuracy)} of the time (when trained: ${pct(last?.validationAccuracy ?? null)}).`
              : "There are no validation photos for its labels now, so it cannot be checked.",
          ),
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
    embedder ??= new Embedder();
    const e = embedder;
    let embedded;
    try {
      embedded = await embedImages(s, (b) => e.embed(b), selection.validation);
    } finally {
      releaseEncoder();
    }
    const evaluation = selection.validation.length
      ? evaluate(
          toSoftmax(m),
          selection.validation.map((i) => embedded.vectors.get(i.id)!),
          selection.validationLabels,
        )
      : null;
    loaded = {
      record: m,
      warning: c.warning,
      validation: selection.validation,
      labels: selection.validationLabels,
      evaluation,
    };
    return `Loaded “${m.name}”.`;
  }

  async function loadModels() {
    const s = service;
    models = s?.current ? await s.listModels(s.current.dataset.id) : [];
  }

  async function act(action: () => Promise<void | string>) {
    if (busy()) return;
    try {
      const message = await action();
      say(typeof message === "string" ? message : "");
    } catch (error) {
      say(describeError(error));
    } finally {
      renderAll();
    }
  }

  function renderAll() {
    renderSetup();
    updateProgress();
    renderResults();
    renderSaved();
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
  async function refresh() {
    if (busy()) return;
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

  say("Opening local dataset storage…");
  return { refresh };
}
