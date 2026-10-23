import type { Box, Detection } from "./inference/types";
export function filterDetections(
  detections: Detection[],
  threshold: number,
): Detection[] {
  return detections.filter(
    (d) => Number.isFinite(d.score) && d.score >= threshold && d.score <= 1,
  );
}
export function clipBox(box: Box, width: number, height: number): Box | null {
  if (
    ![box.x, box.y, box.width, box.height, width, height].every(Number.isFinite)
  )
    return null;
  const x = Math.max(0, box.x),
    y = Math.max(0, box.y);
  const right = Math.min(width, box.x + box.width),
    bottom = Math.min(height, box.y + box.height);
  return right > x && bottom > y
    ? { x, y, width: right - x, height: bottom - y }
    : null;
}
export class ProcessingMeter {
  private started = 0;
  private completions: number[] = [];
  private readonly windowMs = 2000;
  reset(now: number) {
    this.started = now;
    this.completions = [];
  }
  complete(now: number): number {
    const windowStart = Math.max(this.started, now - this.windowMs);
    this.completions.push(now);
    this.completions = this.completions.filter((time) => time > windowStart);
    return now > windowStart
      ? (this.completions.length * 1000) / (now - windowStart)
      : 0;
  }
}

/** Detection scores use rounded display values capped below certainty; filtering uses raw scores. */
export function formatScore(score: number): string {
  return `${Math.min(99, Math.max(0, Math.round(score * 100)))}%`;
}
export function visibleDetections(
  detections: Detection[],
  threshold: number,
  width: number,
  height: number,
): Detection[] {
  return filterDetections(detections, threshold).flatMap((detection) => {
    const box = clipBox(detection.box, width, height);
    return box ? [{ ...detection, box }] : [];
  });
}
