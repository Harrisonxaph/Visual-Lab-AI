export type EmbedderRequest =
  | { type: "init"; modelUrl: string; wasmUrl: string }
  | { type: "embed"; id: number; image: Blob };
export type EmbedderResponse =
  | { type: "ready" }
  | { type: "embedding"; id: number; vector: Float32Array; ms: number }
  | { type: "failed"; id: number; message: string }
  | { type: "error"; message: string };
