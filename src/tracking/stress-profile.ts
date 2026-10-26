import { Tracker } from "./tracker";
import type { NormalizedFrame, TrackerConfig } from "./types";
export function summarizeTimings(values: readonly number[]) {
  if (!values.length || values.some((v) => !Number.isFinite(v) || v < 0))
    throw new Error("Invalid timing samples");
  const sorted = [...values].sort((a, b) => a - b);
  return {
    p50:
      (sorted[Math.floor((sorted.length - 1) / 2)] +
        sorted[Math.floor(sorted.length / 2)]) /
      2,
    p95: sorted[Math.ceil(sorted.length * 0.95) - 1],
    max: sorted[sorted.length - 1],
  };
}
/** Bounded observed minimum positive clock delta, not a guaranteed timer resolution. */
export function estimateClockStep(now: () => number): number | null {
  let previous = now(),
    step = Infinity;
  for (let i = 0; i < 4096; i++) {
    const current = now(),
      delta = current - previous;
    if (Number.isFinite(delta) && delta > 0) step = Math.min(step, delta);
    previous = current;
  }
  return Number.isFinite(step) ? step : null;
}
export function classifyBudget(p95: number, step: number | null) {
  if (step === null || Math.abs(p95 - 8) <= step) return "inconclusive";
  return p95 > 8 ? "exceeded" : "within";
}
export function formatTiming(value: number, step: number | null) {
  return value.toFixed(step === null || step >= 1 ? 0 : 2);
}
export interface StressOptions {
  config?: Partial<TrackerConfig>;
  now?: () => number;
  yieldTurn?: () => Promise<void>;
  onProgress?: (
    phase: "warmup" | "measurement",
    completed: number,
    total: number,
  ) => void;
}
/** Separate deterministic tracker; synthetic timestamps are unrelated to real measurement clocks. */
export async function runStressProfile(
  signal: AbortSignal,
  options: StressOptions = {},
) {
  const now = options.now ?? (() => performance.now()),
    yieldTurn =
      options.yieldTurn ?? (() => new Promise((r) => setTimeout(r, 0)));
  const check = () => {
    if (signal.aborted) throw new Error("Synthetic stress profile cancelled.");
  };
  check();
  const clockStepMs = estimateClockStep(now);
  check();
  const tracker = new Tracker(options.config);
  tracker.startSession(1);
  let sequence = 0;
  const frame = (x: number): NormalizedFrame => ({
    sessionId: 1,
    segment: 1,
    geometry: 1,
    sequence: ++sequence,
    sampledAtMs: sequence * 5,
    completedAtMs: sequence * 5,
    width: 100,
    height: 100,
    detections: Array.from({ length: 50 }, (_, sourceIndex) => ({
      sourceIndex,
      label: "cup",
      score: Math.max(0.8, tracker.config.trackingFloor),
      box: { x, y: 0.2, width: 0.1, height: 0.1 },
    })),
  });
  const started = now();
  for (let i = 0; i < 184; i++) {
    check();
    tracker.update(frame(i < 2 ? 0.05 : 0.75));
    if (i % 10 === 0 || i === 183) options.onProgress?.("warmup", i + 1, 184);
    await yieldTurn();
    check();
  }
  const update: number[] = [],
    copy: number[] = [],
    combined: number[] = [],
    longTasks: { startTime: number; duration: number }[] = [];
  let droppedLongTasks = 0,
    observer: PerformanceObserver | null = null;
  const collect = (entries: PerformanceEntry[]) => {
    for (const e of entries) {
      if (longTasks.length < 100)
        longTasks.push({ startTime: e.startTime, duration: e.duration });
      else droppedLongTasks++;
    }
  };
  try {
    if (
      typeof PerformanceObserver !== "undefined" &&
      PerformanceObserver.supportedEntryTypes?.includes("longtask")
    ) {
      observer = new PerformanceObserver((list) => collect(list.getEntries()));
      observer.observe({ type: "longtask", buffered: false });
    }
  } catch {
    observer?.disconnect();
    observer = null;
  }
  const measuredFrom = now();
  let measuredThrough = measuredFrom;
  try {
    for (let i = 0; i < 50; i++) {
      check();
      const input = frame(0.75),
        start = now();
      tracker.update(input);
      const middle = now();
      tracker.snapshot();
      const end = now();
      measuredThrough = end;
      update.push(middle - start);
      copy.push(end - middle);
      combined.push(end - start);
      if (i % 10 === 0 || i === 49)
        options.onProgress?.("measurement", i + 1, 50);
      await yieldTurn();
      check();
    }
    await yieldTurn();
    check();
    if (observer) collect(observer.takeRecords());
  } finally {
    observer?.disconnect();
  }
  const snapshot = tracker.snapshot(),
    live = snapshot.tracks.filter((t) => t.state !== "ended");
  if (live.length !== 100)
    throw new Error(
      "Synthetic stress fixture failed to retain 100 live tracks.",
    );
  return {
    source: "synthetic numeric stress fixture",
    fixtureVersion: 1,
    detectorInference: "not run",
    camera: "not used",
    config: { ...tracker.config },
    syntheticScore: Math.max(0.8, tracker.config.trackingFloor),
    warmupFrames: 184,
    samples: 50,
    syntheticStepMs: 5,
    liveTracks: live.length,
    activeTracks: live.filter((t) => t.state === "active").length,
    lostTracks: live.filter((t) => t.state === "lost").length,
    retainedSamples: live.reduce((n, t) => n + t.samples.length, 0),
    detectionsPerFrame: 50,
    updateIncludingReturnCopy: summarizeTimings(update),
    explicitSnapshotCopy: summarizeTimings(copy),
    combined: summarizeTimings(combined),
    observedLongTasks: observer
      ? {
          supported: true,
          entries: longTasks.filter(
            (e) =>
              e.startTime + e.duration > measuredFrom &&
              e.startTime < measuredThrough,
          ),
          dropped: droppedLongTasks,
        }
      : { supported: false, entries: [], dropped: 0 },
    measurementIntervalMs: { start: measuredFrom, end: measuredThrough },
    elapsedMs: now() - started,
    browser: typeof navigator !== "undefined" ? navigator.userAgent : "Unknown",
    hardwareConcurrency:
      typeof navigator !== "undefined" ? navigator.hardwareConcurrency : null,
    buildId: import.meta.env.VITE_BUILD_ID ?? "Unknown",
    investigationBudgetMs: 8,
    clockStepMs,
    budgetResult: classifyBudget(summarizeTimings(update).p95, clockStepMs),
  };
}
