import type {
  LearningRound,
  LearningRoundPlan,
} from "../learning/learning-round";
import type { ModelRecord } from "../learning/types";
export interface RoundResult {
  modelId: string;
  source: ModelRecord;
  plan: LearningRoundPlan;
  run: LearningRound;
}
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text = "") => {
  const n = document.createElement(tag);
  n.textContent = text;
  return n;
};
export function learningRoundPanel(
  result: RoundResult | null,
  progress: string,
  running: boolean,
  cancel: () => void,
) {
  const section = el("section");
  section.className = "panel ds-panel";
  section.append(el("h2", "Human-feedback round — measured validation"));
  const status = el(
    "p",
    progress ||
      "After one approval commit, choose Retrain approved batch beside its saved source. This first round requires a source without a per-label cap and no later dataset edits.",
  );
  status.id = "tr-round-status";
  status.setAttribute("role", "status");
  section.append(status);
  if (running) {
    const b = el("button", "Cancel feedback round");
    b.type = "button";
    b.className = "button stop";
    b.dataset.testid = "tr-round-cancel";
    b.addEventListener("click", cancel);
    section.append(b);
  }
  if (!result) return section;
  const { source, plan, run } = result;
  const control = run.control.after!,
    after = run.expanded.after!;
  const summary = el("p");
  summary.dataset.testid = "tr-round-result";
  summary.dataset.controlAccuracy = String(control.accuracy);
  summary.dataset.afterAccuracy = String(after.accuracy);
  summary.dataset.weightChange = String(run.expanded.evidence.meanAbsChange);
  summary.textContent = `On these ${plan.validation.length} unchanged validation photos, expanded-data accuracy ${after.accuracy > control.accuracy ? "improved" : after.accuracy < control.accuracy ? "got worse" : "did not change"} versus the fresh same-data control. ${plan.added.length} human-approved training photos were added. This does not establish a general improvement.`;
  const table = el("table");
  table.className = "ds-table";
  const heading = el("tr");
  for (const h of ["Model", "Validation accuracy", "Prediction loss"])
    heading.append(el("th", h));
  table.append(heading);
  for (const [name, evaluation] of [
    ["Saved source on current features", run.savedSource],
    ["Before: fresh same-data control", control],
    ["After: fresh expanded-data classifier", after],
  ] as const) {
    const row = el("tr");
    row.append(
      el("th", name),
      el("td", `${(evaluation.accuracy * 100).toFixed(1)}%`),
      el("td", evaluation.loss.toFixed(4)),
    );
    table.append(row);
  }
  section.append(
    summary,
    table,
    el(
      "p",
      `Source ${source.name} (version ${source.datasetVersion}); current version ${plan.datasetVersion}. Both fresh heads start from the same seeded initial weights and use learning rate ${source.settings.learningRate}, seed ${source.settings.seed}, ${source.settings.epochs} epochs, batch size ${source.settings.batchSize}, L2 ${source.settings.l2 ?? 0}. Training counts: ${plan.train.length} before, ${plan.train.length + plan.added.length} after. Equal epochs are not equal compute. The encoder remains frozen; EfficientDet is not retrained.`,
    ),
    el(
      "p",
      `${run.expanded.evidence.count} classifier parameters trained; mean absolute change from initial parameters ${run.expanded.evidence.meanAbsChange.toExponential(3)}. The fresh same-data control uses the same current features to reduce historical encoder differences. It is not a random-selection learning arm. Confidence is not accuracy; repeated validation tuning can overfit.`,
    ),
    el(
      "p",
      "The expanded classifier appears in the normal results below and can be saved explicitly. The in-session comparison clears on reload or detected dataset/source changes. Saving the expanded model also preserves numerical round evidence, visible in Saved models and its report. No test photos were opened or final-test choices changed. An earlier final test cannot become untouched again; use fresh held-out data for a new independent final claim. A separate generated-shapes experiment compares equal-budget uncertainty and random acquisition with simulated labels; it does not establish which method works better on your personal photos.",
    ),
  );
  return section;
}
