// No imports: scripts/prepare-assets.mjs loads this file directly in Node.

/** The frozen, pretrained image encoder that turns a photo into 1,024 numbers. */
export const ENCODER = {
  name: "MobileNetV3-Small image embedder",
  version: "float32 / v1",
  runtime: "MediaPipe Tasks Vision 0.10.32",
  modelPath: "models/mobilenet_v3_small.tflite",
  assetUrl:
    "https://storage.googleapis.com/mediapipe-models/image_embedder/mobilenet_v3_small/float32/1/mobilenet_v3_small.tflite",
  sha256: "bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40",
  bytes: 4117670,
  dimensions: 1024,
  documentationUrl:
    "https://ai.google.dev/edge/mediapipe/solutions/vision/image_embedder",
  /** How a photo becomes numbers: MediaPipe stretches it to 224×224, then the output is scaled to length 1. */
  preprocessing: "stretch-224/l2norm/v1",
} as const;

/**
 * Identifies everything that decides an embedding's values. Cached embeddings and saved
 * models made with a different key are not reused.
 */
export const ENCODER_KEY = `${ENCODER.sha256.slice(0, 16)}|${ENCODER.runtime}|${ENCODER.preprocessing}`;
