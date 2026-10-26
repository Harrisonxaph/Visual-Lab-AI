import type { TrackSnapshot } from "../tracking/types";
import { formatScore } from "../detections";
/** Keyed buttons retain focus while observations update. No per-frame live announcements. */
export function mountTrackList(
  container: HTMLElement,
  select: (id: number) => void,
) {
  const nodes = new Map<number, HTMLButtonElement>();
  return {
    update(
      tracks: readonly TrackSnapshot[],
      selected: number | null,
      analysisStatus = "observing",
    ) {
      for (const [id, node] of nodes)
        if (!tracks.some((t) => t.id === id)) {
          node.remove();
          nodes.delete(id);
        }
      container.querySelector("p")?.remove();
      if (!tracks.length) {
        const p = document.createElement("p");
        p.textContent =
          "No confirmed tracks. Two consecutive eligible matches confirm an ID.";
        container.append(p);
      }
      for (const t of tracks) {
        let button = nodes.get(t.id);
        if (!button) {
          button = document.createElement("button");
          button.type = "button";
          button.addEventListener("click", () => select(t.id));
          nodes.set(t.id, button);
          container.append(button);
        }
        button.textContent = `#${t.id} · ${t.label} · ${formatScore(t.score)} · ${t.state}${analysisStatus === "stale" ? " (analysis stale; last observed)" : t.state !== "active" ? " (last observed)" : ""}`;
        button.setAttribute(
          "aria-label",
          `Select track ${t.id}, ${t.label}, ${t.state}`,
        );
        button.setAttribute("aria-pressed", String(selected === t.id));
      }
    },
    destroy() {
      container.replaceChildren();
      nodes.clear();
    },
  };
}
