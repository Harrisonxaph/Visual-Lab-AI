import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { MODEL } from "../../src/inference/types";
for (const floor of [MODEL.floor, 0.9])
  test(`actual CPU/WASM worker honors the configured ${floor} score floor`, async ({
    page,
  }) => {
    await page.goto("/");
    const bytes = Array.from(readFileSync("tests/fixtures/cat-and-dog.jpg"));
    const result = await page.evaluate(
      async ({ imageBytes, config, floor }) => {
        const bitmap = await createImageBitmap(
          new Blob([new Uint8Array(imageBytes)], { type: "image/jpeg" }),
        );
        const worker = new Worker(
          new URL("/src/inference/detector.worker.ts", location.href),
          { type: "module" },
        );
        return await new Promise<{
          detections: {
            label: string;
            score: number;
            box: { x: number; y: number; width: number; height: number };
          }[];
          inferenceMs: number;
        }>((resolve, reject) => {
          const timer = setTimeout(() => {
            worker.terminate();
            reject(new Error("Worker timed out"));
          }, 60000);
          worker.onerror = (e) => {
            clearTimeout(timer);
            worker.terminate();
            reject(new Error(e.message));
          };
          worker.onmessage = ({ data }) => {
            if (data.type === "ready")
              worker.postMessage(
                { type: "frame", id: 1, bitmap, timestamp: 1 },
                [bitmap],
              );
            if (data.type === "error") {
              clearTimeout(timer);
              worker.terminate();
              reject(new Error(data.message));
            }
            if (data.type === "result") {
              clearTimeout(timer);
              worker.terminate();
              resolve(data);
            }
          };
          worker.postMessage({
            type: "init",
            modelUrl: new URL(config.modelPath, location.href).href,
            wasmUrl: new URL(config.wasmPath, location.href).href,
            scoreThreshold: floor,
            maxResults: config.maxResults,
            delegate: config.delegate,
          });
        });
      },
      { imageBytes: bytes, config: MODEL, floor },
    );
    expect(result.inferenceMs).toBeGreaterThan(0);
    if (floor === MODEL.floor) {
      expect(result.detections.map((d) => d.label)).toContain("cat");
      expect(result.detections.map((d) => d.label)).toContain("dog");
    } else expect(result.detections).toEqual([]);
    for (const detection of result.detections) {
      expect(detection.score).toBeGreaterThanOrEqual(floor);
      expect(detection.score).toBeLessThanOrEqual(1);
      for (const n of Object.values(detection.box))
        expect(Number.isFinite(n)).toBe(true);
    }
    console.log("REAL_RUNTIME_RESULT", JSON.stringify(result));
  });
