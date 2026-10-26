import { test, expect, vi } from "vitest";
import { drawDetections } from "../src/overlay";
test("overlay uses exact committed associations for shared-origin boxes, never geometry guesses", () => {
  const labels: string[] = [];
  const ctx = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    measureText: () => ({ width: 100 }),
    fillText: (s: string) => labels.push(s),
  };
  const canvas = { width: 100, height: 100, getContext: () => ctx } as any;
  const box = { x: 10, y: 10, width: 20, height: 20 };
  drawDetections(
    canvas,
    [
      { label: "cup", score: 0.8, box, trackId: 1 },
      { label: "cup", score: 0.1, box: { ...box, width: 10 }, trackId: null },
    ] as any,
    100,
    100,
    [
      {
        id: 1,
        label: "cup",
        box: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
        samples: [],
        lastMatchedAtMs: 0,
      },
    ] as any,
  );
  expect(labels).toEqual(["#1 cup  80%", "cup  10%"]);
});
