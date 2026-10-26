import { normalizeDetections } from "../tracking/geometry";
import type { Detection } from "../inference/types";
export function nearThresholdDetections(
  detections: readonly Detection[],
  width: number,
  height: number,
  floor: number,
  threshold: number,
) {
  return normalizeDetections(detections, width, height, floor)
    .filter(
      (d) =>
        d.score >= Math.max(floor, threshold - 0.1) - 1e-12 &&
        d.score < threshold,
    )
    .sort((a, b) => b.score - a.score || a.sourceIndex - b.sourceIndex)
    .slice(0, 10);
}
