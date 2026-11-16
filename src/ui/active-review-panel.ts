import {
  orderReview,
  type ReviewOrder,
  type ReviewScore,
  type ReviewDecisions,
  type ReviewDecision,
} from "../learning/active-review";
import type { ModelRecord } from "../learning/types";
export interface ReviewSession {
  source: ModelRecord;
  scores: ReviewScore[];
  decisions: ReviewDecisions;
  total: number;
  excluded: number;
  deferred: number;
}
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text = "") => {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
};
export function activeReviewPanel(options: {
  session: ReviewSession | null;
  mode: ReviewOrder;
  busy: boolean;
  running: boolean;
  onCancel(): void;
  progress: string;
  thumb(id: string): HTMLCanvasElement;
  onOrder(mode: ReviewOrder): void;
  onDecision(id: string, decision: ReviewDecision): void;
  onClear(): void;
  onCommit(): void;
}) {
  const section = el("section");
  section.id = "tr-review";
  section.className = "panel ds-panel";
  section.append(
    el("h2", "Active learning — review unlabelled photos"),
    el(
      "p",
      "Choose Score unlabelled photos beside a completed saved softmax classifier. Import the pool before training/saving the current snapshot. Only unsplit, unlabelled photos are scored; known copies of protected data and pool duplicates are excluded. New review features stay in page memory; existing permitted features may be reused. No test pixels are opened.",
    ),
  );
  const status = el("p", options.progress || "No review queue yet.");
  status.id = "tr-review-status";
  status.setAttribute("role", "status");
  section.append(status);
  if (options.running) {
    const stop = el("button", "Cancel pool scoring");
    stop.type = "button";
    stop.className = "button stop";
    stop.dataset.testid = "tr-review-cancel";
    stop.addEventListener("click", options.onCancel);
    section.append(stop);
  }
  section.append(
    el(
      "p",
      "Review suggestions: accept, correct or skip. Decisions stay in page memory and clear on reload or detected snapshot/source changes. Nothing is saved until you explicitly commit approved photos to training below. Committing labels does not retrain a model or demonstrate improvement; measured retraining follows separately.",
    ),
  );
  const session = options.session;
  if (!session) return section;
  section.append(
    el(
      "p",
      `Source: ${session.source.name}; dataset version ${session.source.datasetVersion}; review seed ${session.source.settings.seed}. The classifier weights remain frozen.`,
    ),
  );
  const mode = el("select");
  mode.dataset.testid = "tr-review-order";
  mode.disabled = options.busy;
  mode.setAttribute("aria-label", "Review order");
  for (const [value, text] of [
    ["uncertainty", "Smallest probability margin first"],
    ["random", "Seeded random review order"],
  ] as const) {
    const option = el("option", text);
    option.value = value;
    option.selected = options.mode === value;
    mode.append(option);
  }
  mode.addEventListener("change", () =>
    options.onOrder(mode.value as ReviewOrder),
  );
  section.append(mode);
  const ordered = orderReview(
    session.scores,
    options.mode,
    session.source.settings.seed,
  ).slice(0, 10);
  section.append(
    el(
      "p",
      `${session.scores.length} photos scored from ${session.total} unlabelled photos; ${session.excluded} copies excluded, ${session.deferred} beyond the 50-image scoring cap. Showing ${ordered.length}. Small margin means the top two classifier probabilities are close, not proof of an error. Confidence is not accuracy; entropy uses natural logarithms. Random ordering is a review control, not a measured learning-performance baseline.`,
    ),
  );
  const list = el("ul");
  list.className = "ds-label-list";
  for (const score of ordered) {
    const row = el("li");
    row.dataset.testid = "tr-review-item";
    const label =
      session.source.labelNames[
        session.source.labelIds.indexOf(score.proposedLabelId)
      ];
    row.append(
      options.thumb(score.imageId),
      el(
        "p",
        `Suggested: ${label}. Model confidence ${(score.confidence * 100).toFixed(1)}%; margin ${score.margin.toFixed(3)}; entropy ${score.entropy.toFixed(3)}.`,
      ),
    );
    const decision = session.decisions[score.imageId];
    const selectedLabel =
      decision?.kind === "approve" ? decision.labelId : score.proposedLabelId;
    const selected = el("select");
    selected.disabled = options.busy;
    selected.setAttribute("aria-label", "Proposed correction label");
    for (const [i, id] of session.source.labelIds.entries()) {
      const option = el("option", session.source.labelNames[i]);
      option.value = id;
      option.selected = id === selectedLabel;
      selected.append(option);
    }
    const actions = el("div");
    actions.className = "ds-row";
    actions.append(selected);
    for (const [text, decision] of [
      [
        "Accept suggestion",
        () =>
          ({
            kind: "approve",
            labelId: score.proposedLabelId,
          }) as ReviewDecision,
      ],
      [
        "Use selected correction",
        () => ({ kind: "approve", labelId: selected.value }) as ReviewDecision,
      ],
      ["Skip", () => ({ kind: "skip" }) as ReviewDecision],
    ] as const) {
      const button = el("button", text);
      button.type = "button";
      button.className = "button";
      button.disabled = options.busy;
      button.addEventListener("click", () =>
        options.onDecision(score.imageId, decision()),
      );
      actions.append(button);
    }
    row.append(actions);
    row.append(
      el(
        "p",
        !decision
          ? "Pending human review"
          : decision.kind === "skip"
            ? "Skipped — page memory only"
            : `Approved label: ${session.source.labelNames[session.source.labelIds.indexOf(decision.labelId)]} — page memory only`,
      ),
    );
    list.append(row);
  }
  section.append(list);
  const decisions = Object.values(session.decisions),
    summary = el(
      "p",
      `${decisions.filter((d) => d.kind === "approve").length} approved, ${decisions.filter((d) => d.kind === "skip").length} skipped. Dataset unchanged.`,
    );
  summary.dataset.testid = "tr-review-summary";
  const clear = el("button", "Clear review queue");
  clear.type = "button";
  clear.className = "button stop";
  clear.disabled = options.busy;
  clear.addEventListener("click", options.onClear);
  const consent = el("input");
  consent.type = "checkbox";
  consent.dataset.testid = "tr-review-consent";
  consent.disabled = options.busy;
  const consentLabel = el(
    "label",
    "Save my approved labels and review provenance locally, assigning these photos to training only. Existing validation/test assignments stay unchanged. Skipped and pending photos stay unlabelled.",
  );
  consentLabel.prepend(consent);
  const commit = el("button", "Commit approved photos to training");
  commit.type = "button";
  commit.className = "button";
  commit.dataset.testid = "tr-review-commit";
  commit.disabled = true;
  consent.addEventListener("change", () => {
    commit.disabled =
      options.busy ||
      !consent.checked ||
      !decisions.some((d) => d.kind === "approve");
  });
  commit.addEventListener("click", () => {
    if (consent.checked && !commit.disabled) options.onCommit();
  });
  section.append(summary, consentLabel, commit, clear);
  return section;
}
