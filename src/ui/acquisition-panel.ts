import type { AcquisitionResult } from "../learning/acquisition";
import { ENCODER_KEY } from "../learning/encoder";
import { ACQUISITION_GENERATOR_SEED } from "../learning/generated-acquisition";
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text = "") => {
  const n = document.createElement(tag);
  n.textContent = text;
  return n;
};
export interface GeneratedComparison {
  result: AcquisitionResult;
  createdAt: string;
  userAgent: string;
  hardwareConcurrency: number | null;
}
function download(result: GeneratedComparison) {
  const json = JSON.stringify(
    {
      schema: "visual-labs.generated-acquisition/v1",
      source: "freshly generated shapes; simulated oracle labels",
      generatorSeed: ACQUISITION_GENERATOR_SEED,
      encoderKey: ENCODER_KEY,
      createdAt: result.createdAt,
      environment: {
        userAgent: result.userAgent,
        hardwareConcurrency: result.hardwareConcurrency,
      },
      experiment: result.result,
      limitations: [
        "One fixed seed and a small generated validation set do not establish general superiority.",
        "No personal data or test dataset is used. Oracle labels simulate review; they are not human approvals.",
        "Reproduction needs the compatible generator, preprocessing, encoder and implementation. Cross-runtime identical bits are not guaranteed.",
        "This numerical report contains no images, embeddings or weights; it cannot reload a model.",
      ],
    },
    null,
    2,
  );
  const url = URL.createObjectURL(
      new Blob([json], { type: "application/json" }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = "visual-labs-generated-acquisition.json";
  try {
    document.body.append(a);
    a.click();
  } finally {
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
}
export function acquisitionPanel(options: {
  result: GeneratedComparison | null;
  progress: string;
  running: boolean;
  busy: boolean;
  onRun(): void;
  onCancel(): void;
}) {
  const section = el("section");
  section.className = "panel ds-panel";
  section.append(
    el("h2", "Uncertainty vs random — generated example experiment"),
    el(
      "p",
      "Generate a fresh copy of the shapes example and compare acquisition methods. Uncertainty means the model’s top two class probabilities are close. It can select unhelpful examples; random selection can win. Known generator labels simulate an oracle: each learner receives labels only after selecting its batch. No personal dataset, camera or test photos are used. This may download the frozen encoder; images/features remain temporary.",
    ),
  );
  const run = el(
    "button",
    options.running ? "Experiment running…" : "Compare uncertainty vs random",
  );
  run.type = "button";
  run.className = "button";
  run.dataset.testid = "tr-acquisition-run";
  run.disabled = options.busy;
  run.addEventListener("click", options.onRun);
  section.append(run);
  const status = el("p", options.progress || "No example comparison yet.");
  status.id = "tr-acquisition-status";
  status.setAttribute("role", "status");
  section.append(status);
  if (options.running) {
    const cancel = el("button", "Cancel example comparison");
    cancel.className = "button stop";
    cancel.type = "button";
    cancel.dataset.testid = "tr-acquisition-cancel";
    cancel.addEventListener("click", options.onCancel);
    section.append(cancel);
  }
  if (!options.result) return section;
  const r = options.result.result;
  const summary = el(
    "p",
    `On this generated validation cohort, uncertainty selection ${r.uncertainty.accuracy > r.random.accuracy ? "scored higher than" : r.uncertainty.accuracy < r.random.accuracy ? "scored lower than" : "tied"} random selection. This is one fixed-seed demonstration, not evidence of general superiority.`,
  );
  summary.dataset.testid = "tr-acquisition-result";
  summary.dataset.uncertaintyAccuracy = String(r.uncertainty.accuracy);
  summary.dataset.randomAccuracy = String(r.random.accuracy);
  section.append(summary);
  const table = el("table");
  table.className = "ds-table";
  const head = el("tr");
  for (const name of ["Model", "Validation accuracy", "Prediction loss"])
    head.append(el("th", name));
  table.append(head);
  for (const [name, m] of [
    ["Initial labelled seed", r.before],
    ["Uncertainty-selected batch", r.uncertainty],
    ["Random-selected batch", r.random],
  ] as const) {
    const row = el("tr");
    row.append(
      el("th", name),
      el("td", `${(m.accuracy * 100).toFixed(1)}%`),
      el("td", m.loss.toFixed(4)),
    );
    table.append(row);
  }
  section.append(
    table,
    el(
      "p",
      `${r.initial.length} initial labelled examples, ${r.pool.length} pool examples, ${r.validation.length} fixed validation examples; ${r.excluded} copies excluded. Both methods acquire exactly ${r.budget} labels (${r.overlap} overlap allowed), then train fresh heads from the same initial seed ${r.settings.seed}, ${r.settings.epochs} epochs, learning rate ${r.settings.learningRate}, batch size ${r.settings.batchSize}, L2 ${r.settings.l2}. Counts/settings/features/validation match; equal compute time is not assumed. Smallest probability margin uses only initial-model predictions, never pool truth or validation scores.`,
    ),
    el(
      "p",
      `Actual mean parameter changes: uncertainty ${r.uncertainty.meanParameterChange.toExponential(3)}, random ${r.random.meanParameterChange.toExponential(3)}. Only classifier parameters learn; the encoder and detector stay frozen. Confidence is not accuracy. Labels for initial/validation cohorts are used only in the predeclared balanced design; validation is never used to select settings, epochs or batches.`,
    ),
    el(
      "p",
      "The experiment and generated data stay in page memory. Download the numerical report explicitly to keep settings, image fingerprints, selections, measurements and browser metadata. No images, features or model weights are included; no upload occurs. Reload clears the in-app result.",
    ),
  );
  const save = el("button", "Download example comparison (.json)");
  save.className = "button";
  save.type = "button";
  save.dataset.testid = "tr-acquisition-export";
  save.disabled = options.busy;
  save.addEventListener("click", () => download(options.result!));
  section.append(save);
  return section;
}
