import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
test('actual Lite0 CPU/WASM detects a fixed image in a worker', async ({ page }) => {
  await page.goto('/');
  const bytes = Array.from(readFileSync('tests/fixtures/cat-and-dog.jpg'));
  const result = await page.evaluate(async (imageBytes) => {
    const bitmap = await createImageBitmap(new Blob([new Uint8Array(imageBytes)], { type: 'image/jpeg' }));
    const worker = new Worker(new URL('/src/inference/detector.worker.ts', location.href), { type: 'module' });
    return await new Promise<{ detections: { label: string; score: number; box: { x: number; y: number; width: number; height: number } }[]; inferenceMs: number }>((resolve, reject) => {
      const timer = setTimeout(() => { worker.terminate(); reject(new Error('Worker timed out')); }, 60000);
      worker.onerror = (e) => { clearTimeout(timer); worker.terminate(); reject(new Error(e.message)); };
      worker.onmessage = ({ data }) => {
        if (data.type === 'ready') worker.postMessage({ type: 'frame', id: 1, bitmap, timestamp: 1 }, [bitmap]);
        if (data.type === 'error') { clearTimeout(timer); worker.terminate(); reject(new Error(data.message)); }
        if (data.type === 'result') { clearTimeout(timer); worker.terminate(); resolve(data); }
      };
      worker.postMessage({ type: 'init', modelUrl: new URL('/models/efficientdet_lite0.tflite', location.href).href, wasmUrl: new URL('/wasm/', location.href).href });
    });
  }, bytes);
  expect(result.inferenceMs).toBeGreaterThan(0);
  expect(result.detections.map(d => d.label)).toContain('cat');
  expect(result.detections.map(d => d.label)).toContain('dog');
  for (const detection of result.detections) {
    expect(detection.score).toBeGreaterThanOrEqual(0.05);
    expect(detection.score).toBeLessThanOrEqual(1);
    for (const n of Object.values(detection.box)) expect(Number.isFinite(n)).toBe(true);
  }
  console.log('REAL_RUNTIME_RESULT', JSON.stringify(result));
});
