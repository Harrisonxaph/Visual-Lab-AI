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
  | {
      type: "init";
      modelUrl: string;
      wasmUrl: string;
      scoreThreshold: number;
      maxResults: number;
      delegate: "CPU";
    }
  | { type: "frame"; id: number; bitmap: ImageBitmap; timestamp: number };
export type WorkerResponse =
  | { type: "ready" }
  | { type: "result"; id: number; detections: Detection[]; inferenceMs: number }
  | { type: "error"; message: string };
/** Configuration belongs to the caller, not the MediaPipe adapter or UI. */
export interface DetectorConfiguration {
  readonly name: string;
  readonly version: string;
  readonly runtime: string;
  readonly delegate: "CPU";
  readonly modelPath: string;
  readonly wasmPath: string;
  readonly floor: number;
  readonly maxResults: number;
  readonly bytes: number;
  readonly categories: number;
  readonly labelSet: string;
  readonly source: string;
  readonly documentationUrl: string;
  readonly compatibility: string;
  readonly assetUrl: string;
  readonly sha256: string;
}
export const MODEL: DetectorConfiguration = {
  name: "EfficientDet-Lite0",
  version: "float32 / v1",
  runtime: "MediaPipe Tasks Vision 0.10.32",
  delegate: "CPU",
  modelPath: "models/efficientdet_lite0.tflite",
  wasmPath: "wasm/",
  floor: 0.05,
  maxResults: 50,
  bytes: 13836895,
  categories: 80,
  labelSet: "COCO",
  source: "Google MediaPipe",
  documentationUrl:
    "https://ai.google.dev/edge/mediapipe/solutions/vision/object_detector",
  compatibility:
    "Chromium worker inference verified with a fixed image. Safari on real iPhone/iPad still requires device testing. No GPU acceleration is assumed.",
  assetUrl:
    "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float32/1/efficientdet_lite0.tflite",
  sha256: "40338edf5ec70d43e318b0a716a84d4564cd1802759a7a07170c7e43796dbf58",
};
