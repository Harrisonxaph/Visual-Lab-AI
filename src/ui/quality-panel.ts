import { describeTrackQuality } from "../tracking/quality";
import type { TrackSnapshot } from "../tracking/types";
export function describeQuality(t: TrackSnapshot | null) {
  if (!t) return "Select a track for descriptive measurements.";
  const q = describeTrackQuality(t);
  return `Observed span ${q.observedSpanMs} ms; matched frames ${q.matchedFrames}; losses ${q.losses}; reacquisitions ${q.reacquisitions}; gap estimate ${q.gapEstimateMs} ms. Retained-window score SD ${q.scoreStandardDeviation?.toFixed(3) ?? "Not measured"}; median center-step / box diagonal ${q.medianMotionProxy?.toFixed(3) ?? "Not measured"}. These are motion/variability proxies, not accuracy. Live ID switches and fragmentation: Not measured without labelled truth.`;
}
