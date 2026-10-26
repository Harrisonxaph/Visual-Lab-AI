import { expect, test } from "vitest";
import { Tracker } from "../src/tracking/tracker";
import { describeTrackQuality } from "../src/tracking/quality";
import type { NormalizedFrame } from "../src/tracking/types";
test("live quality is descriptive; real identity metrics remain unavailable", () => {
  const t = new Tracker();
  t.startSession(1);
  const f = (sequence: number, score: number): NormalizedFrame => ({
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
        sourceIndex: 0,
        label: "cup",
        score,
        box: { x: 0.2, y: 0.2, width: 0.2, height: 0.2 },
      },
    ],
  });
  t.update(f(1, 0.6));
  t.update(f(2, 0.8));
  const q = describeTrackQuality(t.snapshot().tracks[0]);
  expect(q.matchedFrames).toBe(2);
  expect(q.observedSpanMs).toBe(100);
  expect(q.scoreStandardDeviation).toBeCloseTo(0.1);
  expect(q.medianMotionProxy).toBe(0);
  expect(q.idSwitches).toBeNull();
  expect(q.fragmentation).toBeNull();
});
