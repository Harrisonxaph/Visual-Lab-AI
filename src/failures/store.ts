import { COCO_CATALOG } from "../data/coco-labels";
import type { FailureNote, StoreResult } from "./types";
export const FAILURE_KEY = "visual-labs.phase2.failure-notes.v1";
const MAX_BYTES = 256 * 1024,
  MAX_ENTRIES = 100;
export const encodedSize = (entries: readonly FailureNote[]) =>
  new TextEncoder().encode(JSON.stringify({ schema: 1, entries })).length;
const finite = (n: unknown) => typeof n === "number" && Number.isFinite(n);
const exact = (obj: unknown, keys: string[]): obj is Record<string, any> =>
  !!obj &&
  typeof obj === "object" &&
  !Array.isArray(obj) &&
  Object.keys(obj).length === keys.length &&
  keys.every((k) => Object.hasOwn(obj, k));
function valid(n: unknown): n is FailureNote {
  if (
    !exact(n, [
      "id",
      "type",
      "createdAt",
      "userReported",
      "sessionId",
      "segment",
      "trackId",
      "model",
      "thresholds",
      "observed",
      "expectedLabel",
      "text",
    ])
  )
    return false;
  if (
    typeof n.id !== "string" ||
    !n.id ||
    n.id.length > 100 ||
    !["missed", "incorrect", "unstable"].includes(n.type) ||
    n.userReported !== true ||
    typeof n.createdAt !== "string" ||
    !/^\d{4}-\d\d-\d\dT/.test(n.createdAt) ||
    !Number.isFinite(Date.parse(n.createdAt)) ||
    typeof n.text !== "string" ||
    Array.from(n.text).length > 500 ||
    !(
      n.expectedLabel === null ||
      COCO_CATALOG.labels.some((l) => l === n.expectedLabel)
    )
  )
    return false;
  if (
    ![n.sessionId, n.segment].every((x) => Number.isSafeInteger(x) && x >= 0) ||
    !(n.trackId === null || (Number.isSafeInteger(n.trackId) && n.trackId > 0))
  )
    return false;
  if (
    !exact(n.model, ["name", "version", "sha256"]) ||
    ![n.model.name, n.model.version].every(
      (x) => typeof x === "string" && x.length > 0 && x.length <= 120,
    ) ||
    typeof n.model.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(n.model.sha256)
  )
    return false;
  if (
    !exact(n.thresholds, ["model", "tracking", "display"]) ||
    !Object.values(n.thresholds).every((x) => finite(x) && x >= 0 && x <= 1) ||
    n.thresholds.tracking < n.thresholds.model ||
    n.thresholds.display < n.thresholds.model
  )
    return false;
  if (n.observed === null) return n.type === "missed" && n.trackId === null;
  const o = n.observed;
  if (
    !exact(o, ["atMs", "ageMs", "label", "score", "box"]) ||
    !finite(o.atMs) ||
    o.atMs < 0 ||
    !finite(o.ageMs) ||
    o.ageMs < 0 ||
    !finite(o.score) ||
    o.score < 0 ||
    o.score > 1 ||
    typeof o.label !== "string" ||
    !COCO_CATALOG.labels.some((l) => l === o.label) ||
    !exact(o.box, ["x", "y", "width", "height"])
  )
    return false;
  const b = o.box;
  return (
    Object.values(b).every(finite) &&
    b.x >= 0 &&
    b.y >= 0 &&
    b.width > 0 &&
    b.height > 0 &&
    b.x + b.width <= 1 + 1e-12 &&
    b.y + b.height <= 1 + 1e-12 &&
    n.trackId !== null
  );
}
export class FailureLogStore {
  private notes: FailureNote[] = [];
  private saved = new Set<string>();
  private corrupt = false;
  private loaded = false;
  persistence = false;
  status = "Notes are in page memory only.";
  constructor(
    private storage: () => Pick<
      Storage,
      "getItem" | "setItem" | "removeItem"
    > = () => window.localStorage,
  ) {}
  get entries() {
    return structuredClone(this.notes);
  }
  private result(ok: boolean, message: string): StoreResult {
    this.status = message;
    return { ok, message };
  }
  load() {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const raw = this.storage().getItem(FAILURE_KEY);
      if (raw === null) return;
      const parsed = JSON.parse(raw);
      if (
        !exact(parsed, ["schema", "entries"]) ||
        parsed.schema !== 1 ||
        !Array.isArray(parsed.entries) ||
        parsed.entries.length > MAX_ENTRIES ||
        !parsed.entries.every(valid) ||
        new Set(parsed.entries.map((n: FailureNote) => n.id)).size !==
          parsed.entries.length ||
        encodedSize(parsed.entries) > MAX_BYTES ||
        new TextEncoder().encode(raw).length > MAX_BYTES
      )
        throw new Error("Invalid schema");
      this.notes = parsed.entries;
      this.saved = new Set(this.notes.map((n) => n.id));
      this.status =
        "Previously saved notes loaded; saving new notes remains off.";
    } catch {
      this.corrupt = true;
      this.status =
        "Saved notes unreadable or storage unavailable. Saved data preserved until explicit Clear all.";
    }
  }
  private persist() {
    if (this.corrupt)
      return this.result(
        false,
        "Unsaved: unreadable saved data is preserved; Clear all to reset.",
      );
    try {
      if (this.notes.length)
        this.storage().setItem(
          FAILURE_KEY,
          JSON.stringify({ schema: 1, entries: this.notes }),
        );
      else this.storage().removeItem(FAILURE_KEY);
      this.saved = new Set(this.notes.map((n) => n.id));
      return this.result(
        true,
        "Notes saved on this device. Browser storage is not encrypted or guaranteed durable.",
      );
    } catch {
      return this.result(
        false,
        "Unsaved: storage unavailable or quota exceeded. Notes remain in bounded page memory.",
      );
    }
  }
  setPersistence(enabled: boolean) {
    this.persistence = enabled;
    if (enabled) return this.persist();
    return this.result(
      true,
      "Saving off. Previously saved notes remain until explicitly deleted.",
    );
  }
  add(note: FailureNote) {
    if (!valid(note))
      return this.result(
        false,
        "Invalid note metadata or label. Text limit: 500 characters.",
      );
    if (this.notes.some((n) => n.id === note.id))
      return this.result(false, "Duplicate note ID.");
    const next = [...this.notes, structuredClone(note)];
    if (next.length > MAX_ENTRIES || encodedSize(next) > MAX_BYTES)
      return this.result(
        false,
        "Note limit reached: 100 entries / 256 KiB. Delete notes before adding more.",
      );
    this.notes = next;
    if (this.persistence) {
      this.persist();
      return { ok: true, message: this.status };
    }
    return this.result(true, "Added user report to page memory only.");
  }
  remove(id: string) {
    const next = this.notes.filter((n) => n.id !== id);
    if (next.length === this.notes.length)
      return this.result(false, "Note not found.");
    if (this.saved.has(id)) {
      try {
        const remaining = this.persistence
          ? next
          : next.filter((n) => this.saved.has(n.id));
        if (remaining.length)
          this.storage().setItem(
            FAILURE_KEY,
            JSON.stringify({ schema: 1, entries: remaining }),
          );
        else this.storage().removeItem(FAILURE_KEY);
        this.saved = new Set(remaining.map((n) => n.id));
      } catch {
        return this.result(
          false,
          "Deletion failed. Saved note remains visible and on this device.",
        );
      }
    }
    this.notes = next;
    return this.result(true, "Entry deleted. Other saved notes remain.");
  }
  clearAll() {
    try {
      this.storage().removeItem(FAILURE_KEY);
    } catch {
      return this.result(
        false,
        "Deletion failed. Notes remain; saved data may still exist on this device.",
      );
    }
    this.notes = [];
    this.saved.clear();
    this.corrupt = false;
    return this.result(
      true,
      "All failure notes removed from this page and saved storage key.",
    );
  }
  isSaved(id: string) {
    return this.saved.has(id);
  }
}
