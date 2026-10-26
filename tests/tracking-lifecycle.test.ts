import { expect, test } from "vitest";
import { Tracker, associationEvidence } from "../src/tracking/tracker";
import type {
  NormalizedDetection,
  NormalizedFrame,
} from "../src/tracking/types";
export const detection = (
  score = 0.8,
  x = 0.2,
  label = "cup",
  sourceIndex = 0,
): NormalizedDetection => ({
  score,
  label,
  sourceIndex,
  box: { x, y: 0.2, width: 0.1, height: 0.1 },
});
export const frame = (
  sequence: number,
  at = sequence * 100,
  detections: NormalizedDetection[] = [detection()],
  segment = 1,
): NormalizedFrame => ({
  sessionId: 1,
  segment,
  geometry: 1,
  sequence,
  sampledAtMs: at,
  completedAtMs: at + 10,
  width: 640,
  height: 480,
  detections,
});
function tracker() {
  const t = new Tracker();
  t.startSession(1);
  return t;
}
test("IDs allocated only after consecutive confirmation; loss, reacquisition, class fluctuation", () => {
  const t = tracker();
  expect(t.update(frame(1)).tracks).toEqual([]);
  expect(t.update(frame(2)).associations[0]).toBe(1);
  expect(t.update(frame(3, 300, [])).tracks[0].state).toBe("lost");
  t.update(frame(4, 400, []));
  expect(
    t.snapshot().events.filter((e) => e.kind === "temporary-loss"),
  ).toHaveLength(1);
  const r = t.update(frame(5, 500, [detection(0.8, 0.2, "bottle")]));
  expect(r.associations[0]).toBe(1);
  expect(r.events.map((e) => e.kind)).toEqual([
    "entry",
    "temporary-loss",
    "reacquired",
    "class-change",
  ]);
  expect(r.tracks[0].samples.some((s) => s.score === null)).toBe(true);
  expect(r.tracks[0].gapMs).toBe(300);
});
test("retention includes 1500 ms and expiry before matching beyond it", () => {
  const t = tracker();
  t.update(frame(1));
  t.update(frame(2));
  expect(t.update(frame(3, 1700)).associations[0]).toBe(1);
  const expired = t.update(frame(4, 3201));
  expect(expired.associations[0]).toBeNull();
  expect(expired.tracks.find((t) => t.id === 1)?.gapMs).toBe(1500);
  expect(expired.events.find((e) => e.kind === "exit")?.deadlineMs).toBe(3200);
  expect(t.update(frame(5, 3301)).associations[0]).toBe(2);
});
test(".25 floor applies independently to birth/update; tentative drops never advance IDs", () => {
  const t = tracker();
  t.update(frame(1, 100, [detection(0.249)]));
  expect(t.snapshot().counters.candidates).toBe(0);
  t.update(frame(2, 200, [detection(0.25)]));
  t.update(frame(3, 300, []));
  t.update(frame(4, 400, [detection(0.25)]));
  expect(t.update(frame(5, 500, [detection(0.25)])).associations[0]).toBe(1);
  expect(t.update(frame(6, 600, [detection(0.249)])).tracks[0].state).toBe(
    "lost",
  );
  for (const floor of [NaN, 0.049, 1.01])
    expect(
      () => new Tracker({ modelFloor: 0.05, trackingFloor: floor }),
    ).toThrow();
  expect(new Tracker({ modelFloor: 0.5 }).config.trackingFloor).toBe(0.5);
});
test("duplicate, invalid, old segment and foreign session frames cannot mutate state", () => {
  const t = tracker();
  t.update(frame(1));
  const before = t.snapshot();
  for (const f of [
    frame(1),
    frame(0),
    { ...frame(2), sessionId: 2 },
    frame(2, 90),
    { ...frame(2), width: NaN },
    { ...frame(2), completedAtMs: 0 },
  ])
    expect(() => t.update(f)).toThrow();
  expect(t.snapshot()).toEqual(before);
  t.endSegment("pause", 150);
  const ended = t.snapshot();
  t.endSegment("pause", 160);
  expect(t.snapshot()).toEqual(ended);
  expect(() => t.update(frame(2))).toThrow();
  expect(t.update(frame(2, 200, [detection()], 2)).associations[0]).toBeNull();
  expect(t.snapshot().events.filter((e) => e.kind === "exit")).toHaveLength(0);
});
test("300-frame low-score noise keeps one ID with exactly 14700 exclusions", () => {
  const t = tracker();
  for (let i = 1; i <= 300; i++) {
    const noise = Array.from({ length: 49 }, (_, j) => ({
      ...detection(
        0.05 + (j % 20) * 0.01,
        ((j * 7 + i) % 85) / 100,
        "noise",
        j + 1,
      ),
    }));
    const r = t.update(frame(i, i * 100, [detection(), ...noise]));
    expect(r.associations[0]).toBe(i === 1 ? null : 1);
  }
  expect(t.snapshot().counters).toMatchObject({
    candidates: 1,
    confirmations: 1,
    publicIds: 1,
    losses: 0,
    expiries: 0,
    tentativeDrops: 0,
    belowFloor: 14700,
    peakLive: 1,
    eligible: 300,
    capacityDrops: 0,
  });
  expect(t.snapshot().tracks[0].samples.length).toBeLessThanOrEqual(200);
  expect(t.snapshot().tracks[0].samples[0].atMs).toBeGreaterThanOrEqual(10000);
});
test("gates are inclusive for area, IoU and unit-diagonal distance; forbidden beyond", () => {
  const a = detection().box;
  expect(
    associationEvidence(a, "cup", "active", {
      ...detection(),
      box: { ...a, width: 0.05, height: 0.05 },
    }),
  ).not.toBeNull();
  expect(
    associationEvidence(a, "cup", "active", {
      ...detection(),
      box: { ...a, width: 0.049, height: 0.05 },
    }),
  ).toBeNull();
  const dist = 0.15 * Math.SQRT2;
  expect(
    associationEvidence(a, "cup", "active", detection(0.8, a.x + dist)),
  ).not.toBeNull();
  expect(
    associationEvidence(
      a,
      "cup",
      "active",
      detection(0.8, a.x + dist + 0.00001),
    ),
  ).toBeNull();
  const eqIoU = { ...a, x: a.x + (0.1 * 9) / 11 };
  expect(
    associationEvidence(a, "cup", "active", { ...detection(), box: eqIoU })
      ?.iou,
  ).toBeCloseTo(0.1);
});
test("bounded capacity, history, events and independent snapshots", () => {
  const t = tracker();
  const group = (x: number) =>
    Array.from({ length: 50 }, (_, j) => ({ ...detection(0.8, x, "cup", j) }));
  t.update(frame(1, 100, group(0.05)));
  t.update(frame(2, 200, group(0.05)));
  t.update(frame(3, 300, group(0.45)));
  t.update(frame(4, 400, group(0.45)));
  const full = t.update(frame(5, 500, group(0.85)));
  expect(full.counters.capacityDrops).toBe(50);
  expect(full.counters.peakLive).toBe(100);
  t.endSegment("pause", 550);
  for (let segment = 2; segment <= 25; segment++) {
    t.update(frame(segment * 2 + 2, segment * 1000, group(0.05), segment));
    t.update(
      frame(segment * 2 + 3, segment * 1000 + 100, group(0.05), segment),
    );
    t.endSegment("pause", segment * 1000 + 200);
  }
  const snap = t.snapshot();
  expect(snap.tracks.length).toBeLessThanOrEqual(100);
  expect(snap.events.length).toBeLessThanOrEqual(1000);
  expect(snap.counters.droppedHistories).toBeGreaterThan(0);
  expect(snap.counters.droppedEvents).toBeGreaterThan(0);
  snap.tracks[0].samples.length = 0;
  expect(t.snapshot().tracks[0].samples.length).toBeGreaterThan(0);
});
