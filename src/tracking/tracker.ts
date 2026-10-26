import { minimumCostAssignment } from "./assignment";
import { intersectionOverUnion } from "./geometry";
import type {
  AssociationEvidence,
  BoundaryReason,
  Churn,
  NormalizedDetection,
  NormalizedFrame,
  TrackEvent,
  TrackingFrame,
  TrackingSnapshot,
  TrackerConfig,
  TrackSnapshot,
  UnitBox,
} from "./types";
export function associationEvidence(
  box: UnitBox,
  label: string,
  state: string,
  d: NormalizedDetection,
): AssociationEvidence | null {
  const ratio = (d.box.width * d.box.height) / (box.width * box.height),
    iou = intersectionOverUnion(box, d.box),
    distance =
      Math.hypot(
        box.x + box.width / 2 - d.box.x - d.box.width / 2,
        box.y + box.height / 2 - d.box.y - d.box.height / 2,
      ) / Math.SQRT2;
  if (
    ratio < 0.25 - 1e-12 ||
    ratio > 4 + 1e-12 ||
    (iou < 0.1 - 1e-12 && distance > 0.15 + 1e-12)
  )
    return null;
  const classPenalty = label === d.label ? 0 : 0.1;
  return {
    iou,
    distance,
    classPenalty,
    cost:
      0.7 * (1 - iou) +
      0.2 * Math.min(distance / 0.15, 1) +
      classPenalty +
      (state === "lost" ? 0.05 : 0),
  };
}
interface Candidate {
  key: number;
  track: TrackSnapshot;
  previous?: { box: UnitBox; atMs: number };
}
const counters = (): Churn => ({
  candidates: 0,
  tentativeDrops: 0,
  confirmations: 0,
  publicIds: 0,
  losses: 0,
  expiries: 0,
  belowFloor: 0,
  invalidOutputs: 0,
  capacityDrops: 0,
  peakLive: 0,
  eligible: 0,
  droppedEvents: 0,
  droppedHistories: 0,
});
export class Tracker {
  readonly config: TrackerConfig;
  private sessionId = 0;
  private segment = 0;
  private geometry = 0;
  private closed = false;
  private sequence = 0;
  private time = -Infinity;
  private completion = -Infinity;
  private key = 0;
  private id = 0;
  private eventId = 0;
  private live: Candidate[] = [];
  private ended: TrackSnapshot[] = [];
  private events: TrackEvent[] = [];
  private counts = counters();
  constructor(config: Partial<TrackerConfig> = {}) {
    const modelFloor = config.modelFloor ?? 0.05;
    this.config = {
      modelFloor,
      trackingFloor: config.trackingFloor ?? Math.max(0.25, modelFloor),
    };
    if (
      !Number.isFinite(modelFloor) ||
      modelFloor < 0 ||
      modelFloor > 1 ||
      !Number.isFinite(this.config.trackingFloor) ||
      this.config.trackingFloor < modelFloor ||
      this.config.trackingFloor > 1
    )
      throw new Error("Invalid tracking floor");
  }
  startSession(sessionId: number) {
    this.sessionId = sessionId;
    this.segment = 0;
    this.geometry = 0;
    this.closed = false;
    this.sequence = 0;
    this.time = -Infinity;
    this.completion = -Infinity;
    this.key = 0;
    this.id = 0;
    this.eventId = 0;
    this.live = [];
    this.ended = [];
    this.events = [];
    this.counts = counters();
  }
  private event(
    trackId: number | null,
    kind: TrackEvent["kind"],
    atMs: number,
    reason: string,
    extra: Partial<TrackEvent> = {},
  ) {
    this.events.push({
      id: ++this.eventId,
      trackId,
      segment: this.segment,
      kind,
      atMs,
      reason,
      ...extra,
    });
    if (this.events.length > 1000) {
      this.events.shift();
      this.counts.droppedEvents++;
    }
  }
  private finish(c: Candidate, reason: string, time: number) {
    const t = c.track;
    if (!t.id) {
      this.counts.tentativeDrops++;
      return;
    }
    if (t.state === "lost" || reason === "expired")
      t.gapMs += Math.max(
        0,
        Math.min(time, t.lastMatchedAtMs + 1500) - t.lastMatchedAtMs,
      );
    t.state = "ended";
    t.terminalReason = reason;
    this.ended.push(t);
    if (this.ended.length > 100) {
      this.ended.shift();
      this.counts.droppedHistories++;
    }
  }
  endSegment(reason: BoundaryReason, timeMs: number) {
    if (!this.segment || this.closed) return;
    for (const c of this.live) this.finish(c, reason, timeMs);
    this.live = [];
    this.closed = true;
    this.event(null, "analysis-boundary", timeMs, reason);
  }
  private predict(c: Candidate, time: number): UnitBox {
    const t = c.track,
      p = c.previous;
    if (!p || t.lastMatchedAtMs <= p.atMs) return t.box;
    const factor =
      Math.min(500, Math.max(0, time - t.lastMatchedAtMs)) /
      (t.lastMatchedAtMs - p.atMs);
    const x = t.box.x + (t.box.x - p.box.x) * factor,
      y = t.box.y + (t.box.y - p.box.y) * factor;
    const left = Math.max(0, x),
      top = Math.max(0, y),
      right = Math.min(1, x + t.box.width),
      bottom = Math.min(1, y + t.box.height);
    return right > left && bottom > top
      ? { x: left, y: top, width: right - left, height: bottom - top }
      : t.box;
  }
  update(f: NormalizedFrame): TrackingFrame {
    if (
      f.sessionId !== this.sessionId ||
      !Number.isInteger(f.sequence) ||
      f.sequence <= this.sequence ||
      !Number.isInteger(f.segment) ||
      f.segment < 1 ||
      f.segment < this.segment ||
      (this.closed && f.segment === this.segment) ||
      ![f.sampledAtMs, f.completedAtMs, f.width, f.height, f.geometry].every(
        Number.isFinite,
      ) ||
      f.width <= 0 ||
      f.height <= 0 ||
      f.sampledAtMs < this.time ||
      f.completedAtMs < f.sampledAtMs ||
      f.completedAtMs < this.completion ||
      (f.segment === this.segment && f.geometry !== this.geometry) ||
      f.detections.length > 50
    )
      throw new Error("Invalid or stale tracking frame");
    if (f.segment > this.segment) {
      if (this.segment && !this.closed)
        throw new Error("Segment boundary required");
      this.segment = f.segment;
      this.geometry = f.geometry;
      this.closed = false;
    }
    this.sequence = f.sequence;
    this.time = f.sampledAtMs;
    this.completion = f.completedAtMs;
    const associations: Record<number, number | null> = {},
      evidence: Record<number, AssociationEvidence> = {};
    const eligible = f.detections
      .filter((d) => {
        associations[d.sourceIndex] = null;
        const b = d.box;
        if (
          ![d.score, b.x, b.y, b.width, b.height].every(Number.isFinite) ||
          d.score < this.config.modelFloor ||
          d.score > 1 ||
          b.x < 0 ||
          b.y < 0 ||
          b.width <= 0 ||
          b.height <= 0 ||
          b.x + b.width > 1 + 1e-12 ||
          b.y + b.height > 1 + 1e-12
        ) {
          this.counts.invalidOutputs++;
          return false;
        }
        if (d.score < this.config.trackingFloor) {
          this.counts.belowFloor++;
          return false;
        }
        return true;
      })
      .sort((a, b) => a.sourceIndex - b.sourceIndex);
    this.counts.eligible += eligible.length;
    this.live = this.live.filter((c) => {
      if (f.sampledAtMs - c.track.lastMatchedAtMs <= 1500) return true;
      if (c.track.id) {
        this.event(
          c.track.id,
          "exit",
          f.sampledAtMs,
          "track expired/unobserved",
          { deadlineMs: c.track.lastMatchedAtMs + 1500 },
        );
        this.counts.expiries++;
      }
      this.finish(c, "expired", c.track.lastMatchedAtMs + 1500);
      return false;
    });
    const matrix = this.live.map((c) => {
      const predicted = this.predict(c, f.sampledAtMs);
      return eligible.map((d) =>
        associationEvidence(predicted, c.track.label, c.track.state, d),
      );
    });
    const assigned = minimumCostAssignment(
        matrix.map((row) => row.map((e) => e?.cost ?? Infinity)),
        1.1,
      ),
      used = new Set<number>(),
      keep: Candidate[] = [];
    this.live.forEach((c, i) => {
      const j = assigned[i],
        t = c.track;
      if (j === null) {
        if (!t.id) {
          this.counts.tentativeDrops++;
          return;
        }
        if (t.state !== "lost") {
          t.state = "lost";
          t.losses++;
          this.counts.losses++;
          t.samples.push({
            atMs: f.sampledAtMs,
            score: null,
            label: null,
            box: null,
          });
          this.event(
            t.id,
            "temporary-loss",
            f.sampledAtMs,
            eligible.length === 0
              ? "no eligible returned candidates"
              : matrix[i].some(Boolean)
                ? "eligible candidate assigned elsewhere"
                : "all candidates gated out",
          );
        }
        keep.push(c);
        return;
      }
      used.add(j);
      const d = eligible[j],
        e = matrix[i][j]!;
      evidence[d.sourceIndex] = { ...e };
      if (t.state === "lost") {
        t.reacquisitions++;
        t.gapMs += f.sampledAtMs - t.lastMatchedAtMs;
        this.event(
          t.id,
          "reacquired",
          f.sampledAtMs,
          "geometric reassociation",
          { evidence: e },
        );
      }
      if (t.id && t.label !== d.label)
        this.event(
          t.id,
          "class-change",
          f.sampledAtMs,
          `${t.label} → ${d.label}`,
          { evidence: e },
        );
      c.previous = { box: t.box, atMs: t.lastMatchedAtMs };
      t.box = { ...d.box };
      t.label = d.label;
      t.score = d.score;
      t.lastMatchedAtMs = f.sampledAtMs;
      t.matchedFrames++;
      t.state = "active";
      t.samples.push({
        atMs: f.sampledAtMs,
        score: d.score,
        label: d.label,
        box: { ...d.box },
      });
      if (!t.id) {
        t.id = ++this.id;
        this.counts.confirmations++;
        this.counts.publicIds++;
        this.event(t.id, "entry", f.sampledAtMs, "track first confirmed", {
          evidence: e,
        });
      }
      associations[d.sourceIndex] = t.id;
      keep.push(c);
    });
    this.live = keep;
    eligible.forEach((d, j) => {
      if (used.has(j)) return;
      if (this.live.length >= 100) {
        this.counts.capacityDrops++;
        return;
      }
      const key = ++this.key;
      this.live.push({
        key,
        track: {
          id: 0,
          birthOrder: key,
          segment: this.segment,
          state: "active",
          firstMatchedAtMs: f.sampledAtMs,
          lastMatchedAtMs: f.sampledAtMs,
          matchedFrames: 1,
          label: d.label,
          score: d.score,
          box: { ...d.box },
          samples: [
            {
              atMs: f.sampledAtMs,
              score: d.score,
              label: d.label,
              box: { ...d.box },
            },
          ],
          losses: 0,
          reacquisitions: 0,
          gapMs: 0,
        },
      });
      this.counts.candidates++;
    });
    this.counts.peakLive = Math.max(this.counts.peakLive, this.live.length);
    for (const c of this.live)
      c.track.samples = c.track.samples
        .filter((s) => s.atMs >= f.sampledAtMs - 20000)
        .slice(-200);
    return {
      ...this.snapshot(),
      sequence: f.sequence,
      geometry: f.geometry,
      associations,
      evidence,
    };
  }
  snapshot(): TrackingSnapshot {
    return {
      sessionId: this.sessionId,
      segment: this.segment,
      tracks: [
        ...this.ended,
        ...this.live.filter((c) => c.track.id).map((c) => c.track),
      ].map((t) => ({
        ...t,
        box: { ...t.box },
        samples: t.samples.map((s) => ({
          ...s,
          box: s.box ? { ...s.box } : null,
        })),
      })),
      events: this.events.map((e) => ({
        ...e,
        ...(e.evidence ? { evidence: { ...e.evidence } } : {}),
      })),
      counters: { ...this.counts },
      candidates: this.live.filter((c) => !c.track.id).length,
      closed: this.closed,
    };
  }
}
