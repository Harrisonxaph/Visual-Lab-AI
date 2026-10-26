import { expect, test, vi } from "vitest";
import {
  FailureLogStore,
  FAILURE_KEY,
  encodedSize,
} from "../src/failures/store";
import type { FailureNote } from "../src/failures/types";
export const note = (id = "n1"): FailureNote => ({
  id,
  type: "missed",
  createdAt: "2026-10-26T10:00:00.000Z",
  userReported: true,
  sessionId: 1,
  segment: 1,
  trackId: null,
  model: { name: "Lite0", version: "v1", sha256: "a".repeat(64) },
  thresholds: { model: 0.05, tracking: 0.25, display: 0.5 },
  observed: null,
  expectedLabel: "cup",
  text: "test",
});
function storage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: vi.fn((k: string) => data.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => {
      data.set(k, v);
    }),
    removeItem: vi.fn((k: string) => {
      data.delete(k);
    }),
  };
}
test("memory by default, explicit save, opt-out preserves saved data; reload never opts in", () => {
  const s = storage(),
    a = new FailureLogStore(() => s);
  a.load();
  expect(a.add(note()).ok).toBe(true);
  expect(s.setItem).not.toHaveBeenCalled();
  a.setPersistence(true);
  expect(s.data.has(FAILURE_KEY)).toBe(true);
  a.setPersistence(false);
  a.add(note("n2"));
  const b = new FailureLogStore(() => s);
  b.load();
  expect(b.entries.map((e) => e.id)).toEqual(["n1"]);
  expect(b.persistence).toBe(false);
  expect(a.remove("n1").ok).toBe(true);
  expect(s.data.has(FAILURE_KEY)).toBe(false);
  expect(a.entries.map((e) => e.id)).toEqual(["n2"]);
});
test("denied property access and repeated failed writes retain bounded canonical RAM", () => {
  const a = new FailureLogStore(() => {
    throw new Error("denied");
  });
  a.load();
  a.setPersistence(true);
  for (let i = 0; i < 100; i++) expect(a.add(note(String(i))).ok).toBe(true);
  expect(a.add(note("overflow")).ok).toBe(false);
  expect(a.entries.length).toBe(100);
  expect(a.status).toMatch(/limit/i);
});
test("UTF-8 limit applies before save even in RAM; unknown fields and invalid labels/scores rejected", () => {
  const a = new FailureLogStore(() => storage());
  let rejected = false;
  for (let i = 0; i < 100; i++) {
    const n = note(String(i));
    n.text = "🧪".repeat(500);
    n.model.name = "m".repeat(120);
    n.model.version = "v".repeat(120);
    n.type = "incorrect";
    n.trackId = 1;
    n.observed = {
      atMs: 1,
      ageMs: 1,
      label: "cup",
      score: 0.8,
      box: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
    };
    if (!a.add(n).ok) {
      rejected = true;
      break;
    }
  }
  expect(rejected).toBe(true);
  expect(encodedSize(a.entries)).toBeLessThanOrEqual(256 * 1024);
  for (const n of [
    { ...note(), text: "a".repeat(501) },
    { ...note(), expectedLabel: "dragon" },
    { ...note(), image: "hidden" },
    { ...note(), type: "incorrect" },
    { ...note(), thresholds: { model: NaN, tracking: 0.25, display: 0.5 } },
  ])
    expect(a.add(n as any).ok).toBe(false);
});
test("corrupt data is preserved until reset; failed deletion retains visible saved records", () => {
  const s = storage();
  s.data.set(FAILURE_KEY, "{broken");
  const a = new FailureLogStore(() => s);
  a.load();
  a.setPersistence(true);
  a.add(note());
  expect(s.data.get(FAILURE_KEY)).toBe("{broken");
  expect(a.clearAll().ok).toBe(true);
  a.add(note());
  expect(s.data.has(FAILURE_KEY)).toBe(true);
  s.removeItem.mockImplementation(() => {
    throw new Error("denied");
  });
  expect(a.clearAll().ok).toBe(false);
  expect(a.entries).toHaveLength(1);
  expect(a.status).toMatch(/remain/i);
});
test("loaded schema, duplicate IDs and quota failures are validated, with safe copies", () => {
  const s = storage();
  s.data.set(
    FAILURE_KEY,
    JSON.stringify({ schema: 1, entries: [note(), note()] }),
  );
  const a = new FailureLogStore(() => s);
  a.load();
  expect(a.entries).toEqual([]);
  a.clearAll();
  a.add(note());
  const copy = a.entries;
  copy[0].text = "mutated";
  expect(a.entries[0].text).toBe("test");
  s.setItem.mockImplementation(() => {
    throw new Error("quota");
  });
  a.setPersistence(true);
  expect(a.entries).toHaveLength(1);
  expect(a.status).toMatch(/unsaved/i);
});
