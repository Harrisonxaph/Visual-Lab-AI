import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { MODEL } from "../../src/inference/types";
test("fixed image exposes only actual public same-box runtime categories", async ({
  page,
}) => {
  await page.route("**/src/inference/detector.worker.ts*", async (route) => {
    const source = readFileSync(
      "src/inference/detector.worker.ts",
      "utf8",
    ).replace(
      "const category = detection.categories[0];",
      'console.log("RAW_CATEGORIES", JSON.stringify(detection.categories)); const category = detection.categories[0];',
    );
    // Vite transforms this test-only worker; no production protocol modification.
    const response = await route.fetch();
    const transformed = await response.text();
    await route.fulfill({
      response,
      body: transformed.replace(
        "const category = detection.categories[0];",
        'console.log("RAW_CATEGORIES", JSON.stringify(detection.categories)); const category = detection.categories[0];',
      ),
    });
    expect(source).toContain("RAW_CATEGORIES");
  });
  const categories: { categoryName: string; score: number }[][] = [];
  page.on("console", (msg) => {
    if (msg.text().startsWith("RAW_CATEGORIES "))
      categories.push(JSON.parse(msg.text().slice(15)));
  });
  await page.goto("/");
  const bytes = Array.from(readFileSync("tests/fixtures/cat-and-dog.jpg"));
  await page.evaluate(
    async ({ bytes, config }) => {
      const bitmap = await createImageBitmap(
        new Blob([new Uint8Array(bytes)], { type: "image/jpeg" }),
      );
      const worker = new Worker(
        new URL("/src/inference/detector.worker.ts", location.href),
        { type: "module" },
      );
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          worker.terminate();
          reject(new Error("probe timeout"));
        }, 60000);
        worker.onerror = (e) => {
          clearTimeout(timer);
          worker.terminate();
          reject(new Error(e.message));
        };
        worker.onmessage = ({ data }) => {
          if (data.type === "ready")
            worker.postMessage({ type: "frame", id: 1, bitmap, timestamp: 1 }, [
              bitmap,
            ]);
          if (data.type === "result" || data.type === "error") {
            clearTimeout(timer);
            worker.terminate();
            data.type === "error" ? reject(new Error(data.message)) : resolve();
          }
        };
        worker.postMessage({
          type: "init",
          modelUrl: new URL(config.modelPath, location.href).href,
          wasmUrl: new URL(config.wasmPath, location.href).href,
          scoreThreshold: config.floor,
          maxResults: config.maxResults,
          delegate: config.delegate,
        });
      });
    },
    { bytes, config: MODEL },
  );
  expect(categories.length).toBeGreaterThan(0);
  expect(
    categories.every(
      (list) =>
        list.length === 1 &&
        Number.isFinite(list[0].score) &&
        typeof list[0].categoryName === "string",
    ),
  ).toBe(true);
  console.log("PUBLIC_RAW_CATEGORIES", JSON.stringify(categories));
});
