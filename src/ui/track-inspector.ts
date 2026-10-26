import type { TrackingController } from "../inspection/controller";
import { formatScore } from "../detections";
export function mountTrackInspector(container: HTMLElement) {
  const summary = document.createElement("p"),
    history = document.createElement("p"),
    association = document.createElement("p"),
    events = document.createElement("ol"),
    near = document.createElement("ul"),
    explanation = document.createElement("p"),
    alternatives = document.createElement("p");
  alternatives.id = "alternatives";
  alternatives.textContent =
    "Alternative class scores not supplied by this detector adapter.";
  explanation.textContent =
    "Near-threshold results are actual returned boxes within 10 score points below the display threshold. Model floor, postprocessing and result cap can omit others. These are not recovered discarded proposals.";
  container.append(
    summary,
    history,
    association,
    events,
    alternatives,
    explanation,
    near,
  );
  return {
    update(view: ReturnType<TrackingController["projection"]>) {
      const t = view.selected;
      summary.textContent = t
        ? `Track #${t.id} · ${t.label} · ${t.state} · ${view.status === "observing" && t.state === "active" ? "observed" : "last observed"} ${formatScore(t.score)}. Segment ${t.segment}.`
        : `Select a confirmed track. Analysis ${view.status}.`;
      history.textContent = t
        ? `Retained ${t.samples.length} samples: ${t.samples[0]?.atMs ?? "Unknown"}–${t.samples.at(-1)?.atMs ?? "Unknown"} ms; last matched ${t.lastMatchedAtMs} ms. Lifetime matches ${t.matchedFrames}. Pruned histories ${view.snapshot.counters.droppedHistories}; pruned events ${view.snapshot.counters.droppedEvents}.`
        : "Histories are bounded to 200 samples / 20 seconds per track.";
      const e = view.currentAssociation;
      association.textContent = e
        ? `${e.status} association at ${e.atMs} ms: IoU ${e.iou.toFixed(3)}, distance ${e.distance.toFixed(3)}, class penalty ${e.classPenalty}, cost ${e.cost.toFixed(3)}. Geometry is heuristic evidence, not model reasoning.`
        : "No current association for this selection.";
      events.replaceChildren(
        ...view.events.map((e) => {
          const li = document.createElement("li");
          li.textContent = `${e.atMs} ms · ${e.kind}: ${e.reason}${e.evidence ? ` · IoU ${e.evidence.iou.toFixed(3)}, distance ${e.evidence.distance.toFixed(3)}, class penalty ${e.evidence.classPenalty}, cost ${e.evidence.cost.toFixed(3)}` : ""}`;
          return li;
        }),
      );
      near.replaceChildren(
        ...view.near.map((d) => {
          const li = document.createElement("li");
          li.textContent = `${d.label} ${formatScore(d.score)} · returned box ${[d.box.x, d.box.y, d.box.width, d.box.height].map((n) => n.toFixed(3)).join(", ")}`;
          return li;
        }),
      );
      if (!view.near.length) {
        const li = document.createElement("li");
        li.textContent = "No returned boxes in the near-threshold band.";
        near.append(li);
      }
    },
    destroy() {
      container.replaceChildren();
    },
  };
}
