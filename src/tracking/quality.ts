import type { TrackSnapshot } from "./types";
export function describeTrackQuality(t: TrackSnapshot) {
  const scores = t.samples.flatMap((s) => (s.score === null ? [] : [s.score]));
  const mean = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
  const steps: number[] = [];
  for (let i = 1; i < t.samples.length; i++) {
    const a = t.samples[i - 1].box,
      b = t.samples[i].box;
    if (a && b)
      steps.push(
        Math.hypot(
          b.x + b.width / 2 - (a.x + a.width / 2),
          b.y + b.height / 2 - (a.y + a.height / 2),
        ) / Math.max(0.01, Math.hypot(a.width, a.height)),
      );
  }
  steps.sort((a, b) => a - b);
  return {
    observedSpanMs: t.lastMatchedAtMs - t.firstMatchedAtMs,
    matchedFrames: t.matchedFrames,
    losses: t.losses,
    reacquisitions: t.reacquisitions,
    gapEstimateMs: t.gapMs,
    scoreStandardDeviation: scores.length
      ? Math.sqrt(
          scores.reduce((s, x) => s + (x - mean) ** 2, 0) / scores.length,
        )
      : null,
    medianMotionProxy: steps.length
      ? (steps[Math.floor((steps.length - 1) / 2)] +
          steps[Math.floor(steps.length / 2)]) /
        2
      : null,
    idSwitches: null,
    fragmentation: null,
  };
}
