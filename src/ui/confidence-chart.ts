import type { TrackSample } from "../tracking/types";
export function confidenceSegments(samples: readonly TrackSample[]) {
  const segments: { atMs: number; score: number }[][] = [];
  let current: { atMs: number; score: number }[] = [];
  for (const s of samples) {
    if (s.score === null) {
      if (current.length) segments.push(current);
      current = [];
    } else current.push({ atMs: s.atMs, score: s.score });
  }
  if (current.length) segments.push(current);
  return segments;
}
export function drawConfidenceChart(
  canvas: HTMLCanvasElement,
  samples: readonly TrackSample[],
) {
  const w = Math.max(1, canvas.clientWidth || 300),
    h = 160,
    dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = "#4e7d30";
  ctx.lineWidth = 2;
  const start = samples[0]?.atMs ?? 0,
    end = samples.at(-1)?.atMs ?? start;
  for (const segment of confidenceSegments(samples)) {
    ctx.beginPath();
    segment.forEach((p, i) => {
      const x = 10 + ((p.atMs - start) / Math.max(1, end - start)) * (w - 20),
        y = 10 + (1 - p.score) * (h - 20);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
      ctx.fillRect(x - 2, y - 2, 4, 4);
    });
    ctx.stroke();
  }
  canvas.setAttribute(
    "aria-label",
    samples.length
      ? `Confidence over actual sample times ${start} to ${end} ms. Missing observations break the line.`
      : "No observed confidence samples",
  );
}

export function confidenceSummary(samples: readonly TrackSample[]) {
  return samples.length
    ? `Raw confidence by sample time (missing observations are gaps): ${samples.map((s) => `${s.atMs} ms: ${s.score === null ? "missing" : s.score}`).join("; ")}`
    : "No observed confidence samples.";
}
