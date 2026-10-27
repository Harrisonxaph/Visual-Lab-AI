/** Deterministic pseudo-random numbers from a seed (mulberry32). */
export function seededRandom(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const EXAMPLE_LABELS = ["circle", "square", "triangle"] as const;
export type ExampleLabel = (typeof EXAMPLE_LABELS)[number];
export const EXAMPLE_PER_LABEL = 20;

export interface ExampleItem {
  file: File;
  label: ExampleLabel;
  /** What this item demonstrates, for tests and explanations. */
  kind: "normal" | "near-copy" | "exact-duplicate";
}

function draw(
  ctx: OffscreenCanvasRenderingContext2D,
  label: ExampleLabel,
  r: () => number,
) {
  const size = 256;
  // Textured gradient background, so different images have clearly different fingerprints.
  const g = ctx.createLinearGradient(0, 0, size * r(), size);
  g.addColorStop(0, `hsl(${r() * 360},45%,${55 + r() * 30}%)`);
  g.addColorStop(1, `hsl(${r() * 360},45%,${35 + r() * 30}%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = `hsla(${r() * 360},40%,${30 + r() * 50}%,0.35)`;
    ctx.beginPath();
    ctx.arc(r() * size, r() * size, 10 + r() * 40, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = `hsl(${r() * 360},75%,${15 + r() * 25}%)`;
  const s = 70 + r() * 80,
    x = 20 + r() * (size - s - 40),
    y = 20 + r() * (size - s - 40);
  ctx.beginPath();
  if (label === "circle") ctx.arc(x + s / 2, y + s / 2, s / 2, 0, Math.PI * 2);
  else if (label === "square") ctx.rect(x, y, s, s);
  else {
    ctx.moveTo(x + s / 2, y);
    ctx.lineTo(x + s, y + s);
    ctx.lineTo(x, y + s);
    ctx.closePath();
  }
  ctx.fill();
}

/**
 * Generates the example dataset: 20 images each of circles, squares and triangles drawn in
 * code (no photos, no licensing questions). It deliberately adds one slightly brightened
 * re-saved copy (a near-duplicate) and one byte-identical copy (an exact duplicate) so the
 * duplicate checks have something to find.
 */
export async function generateExampleItems(
  seed = 2026,
): Promise<ExampleItem[]> {
  const r = seededRandom(seed);
  const items: ExampleItem[] = [];
  let first: { blob: Blob; label: ExampleLabel; state: number } | null = null;
  for (let i = 0; i < EXAMPLE_PER_LABEL * EXAMPLE_LABELS.length; i++) {
    const label = EXAMPLE_LABELS[i % EXAMPLE_LABELS.length];
    const c = new OffscreenCanvas(256, 256);
    const ctx = c.getContext("2d")!;
    const state = Math.floor(r() * 2 ** 31);
    draw(ctx, label, seededRandom(state));
    const blob = await c.convertToBlob({ type: "image/png" });
    if (!first) first = { blob, label, state };
    items.push({
      file: new File([blob], `${label}-${i + 1}.png`, { type: "image/png" }),
      label,
      kind: "normal",
    });
  }
  if (first) {
    const c = new OffscreenCanvas(256, 256);
    const ctx = c.getContext("2d")!;
    draw(ctx, first.label, seededRandom(first.state));
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(0, 0, 256, 256);
    const near = await c.convertToBlob({ type: "image/jpeg", quality: 0.8 });
    items.push({
      file: new File([near], `${first.label}-1-resaved.jpg`, {
        type: "image/jpeg",
      }),
      label: first.label,
      kind: "near-copy",
    });
    items.push({
      file: new File([first.blob], `${first.label}-1-copy.png`, {
        type: "image/png",
      }),
      label: first.label,
      kind: "exact-duplicate",
    });
  }
  return items;
}
