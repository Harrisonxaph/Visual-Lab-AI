import { FailureLogStore } from "../failures/store";
import type { FailureNote } from "../failures/types";
import type { TrackSnapshot } from "../tracking/types";
import type { DetectorConfiguration } from "../inference/types";
import { catalogFor } from "../data/coco-labels";
export function mountFailureLog(
  container: HTMLElement,
  model: DetectorConfiguration,
  context: () => {
    sessionId: number;
    segment: number;
    selected: TrackSnapshot | null;
    threshold: number;
  },
) {
  const store = new FailureLogStore();
  store.load();
  container.insertAdjacentHTML(
    "beforeend",
    `<p>User reports are not verified truth, approved corrections or training. Metadata only; no images. Limit: 100 notes / 256 KiB in page memory and saved storage. Free text may contain personal information you enter. Browser storage is not encrypted or guaranteed durable.</p><label>Report type <select id="failure-type"><option value="missed">Missed object</option><option value="incorrect">Incorrect detection (selected track)</option><option value="unstable">Unstable detection (selected track)</option></select></label><label>Expected category <select id="failure-label"><option value="">Unknown</option></select></label><label for="failure-text">Optional note (500 characters)</label><textarea id="failure-text" maxlength="1000"></textarea><button id="add-failure" type="button">Add failure note</button><label><input type="checkbox" id="save-failures"> Save notes on this device</label><button id="clear-failures" type="button">Clear all failure notes</button><p id="failure-status" role="status"></p><ul id="failure-list"></ul>`,
  );
  const q = <T extends HTMLElement = HTMLElement>(id: string) =>
    container.querySelector<T>(id)!;
  for (const name of catalogFor(model)?.labels ?? []) {
    const o = document.createElement("option");
    o.value = name;
    o.textContent = name;
    q("#failure-label").append(o);
  }
  const update = () => {
    q("#failure-status").textContent = store.status;
    const list = q("#failure-list");
    list.replaceChildren(
      ...store.entries.map((n) => {
        const li = document.createElement("li"),
          text = document.createElement("p"),
          button = document.createElement("button");
        text.textContent = `${n.createdAt} · User-reported ${n.type} · expected ${n.expectedLabel ?? "Unknown"} · ${store.isSaved(n.id) ? "saved on device" : "page memory / unsaved"}: ${n.text}`;
        button.textContent = "Delete note";
        button.setAttribute("aria-label", `Delete note ${n.id}`);
        button.addEventListener("click", () => {
          store.remove(n.id);
          update();
        });
        li.append(text, button);
        return li;
      }),
    );
  };
  q<HTMLInputElement>("#save-failures").addEventListener("change", (e) => {
    store.setPersistence((e.target as HTMLInputElement).checked);
    update();
  });
  q("#clear-failures").addEventListener("click", () => {
    store.clearAll();
    update();
  });
  q("#add-failure").addEventListener("click", () => {
    const c = context(),
      type = q<HTMLSelectElement>("#failure-type").value as FailureNote["type"],
      t = type === "missed" ? null : c.selected;
    const note: FailureNote = {
      id: crypto.randomUUID(),
      type,
      createdAt: new Date().toISOString(),
      userReported: true,
      sessionId: c.sessionId,
      segment: t?.segment ?? c.segment,
      trackId: t?.id ?? null,
      model: { name: model.name, version: model.version, sha256: model.sha256 },
      thresholds: {
        model: model.floor,
        tracking: Math.max(0.25, model.floor),
        display: c.threshold,
      },
      observed: t
        ? {
            atMs: t.lastMatchedAtMs,
            ageMs: Math.max(0, performance.now() - t.lastMatchedAtMs),
            label: t.label,
            score: t.score,
            box: { ...t.box },
          }
        : null,
      expectedLabel: q<HTMLSelectElement>("#failure-label").value || null,
      text: q<HTMLTextAreaElement>("#failure-text").value,
    };
    store.add(note);
    update();
  });
  update();
  return {
    destroy() {
      container.replaceChildren();
    },
  };
}
