import { intersectionOverUnion } from "./geometry";
import { Tracker } from "./tracker";
import type { SyntheticFixture, PredictionFrame } from "./fixtures";
function bounded(f: SyntheticFixture) {
  if (
    !f.frames.length ||
    f.frames.length > 120 ||
    f.frames.some(
      (x, i) =>
        !Number.isFinite(x.atMs) ||
        (i > 0 && x.atMs <= f.frames[i - 1].atMs) ||
        x.truth.length > 10 ||
        x.detections.length > 10 ||
        new Set(x.truth.map((t) => t.id)).size !== x.truth.length,
    )
  )
    throw new Error("Synthetic fixture limit/structure invalid");
}
export function evaluateTrackingSequence(
  fixture: SyntheticFixture,
  predictions: readonly PredictionFrame[],
) {
  bounded(fixture);
  const matched = new Map<string, Map<number, number>>();
  let visibleTruth = 0,
    misses = 0,
    fragments = 0,
    idChanges = 0;
  for (const frame of fixture.frames) {
    const truth = frame.truth
      .filter((t) => t.visible)
      .sort((a, b) => a.id.localeCompare(b.id));
    const tracks = [
      ...(predictions.find((p) => p.atMs === frame.atMs)?.tracks ?? []),
    ].sort((a, b) => a.birthOrder - b.birthOrder || a.id - b.id);
    if (tracks.length > 10) throw new Error("Prediction limit exceeded");
    // At <=10 objects, bitmask DP makes the three evaluation objectives explicit:
    // maximum matches, maximum total IoU, then lexicographically earliest birth order.
    const memo = new Map<
      string,
      { count: number; iou: number; picks: (number | null)[] }
    >();
    const solve = (
      row: number,
      mask: number,
    ): { count: number; iou: number; picks: (number | null)[] } => {
      if (row === truth.length) return { count: 0, iou: 0, picks: [] };
      const key = `${row}:${mask}`;
      const cached = memo.get(key);
      if (cached) return cached;
      let best: {
        count: number;
        iou: number;
        picks: (number | null)[];
      } | null = null;
      for (const j of [...tracks.map((_, j) => j), null]) {
        if (j !== null && mask & (1 << j)) continue;
        const iou =
          j === null ? 0 : intersectionOverUnion(truth[row].box, tracks[j].box);
        if (j !== null && iou < 0.5 - 1e-12) continue;
        const rest = solve(row + 1, j === null ? mask : mask | (1 << j));
        const candidate = {
          count: rest.count + (j === null ? 0 : 1),
          iou: rest.iou + iou,
          picks: [j, ...rest.picks],
        };
        if (
          !best ||
          candidate.count > best.count ||
          (candidate.count === best.count &&
            candidate.iou > best.iou + Number.EPSILON * 10)
        )
          best = candidate;
      }
      memo.set(key, best!);
      return best!;
    };
    const assignment = solve(0, 0).picks;
    truth.forEach((t, i) => {
      visibleTruth++;
      const j = assignment[i];
      if (j === null) {
        misses++;
        return;
      }
      if (!matched.has(t.id)) matched.set(t.id, new Map());
      matched.get(t.id)!.set(frame.atMs, tracks[j].id);
    });
  }
  const truthIds = new Set(
    fixture.frames.flatMap((f) => f.truth.map((t) => t.id)),
  );
  for (const id of truthIds) {
    let runs = 0,
      inRun = false,
      last: number | null = null;
    for (const f of fixture.frames) {
      if (!f.truth.some((t) => t.id === id && t.visible)) continue;
      const track = matched.get(id)?.get(f.atMs);
      if (track === undefined) {
        inRun = false;
        continue;
      }
      if (!inRun) runs++;
      inRun = true;
      if (last !== null && last !== track) idChanges++;
      last = track;
    }
    fragments += Math.max(0, runs - 1);
  }
  const recoveries = fixture.occlusions.map((o) => {
    const pre =
      [...(matched.get(o.truthId) ?? [])]
        .filter(([at]) => at < o.startMs)
        .at(-1)?.[1] ?? null;
    const post = fixture.frames.find(
      (f) =>
        f.atMs >= o.endMs &&
        f.truth.some((t) => t.id === o.truthId && t.visible),
    );
    const next =
      fixture.occlusions
        .filter((n) => n.truthId === o.truthId && n.startMs >= o.endMs)
        .sort((a, b) => a.startMs - b.startMs)[0]?.startMs ?? Infinity;
    const startMs = post?.atMs ?? null;
    const endMs =
      startMs === null
        ? null
        : Math.min(next, startMs + 1000, fixture.frames.at(-1)!.atMs);
    const eligible = pre !== null && startMs !== null && startMs < next;
    const first = eligible
      ? [...(matched.get(o.truthId) ?? [])].find(
          ([at]) => at >= startMs! && at <= endMs! && at < next,
        )
      : undefined;
    return {
      truthId: o.truthId,
      preId: pre,
      startMs,
      endMs,
      eligible,
      firstId: first?.[1] ?? null,
      recoveryAtMs: first?.[0] ?? null,
      success: eligible && first?.[1] === pre,
    };
  });
  const recoveryEligible = recoveries.filter((r) => r.eligible).length,
    recovered = recoveries.filter((r) => r.success).length;
  return {
    fixtureId: fixture.id,
    fixtureVersion: fixture.version,
    sampleCount: fixture.frames.length,
    visibleTruth,
    misses,
    fragments,
    idChanges,
    recoveryEligible,
    recovered,
    recoveryRate: recoveryEligible ? recovered / recoveryEligible : null,
    excludedRecoveries: recoveries.length - recoveryEligible,
    recoveries,
  };
}
export async function runSyntheticBenchmark(
  fixtures: readonly SyntheticFixture[],
  signal: AbortSignal,
  yieldChunk: () => Promise<void> = () => new Promise((r) => setTimeout(r, 0)),
) {
  const reports = [];
  const check = () => {
    if (signal.aborted) throw new Error("Synthetic benchmark cancelled");
  };
  for (const fixture of fixtures) {
    bounded(fixture);
    check();
    const tracker = new Tracker();
    tracker.startSession(1);
    const predictions: PredictionFrame[] = [];
    const start = performance.now();
    let processingMs = 0;
    for (let i = 0; i < fixture.frames.length; i++) {
      check();
      const f = fixture.frames[i];
      const processingStart = performance.now();
      const result = tracker.update({
        sessionId: 1,
        segment: 1,
        geometry: 1,
        sequence: i + 1,
        sampledAtMs: f.atMs,
        completedAtMs: f.atMs,
        width: 100,
        height: 100,
        detections: f.detections,
      });
      predictions.push({
        atMs: f.atMs,
        tracks: result.tracks
          .filter((t) => t.state === "active")
          .map((t) => ({ id: t.id, birthOrder: t.birthOrder, box: t.box })),
      });
      processingMs += performance.now() - processingStart;
      if ((i + 1) % 10 === 0) {
        await yieldChunk();
        check();
      }
    }
    reports.push({
      ...evaluateTrackingSequence(fixture, predictions),
      processingMs,
      elapsedMs: performance.now() - start,
      config: tracker.config,
      detectorInference: "not run",
      source: "labelled synthetic numeric fixture",
      buildId: import.meta.env.VITE_BUILD_ID ?? "Unknown",
      environment:
        typeof navigator !== "undefined" ? navigator.userAgent : "Unknown",
    });
  }
  check();
  return reports;
}
