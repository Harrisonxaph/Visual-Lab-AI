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
  private frames = 0;
  reset(now: number) {
    this.started = now;
    this.frames = 0;
  }
  complete(now: number): number {
    this.frames++;
    return now > this.started ? (this.frames * 1000) / (now - this.started) : 0;
  }
}
