import { expect, test } from "vitest";
import {
  runStressProfile,
  summarizeTimings,
} from "../src/tracking/stress-profile";
test("profile measures 100 live by 50 returned detections, update copies and explicit snapshot separately", async () => {
  let now = 0,
    yields = 0;
  const report = await runStressProfile(new AbortController().signal, {
    config: { modelFloor: 0.05, trackingFloor: 0.6 },
    now: () => ++now,
    yieldTurn: async () => {
      yields++;
    },
  });
  expect(report).toMatchObject({
    source: "synthetic numeric stress fixture",
    fixtureVersion: 1,
    samples: 50,
    liveTracks: 100,
    activeTracks: 50,
    lostTracks: 50,
    detectionsPerFrame: 50,
    config: { modelFloor: 0.05, trackingFloor: 0.6 },
    updateIncludingReturnCopy: { p50: 1, p95: 1, max: 1 },
    explicitSnapshotCopy: { p50: 1, p95: 1, max: 1 },
    combined: { p50: 2, p95: 2, max: 2 },
    detectorInference: "not run",
  });
  expect(report.retainedSamples).toBe(10150);
  expect(yields).toBeGreaterThanOrEqual(234);
});
test("profile cancels during warmup and measurement instead of returning partial metrics", async () => {
  for (const atYield of [1, 190]) {
    const abort = new AbortController();
    let n = 0;
    await expect(
      runStressProfile(abort.signal, {
        yieldTurn: async () => {
          if (++n === atYield) abort.abort();
        },
      }),
    ).rejects.toThrow(/cancel/i);
    expect(n).toBe(atYield);
  }
});
test("timing summaries preserve input and reject missing or invalid samples", () => {
  const a = [3, 1, 2];
  expect(summarizeTimings(a)).toEqual({ p50: 2, p95: 3, max: 3 });
  expect(a).toEqual([3, 1, 2]);
  for (const values of [[], [NaN], [-1]])
    expect(() => summarizeTimings(values)).toThrow();
});

test("p50 is the median for even-sized sample sets", () => {
  expect(summarizeTimings([1, 3]).p50).toBe(2);
});

test("long tasks overlapping measurement are retained even if they began just before it", async () => {
  const { vi } = await import("vitest");
  class Observer {
    static supportedEntryTypes = ["longtask"];
    observe() {}
    disconnect() {}
    takeRecords() {
      return [{ startTime: 0, duration: 100000 }];
    }
  }
  vi.stubGlobal("PerformanceObserver", Observer);
  let now = 0;
  try {
    const report = await runStressProfile(new AbortController().signal, {
      now: () => ++now,
      yieldTurn: async () => {},
    });
    expect(report.observedLongTasks).toMatchObject({
      supported: true,
      entries: [{ startTime: 0, duration: 100000 }],
    });
  } finally {
    vi.unstubAllGlobals();
  }
});

test("clock step is bounded and budget boundaries are inconclusive", async () => {
  const { estimateClockStep, classifyBudget, formatTiming } = await import(
    "../src/tracking/stress-profile"
  );
  let tick = 0;
  expect(estimateClockStep(() => Math.floor(++tick / 4))).toBe(1);
  expect(estimateClockStep(() => 0)).toBeNull();
  expect(classifyBudget(7, 1)).toBe("inconclusive");
  expect(classifyBudget(9, 1)).toBe("inconclusive");
  expect(classifyBudget(6.9, 1)).toBe("within");
  expect(classifyBudget(9.1, 1)).toBe("exceeded");
  expect(classifyBudget(1, null)).toBe("inconclusive");
  expect(formatTiming(8, 1)).toBe("8");
  expect(formatTiming(1.234, 0.1)).toBe("1.23");
});

test("whole-millisecond profile reports the observed step and an inconclusive 8 ms p95", async () => {
  let reads = 0,
    clock = 0;
  const report = await runStressProfile(new AbortController().signal, {
    now: () => (clock += ++reads <= 4097 ? 1 : 8),
    yieldTurn: async () => {},
  });
  expect(report.clockStepMs).toBe(1);
  expect(report.updateIncludingReturnCopy.p95).toBe(8);
  expect(report.budgetResult).toBe("inconclusive");
});
