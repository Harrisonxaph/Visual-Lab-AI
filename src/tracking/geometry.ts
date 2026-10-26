import { clipBox } from "../detections";
import type { Detection } from "../inference/types";
import type { UnitBox, NormalizedDetection, TrackId } from "./types";
export interface ContentRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export function normalizeDetections(
  detections: readonly Detection[],
  width: number,
  height: number,
  modelFloor: number,
): NormalizedDetection[] {
  if (
    ![width, height, modelFloor].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0 ||
    modelFloor < 0 ||
    modelFloor > 1
  )
    return [];
  return detections.flatMap((d, sourceIndex) => {
    if (
      !Number.isFinite(d.score) ||
      d.score < modelFloor ||
      d.score > 1 ||
      typeof d.label !== "string"
    )
      return [];
    const b = clipBox(d.box, width, height);
    if (!b) return [];
    return [
      {
        sourceIndex,
        label: d.label,
        score: d.score,
        box: {
          x: b.x / width,
          y: b.y / height,
          width: b.width / width,
          height: b.height / height,
        },
      },
    ];
  });
}
export function intersectionOverUnion(a: UnitBox, b: UnitBox): number {
  const intersection =
    Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
    Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  const union = a.width * a.height + b.width * b.height - intersection;
  return union > 0 ? intersection / union : 0;
}
export function containedVideoRect(
  rect: ContentRect,
  width: number,
  height: number,
): ContentRect {
  if (
    ![rect.x, rect.y, rect.width, rect.height, width, height].every(
      Number.isFinite,
    ) ||
    rect.width <= 0 ||
    rect.height <= 0 ||
    width <= 0 ||
    height <= 0
  )
    return { x: rect.x, y: rect.y, width: 0, height: 0 };
  const scale = Math.min(rect.width / width, rect.height / height),
    w = width * scale,
    h = height * scale;
  return {
    x: rect.x + (rect.width - w) / 2,
    y: rect.y + (rect.height - h) / 2,
    width: w,
    height: h,
  };
}
export function hitTestTracks(
  point: { x: number; y: number },
  rect: ContentRect,
  tracks: readonly { id: TrackId; birthOrder: number; box: UnitBox }[],
): TrackId | null {
  if (rect.width <= 0 || rect.height <= 0) return null;
  const x = (point.x - rect.x) / rect.width,
    y = (point.y - rect.y) / rect.height;
  if (x < 0 || y < 0 || x > 1 || y > 1) return null;
  return (
    [...tracks]
      .filter(
        (t) =>
          x >= t.box.x &&
          x <= t.box.x + t.box.width &&
          y >= t.box.y &&
          y <= t.box.y + t.box.height,
      )
      .sort(
        (a, b) =>
          a.box.width * a.box.height - b.box.width * b.box.height ||
          a.birthOrder - b.birthOrder,
      )[0]?.id ?? null
  );
}
