import { Tracker } from "../tracking/tracker";
import { normalizeDetections } from "../tracking/geometry";
import type {
  CommittedFrame,
  TrackingBoundary,
  TrackingFrame,
  TrackSnapshot,
} from "../tracking/types";
export class TrackingController {
  private tracker: Tracker;
  private session = 0;
  private last: CommittedFrame | null = null;
  private result: TrackingFrame | null = null;
  private offset = 0;
  private reason = "";
  selected: number | null = null;
  notice = "";
  constructor(private modelFloor: number) {
    this.tracker = new Tracker({ modelFloor });
  }
  onFrame = (frame: CommittedFrame) => {
    if (frame.sessionId !== this.session) {
      this.tracker.startSession(frame.sessionId);
      this.session = frame.sessionId;
      this.offset = 0;
      this.selected = null;
      this.notice = "";
      this.reason = "";
    }
    if (
      this.last?.sessionId === frame.sessionId &&
      frame.segment === this.last.segment &&
      frame.sampledAtMs - this.last.sampledAtMs > 2000
    ) {
      this.tracker.endSegment("analysis-gap", frame.completedAtMs);
      this.offset++;
      this.reason = "analysis-gap";
    }
    if (this.reason) {
      this.notice = `New tracking segment — ${this.reason === "pause" || this.reason === "hidden" ? "IDs restart after Resume" : this.reason}`;
      this.reason = "";
    }
    const normalized = normalizeDetections(
      frame.detections,
      frame.width,
      frame.height,
      this.modelFloor,
    );
    this.result = this.tracker.update({
      ...frame,
      segment: frame.segment + this.offset,
      detections: normalized,
    });
    this.last = frame;
    if (
      this.selected !== null &&
      !this.result.tracks.some((t) => t.id === this.selected)
    )
      this.selected = null;
  };
  onBoundary = (b: TrackingBoundary) => {
    if (b.sessionId !== this.session) return;
    this.tracker.endSegment(b.reason, b.atMs);
    this.result = null;
    this.reason = b.reason;
    if (["stop", "error", "camera-ended"].includes(b.reason)) this.notice = "";
  };
  snapshot() {
    return this.tracker.snapshot();
  }
  select(id: number | null) {
    this.selected =
      id !== null && this.snapshot().tracks.some((t) => t.id === id)
        ? id
        : null;
  }
  visible(threshold: number, now: number): TrackSnapshot[] {
    if (!this.result || !this.last || now - this.last.completedAtMs > 2000)
      return [];
    return this.result.tracks.filter(
      (t) => t.state === "active" && t.score >= threshold,
    );
  }
  idFor(sourceIndex: number) {
    return this.result?.associations[sourceIndex] ?? null;
  }
  get completedAtMs() {
    return this.last?.completedAtMs ?? null;
  }
  clearSession() {
    this.tracker.startSession(0);
    this.session = 0;
    this.last = null;
    this.result = null;
    this.selected = null;
    this.notice = "";
    this.reason = "";
    this.offset = 0;
  }
}
