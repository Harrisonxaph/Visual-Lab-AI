import type { Box, Detection } from "../inference/types";
/** Unit boxes are clipped to [0,1] in intrinsic image coordinates, never CSS pixels. */
export type UnitBox = Box;
export type TrackId = number;
export type BoundaryReason =
  | "pause"
  | "hidden"
  | "stop"
  | "error"
  | "camera-ended"
  | "geometry"
  | "analysis-gap";
export interface CommittedFrame {
  sessionId: number;
  segment: number;
  geometry: number;
  sequence: number;
  sampledAtMs: number;
  completedAtMs: number;
  width: number;
  height: number;
  detections: readonly Detection[];
}
export interface NormalizedDetection {
  sourceIndex: number;
  label: string;
  score: number;
  box: UnitBox;
}
export interface NormalizedFrame extends Omit<CommittedFrame, "detections"> {
  detections: readonly NormalizedDetection[];
}
export interface TrackingBoundary {
  sessionId: number;
  segment: number;
  reason: BoundaryReason;
  atMs: number;
}
export interface DetectorCapabilities {
  alternativeClasses: false;
  returnedScoreFloor: number;
  maxResults: number;
}
export interface TrackSample {
  atMs: number;
  score: number | null;
  label: string | null;
  box: UnitBox | null;
}
export interface AssociationEvidence {
  iou: number;
  distance: number;
  classPenalty: number;
  cost: number;
}
export interface TrackSnapshot {
  id: TrackId;
  birthOrder: number;
  segment: number;
  state: "active" | "lost" | "ended";
  firstMatchedAtMs: number;
  lastMatchedAtMs: number;
  matchedFrames: number;
  label: string;
  score: number;
  box: UnitBox;
  samples: TrackSample[];
  losses: number;
  reacquisitions: number;
  gapMs: number;
  terminalReason?: string;
}
export interface TrackEvent {
  id: number;
  trackId: TrackId | null;
  segment: number;
  atMs: number;
  kind:
    | "entry"
    | "temporary-loss"
    | "reacquired"
    | "exit"
    | "class-change"
    | "analysis-boundary";
  reason: string;
  deadlineMs?: number;
  evidence?: AssociationEvidence;
}
export interface Churn {
  candidates: number;
  tentativeDrops: number;
  confirmations: number;
  publicIds: number;
  losses: number;
  expiries: number;
  belowFloor: number;
  invalidOutputs: number;
  capacityDrops: number;
  peakLive: number;
  eligible: number;
  droppedEvents: number;
  droppedHistories: number;
}
export interface TrackingSnapshot {
  sessionId: number;
  segment: number;
  tracks: TrackSnapshot[];
  events: TrackEvent[];
  counters: Churn;
  candidates: number;
  closed: boolean;
}
export interface TrackingFrame extends TrackingSnapshot {
  sequence: number;
  geometry: number;
  associations: Record<number, TrackId | null>;
  evidence: Record<number, AssociationEvidence>;
}
export interface TrackerConfig {
  modelFloor: number;
  trackingFloor: number;
}
