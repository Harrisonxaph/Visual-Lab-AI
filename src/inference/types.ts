export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Detection {
  label: string;
  score: number;
  box: Box;
}
export type WorkerRequest =
  | { type: "init"; modelUrl: string; wasmUrl: string }
  | { type: "frame"; id: number; bitmap: ImageBitmap; timestamp: number };
export type WorkerResponse =
  | { type: "ready" }
  | { type: "result"; id: number; detections: Detection[]; inferenceMs: number }
  | { type: "error"; message: string };
export const MODEL = {
  name: "EfficientDet-Lite0",
  version: "float32 / v1",
  runtime: "MediaPipe Tasks Vision 0.10.32",
  delegate: "CPU / WASM",
  floor: 0.05,
  maxResults: 50,
  bytes: 13836895,
} as const;
