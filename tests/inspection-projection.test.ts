import { expect, test } from "vitest";
import { nearThresholdDetections } from "../src/inspection/projection";
import { confidenceSegments } from "../src/ui/confidence-chart";
import { TrackingController } from "../src/inspection/controller";
const d = (score: number) => ({
  label: "cup",
  score,
  box: { x: 10, y: 10, width: 20, height: 20 },
});
test("near-threshold view contains only returned valid boxes with inclusive lower/exclusive upper bounds", () => {
  expect(
    nearThresholdDetections(
      [0.39, 0.4, 0.49, 0.5, 0.01, NaN].map(d),
      100,
      100,
      0.05,
      0.5,
    ).map((x) => x.score),
  ).toEqual([0.49, 0.4]);
  expect(nearThresholdDetections([d(0.05)], 100, 100, 0.05, 0.05)).toEqual([]);
  expect(
    nearThresholdDetections(
      [{ ...d(0.49), box: { x: 200, y: 0, width: 10, height: 10 } }],
      100,
      100,
      0.05,
      0.5,
    ),
  ).toEqual([]);
  expect(
    nearThresholdDetections(
      Array.from({ length: 15 }, () => d(0.49)),
      100,
      100,
      0.05,
      0.5,
    ),
  ).toHaveLength(10);
});
test("confidence segments use original times/scores and never bridge a null observation", () => {
  const sample = (atMs: number, score: number | null) => ({
    atMs,
    score,
    label: score === null ? null : "cup",
    box: null,
  });
  expect(
    confidenceSegments([
      sample(10, 0.995),
      sample(25, 0.5),
      sample(30, null),
      sample(99, 0.7),
    ]),
  ).toEqual([
    [
      { atMs: 10, score: 0.995 },
      { atMs: 25, score: 0.5 },
    ],
    [{ atMs: 99, score: 0.7 }],
  ]);
});
test("slider/search projections over the noise fixture cannot change IDs or counters", () => {
  const c = new TrackingController(0.05);
  for (let sequence = 1; sequence <= 300; sequence++)
    c.onFrame({
      sessionId: 1,
      segment: 1,
      geometry: 1,
      sequence,
      sampledAtMs: sequence * 100,
      completedAtMs: sequence * 100 + 10,
      width: 100,
      height: 100,
      detections: [d(0.8), ...Array.from({ length: 49 }, () => d(0.1))],
    });
  c.select(1);
  const before = c.snapshot();
  for (const threshold of [0.05, 0.5, 1, 0.05]) {
    c.visible(threshold, 30020);
    c.projection(threshold, 30020);
  }
  expect(c.snapshot()).toEqual(before);
  expect(before.counters.belowFloor).toBe(14700);
  expect(c.projection(0.5, 33000).status).toBe("stale");
  c.select(null);
  expect(c.projection(0.5, 33000).selected).toBeNull();
});

test("selected ongoing association exposes the actual latest committed decision", () => {
  const c = new TrackingController(0.05);
  for (let sequence = 1; sequence <= 3; sequence++)
    c.onFrame({
      sessionId: 1,
      segment: 1,
      geometry: 1,
      sequence,
      sampledAtMs: sequence * 100,
      completedAtMs: sequence * 100 + 10,
      width: 100,
      height: 100,
      detections: [
        {
          ...d(0.8),
          box: { x: sequence === 3 ? 12 : 10, y: 10, width: 20, height: 20 },
        },
      ],
    });
  c.select(1);
  expect(c.projection(0.5, 320).currentAssociation).toMatchObject({
    atMs: 300,
  });
  expect(c.projection(0.5, 320).currentAssociation?.cost).toBeGreaterThan(0);
});

test("accessible confidence summary includes raw numeric values and explicit missing gaps", async () => {
  const { confidenceSummary } = await import("../src/ui/confidence-chart");
  expect(
    confidenceSummary([
      { atMs: 10, score: 0.995, label: "cup", box: null },
      { atMs: 20, score: null, label: null, box: null },
      { atMs: 30, score: 0.4, label: "cup", box: null },
    ]),
  ).toContain("10 ms: 0.995; 20 ms: missing; 30 ms: 0.4");
});
