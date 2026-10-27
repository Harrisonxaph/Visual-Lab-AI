export interface ChartSeries {
  name: string;
  color: string;
  dashed?: boolean;
  values: (number | null)[];
}

/**
 * Line chart of a value per epoch (x = epoch 0..n). `yMax` fixes the top of the scale (1 for
 * accuracy); otherwise it fits the largest value. Gaps (null) break the line.
 */
export function drawEpochChart(
  canvas: HTMLCanvasElement,
  series: readonly ChartSeries[],
  options: { yMax?: number; title: string; percent?: boolean },
) {
  const w = Math.max(1, canvas.clientWidth || 300),
    h = 170,
    dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);
  const left = 38,
    right = 10,
    top = 22,
    bottom = 22;
  const n = Math.max(1, ...series.map((s) => s.values.length - 1));
  const finite = series.flatMap((s) =>
    s.values.filter((v): v is number => v !== null && Number.isFinite(v)),
  );
  const yMax = options.yMax ?? Math.max(1e-9, ...finite) * 1.05;
  const x = (i: number) => left + (i / n) * (w - left - right);
  const y = (v: number) => top + (1 - v / yMax) * (h - top - bottom);
  const label = (v: number) =>
    options.percent ? `${Math.round(v * 100)}%` : v.toFixed(2);

  ctx.font = "11px sans-serif";
  ctx.fillStyle = "#718078";
  ctx.strokeStyle = "#e3e8df";
  ctx.lineWidth = 1;
  for (const f of [0, 0.5, 1]) {
    ctx.beginPath();
    ctx.moveTo(left, y(yMax * f));
    ctx.lineTo(w - right, y(yMax * f));
    ctx.stroke();
    ctx.fillText(label(yMax * f), 2, y(yMax * f) + 4);
  }
  ctx.fillText(`epoch 0`, left, h - 6);
  const end = `epoch ${n}`;
  ctx.fillText(end, w - right - ctx.measureText(end).width, h - 6);

  let legendX = left;
  for (const s of series) {
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
    ctx.lineWidth = 2;
    ctx.setLineDash(s.dashed ? [5, 4] : []);
    ctx.beginPath();
    let drawing = false;
    s.values.forEach((v, i) => {
      if (v === null || !Number.isFinite(v)) {
        drawing = false;
        return;
      }
      if (drawing) ctx.lineTo(x(i), y(Math.min(v, yMax)));
      else ctx.moveTo(x(i), y(Math.min(v, yMax)));
      drawing = true;
    });
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(legendX, 10);
    ctx.lineTo(legendX + 18, 10);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillText(s.name, legendX + 22, 14);
    legendX += 30 + ctx.measureText(s.name).width;
  }
  const last = (s: ChartSeries) => s.values.at(-1);
  canvas.setAttribute("role", "img");
  canvas.setAttribute(
    "aria-label",
    `${options.title} over ${n} epochs. ` +
      series
        .map((s) => {
          const first = s.values[0],
            final = last(s);
          return first === null || final === null || final === undefined
            ? `${s.name}: not available`
            : `${s.name} from ${label(first)} to ${label(final)}`;
        })
        .join("; "),
  );
}
