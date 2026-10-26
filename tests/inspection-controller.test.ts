import { expect, test } from "vitest";
import { TrackingController } from "../src/inspection/controller";
const f = (sequence: number, segment = 1, at = sequence * 100) => ({
  sessionId: 1,
  segment,
  geometry: 1,
  sequence,
  sampledAtMs: at,
  completedAtMs: at + 10,
  width: 100,
  height: 100,
  detections: [
    { label: "cup", score: 0.8, box: { x: 20, y: 20, width: 10, height: 10 } },
  ],
});
test("controller consumes once, projections do not update tracker and gaps start segments", () => {
  const c = new TrackingController(0.05);
  c.onFrame(f(1));
  c.onFrame(f(2));
  const before = c.snapshot();
  c.select(1);
  c.visible(1, 220);
  c.visible(0.05, 220);
  expect(c.snapshot()).toEqual(before);
  expect(c.visible(0.5, 2220).length).toBe(0);
  c.onBoundary({ sessionId: 1, segment: 1, reason: "pause", atMs: 250 });
  c.onFrame(f(3, 2, 300));
  expect(c.notice).toContain("Resume");
  expect(c.snapshot().events.filter((e) => e.kind === "exit")).toHaveLength(0);
  c.onFrame(f(4, 2, 2501));
  expect(c.notice).toContain("analysis-gap");
  expect(c.snapshot().segment).toBe(3);
  c.clearSession();
  expect(c.snapshot().tracks).toHaveLength(0);
});

test("dismissing a segment notice changes no tracking state and survives projections", () => {
  const c = new TrackingController(0.05);
  c.onFrame(f(1));
  c.onFrame(f(2));
  c.onBoundary({ sessionId: 1, segment: 1, reason: "pause", atMs: 250 });
  c.onFrame(f(3, 2, 300));
  const before = c.snapshot();
  expect(c.notice).toContain("Resume");
  c.dismissNotice();
  expect(c.notice).toBe("");
  expect(c.snapshot()).toEqual(before);
  c.onFrame(f(4, 2, 400));
  expect(c.notice).toBe("");
  c.onBoundary({ sessionId: 1, segment: 2, reason: "geometry", atMs: 450 });
  c.onFrame({ ...f(5, 3, 500), geometry: 2 });
  expect(c.notice).toContain("geometry");
});
