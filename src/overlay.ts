import type { TrackSnapshot } from "./tracking/types";
import { clipBox, formatScore } from "./detections";
import type { Detection } from "./inference/types";
/** Canvas and video share an aspect-ratio container; boxes stay in frame pixels. */
export function drawDetections(
  canvas: HTMLCanvasElement,
  detections: (Detection & { trackId?: number | null })[],
  width: number,
  height: number,
  tracks: readonly TrackSnapshot[] = [],
  selected: number | null = null,
): void {
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  const font = Math.max(14, width / 40);
  ctx.font = `600 ${font}px system-ui, sans-serif`;
  ctx.lineWidth = Math.max(2, width / 320);
  for (const track of tracks) {
    ctx.strokeStyle = track.id === selected ? "#ffffff" : "#83bf65";
    ctx.beginPath();
    let connected = false;
    for (const s of track.samples) {
      if (!s.box || s.atMs < track.lastMatchedAtMs - 5000) {
        connected = false;
        continue;
      }
      const x = (s.box.x + s.box.width / 2) * width,
        y = (s.box.y + s.box.height / 2) * height;
      if (connected) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
      connected = true;
    }
    ctx.stroke();
  }
  for (const detection of detections) {
    const box = clipBox(detection.box, width, height);
    if (!box) continue;
    const { x, y, width: w, height: h } = box;
    const track = tracks.find((t) => t.id === detection.trackId);
    ctx.strokeStyle = track?.id === selected ? "#ffffff" : "#b9f580";
    ctx.fillStyle = "#b9f58014";
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    const text = `${track ? `#${track.id} ` : ""}${detection.label}  ${formatScore(detection.score)}`;
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
