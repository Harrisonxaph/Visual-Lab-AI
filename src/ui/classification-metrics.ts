import { classificationMetrics } from "../learning/metrics";

function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text = "",
): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  n.textContent = text;
  return n;
}

function heading(text: string, scope: "col" | "row") {
  const th = node("th", text);
  th.scope = scope;
  return th;
}

function scrollTable(table: HTMLTableElement, label: string) {
  const region = node("div");
  region.className = "metric-table-scroll";
  region.tabIndex = 0;
  region.setAttribute("role", "region");
  region.setAttribute("aria-label", label);
  region.append(table);
  return region;
}

const ratio = (value: number | null, numerator: number, denominator: number) =>
  value === null
    ? "Not measured (0 denominator)"
    : `${numerator} / ${denominator} (${(value * 100).toFixed(1)}%)`;

/** Local, read-only presentation of one existing evaluation; never reads image storage. */
export function classificationMetricsPanel(
  labels: readonly string[],
  truth: readonly number[],
  predicted: readonly number[],
  options: { id: string; title: string },
): HTMLElement {
  const m = classificationMetrics(truth, predicted, labels.length);
  const section = node("section");
  section.id = options.id;
  section.className = "classification-metrics";
  const title = node("h3", options.title);
  title.id = `${options.id}-title`;
  section.setAttribute("aria-labelledby", title.id);
  const total = node("span", String(m.total));
  total.dataset.testid = "metric-total";
  const summary = node("p", "Labelled photos checked: ");
  summary.append(
    total,
    `. Accuracy: ${ratio(m.accuracy, m.correct, m.total)}.`,
  );

  const scores = node("table");
  scores.className = "ds-table";
  scores.dataset.testid = "class-metrics";
  scores.append(node("caption", "Per-label precision and recall"));
  const head = node("thead");
  const headers = node("tr");
  for (const text of ["Label", "Actual photos", "Precision", "Recall"])
    headers.append(heading(text, "col"));
  head.append(headers);
  const body = node("tbody");
  m.perClass.forEach((c, k) => {
    const row = node("tr");
    row.append(
      heading(labels[k], "row"),
      node("td", String(c.support)),
      node("td", ratio(c.precision, c.truePositive, c.predicted)),
      node("td", ratio(c.recall, c.truePositive, c.support)),
    );
    body.append(row);
  });
  scores.append(head, body);

  const matrix = node("table");
  matrix.className = "ds-table";
  matrix.dataset.testid = "confusion-matrix";
  matrix.append(
    node("caption", "Confusion matrix: actual rows, predicted columns"),
  );
  const matrixHead = node("thead");
  const matrixHeaders = node("tr");
  matrixHeaders.append(heading("Actual / predicted", "col"));
  for (const label of labels) matrixHeaders.append(heading(label, "col"));
  matrixHead.append(matrixHeaders);
  const matrixBody = node("tbody");
  m.confusion.forEach((counts, k) => {
    const row = node("tr");
    row.append(heading(labels[k], "row"));
    for (const count of counts) row.append(node("td", String(count)));
    matrixBody.append(row);
  });
  matrix.append(matrixHead, matrixBody);
  section.append(
    title,
    summary,
    node(
      "p",
      "Precision asks: of photos predicted as this label, how many were right? Recall asks: of photos actually carrying this label, how many were found?",
    ),
    scrollTable(scores, "Per-label metrics"),
    node(
      "p",
      "Not measured means the denominator is zero. The matrix diagonal counts correct answers; other cells show which labels were confused. Small samples can move percentages a lot. These are results on these photos, not guaranteed future accuracy.",
    ),
    scrollTable(matrix, "Confusion matrix"),
  );
  return section;
}
