import { clipBox } from "./detections";
import type { Detection } from "./inference/types";
/** Canvas and video share an aspect-ratio container; boxes stay in frame pixels. */
export function drawDetections(
  canvas: HTMLCanvasElement,
  detections: Detection[],
  width: number,
  height: number,
): void {
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  const font = Math.max(14, width / 40);
  ctx.font = `600 ${font}px system-ui, sans-serif`;
  ctx.lineWidth = Math.max(2, width / 320);
  for (const detection of detections) {
    const box = clipBox(detection.box, width, height);
    if (!box) continue;
    const { x, y, width: w, height: h } = box;
    ctx.strokeStyle = "#b9f580";
    ctx.fillStyle = "#b9f58014";
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    const text = `${detection.label}  ${Math.round(detection.score * 100)}%`;
    const labelWidth = Math.min(width, ctx.measureText(text).width + 16),
      labelHeight = font + 14;
    const labelX = Math.max(0, Math.min(x, width - labelWidth));
    const labelY = Math.max(0, y >= labelHeight ? y - labelHeight : y);
    ctx.fillStyle = "#b9f580";
    ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
    ctx.fillStyle = "#14241c";
    ctx.fillText(text, labelX + 8, labelY + font + 3, labelWidth - 12);
  }
}
