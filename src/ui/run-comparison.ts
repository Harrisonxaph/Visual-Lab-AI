import { compareRecordedRuns } from "../learning/experiments";
import type { ModelRecord } from "../learning/types";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = "") {
  const n = document.createElement(tag);
  n.textContent = text;
  return n;
}

/** Read-only comparison of two saved runs on their identical recorded validation set. */
export function runComparisonPanel(
  models: readonly ModelRecord[],
  options: {
    leftId: string;
    rightId: string;
    disabled: boolean;
    onChange: (left: string, right: string) => void;
  },
): HTMLElement {
  const section = el("section");
  section.id = "tr-run-comparison";
  section.className = "classification-metrics";
  section.append(el("h3", "Compare saved runs"));
  if (models.length < 2) {
    section.append(
      el("p", "Save two runs to compare results on the same recorded data."),
    );
    return section;
  }
  const first = models.find((m) => m.id === options.leftId) ?? models[0];
  const second = models.find((m) => m.id === options.rightId) ?? models[1];
  const select = (id: string, value: string, label: string) => {
    const input = el("select");
    input.id = id;
    input.disabled = options.disabled;
    input.setAttribute("aria-label", label);
    models.forEach((m, i) => {
      const option = el("option", `${i + 1}. ${m.name}`);
      option.value = m.id;
      option.selected = m.id === value;
      input.append(option);
    });
    return input;
  };
  const left = select("tr-run-left", first.id, "First saved run");
  const right = select("tr-run-right", second.id, "Second saved run");
  const controls = el("div");
  controls.className = "ds-row";
  controls.append(left, right);
  section.append(controls);
  for (const input of [left, right])
    input.addEventListener("change", () =>
      options.onChange(left.value, right.value),
    );
  const result = compareRecordedRuns(first, second);
  const status = el("p");
  status.id = "tr-run-comparison-status";
  status.className = "ds-notice";
  status.textContent =
    first.id === second.id
      ? "Choose two different runs."
      : result.ok
        ? `Same recorded training and validation examples, class order and encoder; dataset version ${first.datasetVersion}. This compares saved results, not a new check of the current dataset.`
        : `Not comparable: ${result.reason}`;
  section.append(status);
  if (first.id === second.id || !result.ok) return section;
  const table = el("table");
  table.className = "ds-table";
  table.append(el("caption", "Recorded validation comparison"));
  const head = el("thead");
  const header = el("tr");
  for (const name of ["Setting or measurement", "First run", "Second run"]) {
    const th = el("th", name);
    th.scope = "col";
    header.append(th);
  }
  head.append(header);
  const body = el("tbody");
  const lastA = first.history.at(-1)!;
  const lastB = second.history.at(-1)!;
  const percent = (v: number) => `${(v * 100).toFixed(1)}%`;
  const rows = [
    [
      "Learning rate",
      first.settings.learningRate,
      second.settings.learningRate,
    ],
    ["Seed", first.settings.seed, second.settings.seed],
    [
      "Completed / planned epochs",
      `${lastA.epoch} / ${first.settings.epochs}${first.stoppedEarly ? " (stopped early)" : ""}`,
      `${lastB.epoch} / ${second.settings.epochs}${second.stoppedEarly ? " (stopped early)" : ""}`,
    ],
    ["Training photos", first.trainCount, second.trainCount],
    ["Validation photos", first.validationCount, second.validationCount],
    ["Training loss", lastA.trainLoss.toFixed(3), lastB.trainLoss.toFixed(3)],
    [
      "Validation loss",
      lastA.validationLoss!.toFixed(3),
      lastB.validationLoss!.toFixed(3),
    ],
    [
      "Validation accuracy",
      percent(lastA.validationAccuracy!),
      percent(lastB.validationAccuracy!),
    ],
  ];
  for (const [name, a, b] of rows) {
    const row = el("tr");
    const th = el("th", String(name));
    th.scope = "row";
    row.append(th, el("td", String(a)), el("td", String(b)));
    body.append(row);
  }
  table.append(head, body);
  const scroll = el("div");
  scroll.className = "metric-table-scroll";
  scroll.tabIndex = 0;
  scroll.setAttribute("role", "region");
  scroll.setAttribute("aria-label", "Recorded run comparison");
  scroll.append(table);
  section.append(
    scroll,
    el(
      "p",
      result.changes.length
        ? `Run differences: ${result.changes.join(", ")}. When several settings change, this comparison cannot isolate which change caused a difference.`
        : "The recorded settings match. Repeating a run checks reproducibility, not improvement.",
    ),
    el(
      "p",
      "These are validation results used while choosing settings, not a final test score or proof of general improvement. Small samples and repeated tuning can mislead. Test photos remain sealed.",
    ),
  );
  return section;
}
