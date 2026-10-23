import { it, expect, vi } from "vitest";
import { MODEL } from "../src/inference/types";
import { WorkerDetector } from "../src/inference/client";
import { modelDetails } from "../src/model-info";

it("passes the supplied model path and inference configuration to a worker", async () => {
  vi.stubGlobal("location", { href: "https://lab.test/" });
  const config = {
    ...MODEL,
    name: "Another detector",
    modelPath: "models/another.tflite",
    wasmPath: "runtime/",
    floor: 0.2,
    maxResults: 7,
  };
  const worker = {
    postMessage: vi.fn(),
    terminate: vi.fn(),
    onmessage: null,
    onerror: null,
    onmessageerror: null,
  };
  const detector = new WorkerDetector(
    config,
    () => worker as unknown as Worker,
  );
  const ready = detector.load();
  ready.catch(() => {});
  try {
    expect(worker.postMessage).toHaveBeenCalledWith(
      {
        type: "init",
        modelUrl: "https://lab.test/models/another.tflite",
        wasmUrl: "https://lab.test/runtime/",
        scoreThreshold: 0.2,
        maxResults: 7,
        delegate: "CPU",
      },
      [],
    );
    (worker.onmessage as unknown as (event: { data: unknown }) => void)({
      data: { type: "ready" },
    });
    await ready;
  } finally {
    detector.close();
    await ready.catch(() => {});
    vi.unstubAllGlobals();
  }
});
it("derives every displayed model field from supplied metadata", () => {
  const model = {
    ...MODEL,
    name: "Different detector",
    version: "test / v9",
    runtime: "Test Runtime 1.2.3",
    delegate: "CPU" as const,
    bytes: 2097152,
    categories: 4,
    source: "A test publisher",
    compatibility: "Tested only on a test engine",
  };
  expect(modelDetails(model)).toMatchObject({
    name: "Different detector",
    version: "test / v9",
    runtime: "Test Runtime 1.2.3 · CPU/WASM",
    coverage: "4 COCO categories",
    size: "2.0 MiB",
    source: "A test publisher",
    compatibility: "Tested only on a test engine",
    stageLabel: "Different detector · CPU",
  });
});
