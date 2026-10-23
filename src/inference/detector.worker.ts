import { FilesetResolver, ObjectDetector } from "@mediapipe/tasks-vision";
import { MODEL, type WorkerRequest, type WorkerResponse } from "./types";
// MediaPipe falls back from importScripts to this hook in module workers.
(self as unknown as { import: (url: string) => Promise<unknown> }).import = (
  url,
) => import(/* @vite-ignore */ url);
// The vendor loader references a debug hook across a block in strict module scope.
(self as unknown as { custom_dbg: (...args: unknown[]) => void }).custom_dbg = (
  ...args
) => console.debug(...args);
let detector: ObjectDetector | undefined;
const send = (message: WorkerResponse) => self.postMessage(message);
self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  try {
    if (data.type === "init") {
      const fileset = await FilesetResolver.forVisionTasks(
        data.wasmUrl.replace(/\/$/, ""),
      );
      detector = await ObjectDetector.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: data.modelUrl, delegate: "CPU" },
        runningMode: "VIDEO",
        scoreThreshold: MODEL.floor,
        maxResults: MODEL.maxResults,
      });
      send({ type: "ready" });
    } else {
      try {
        if (!detector) throw new Error("Detector is not ready.");
        const started = performance.now();
        const result = detector.detectForVideo(data.bitmap, data.timestamp);
        const inferenceMs = performance.now() - started;
        const detections = result.detections.flatMap((detection) => {
          const category = detection.categories[0];
          const box = detection.boundingBox;
          return category && box
            ? [
                {
                  label: category.categoryName,
                  score: category.score,
                  box: {
                    x: box.originX,
                    y: box.originY,
                    width: box.width,
                    height: box.height,
                  },
                },
              ]
            : [];
        });
        send({ type: "result", id: data.id, detections, inferenceMs });
      } finally {
        data.bitmap.close();
      }
    }
  } catch (error) {
    send({
      type: "error",
      message:
        error instanceof Error ? error.message : "Model processing failed.",
    });
  }
};
