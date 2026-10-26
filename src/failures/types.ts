import type { UnitBox } from "../tracking/types";
export interface FailureNote {
  id: string;
  type: "missed" | "incorrect" | "unstable";
  createdAt: string;
  userReported: true;
  sessionId: number;
  segment: number;
  trackId: number | null;
  model: { name: string; version: string; sha256: string };
  thresholds: { model: number; tracking: number; display: number };
  observed: {
    atMs: number;
    ageMs: number;
    label: string;
    score: number;
    box: UnitBox;
  } | null;
  expectedLabel: string | null;
  text: string;
}
export interface StoreResult {
  ok: boolean;
  message: string;
}
