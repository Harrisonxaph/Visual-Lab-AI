import { FilesetResolver, ImageEmbedder } from "@mediapipe/tasks-vision";
import type { EmbedderRequest, EmbedderResponse } from "./embedder-types";
// MediaPipe falls back from importScripts to this hook in module workers.
(self as unknown as { import: (url: string) => Promise<unknown> }).import = (
  url,
) => import(/* @vite-ignore */ url);
// The vendor loader references a debug hook across a block in strict module scope.
(self as unknown as { custom_dbg: (...args: unknown[]) => void }).custom_dbg = (
  ...args
) => console.debug(...args);
let embedder: ImageEmbedder | undefined;
const send = (message: EmbedderResponse, transfer: Transferable[] = []) =>
  self.postMessage(message, { transfer });
self.onmessage = async ({ data }: MessageEvent<EmbedderRequest>) => {
  if (data.type === "init") {
    try {
      const fileset = await FilesetResolver.forVisionTasks(
        data.wasmUrl.replace(/\/$/, ""),
      );
      embedder = await ImageEmbedder.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: data.modelUrl, delegate: "CPU" },
        runningMode: "IMAGE",
        l2Normalize: true,
        quantize: false,
      });
      send({ type: "ready" });
    } catch (error) {
      send({
        type: "error",
        message:
          error instanceof Error ? error.message : "The encoder did not load.",
      });
    }
    return;
  }
  let bitmap: ImageBitmap | undefined;
  try {
    if (!embedder) throw new Error("The encoder is not ready.");
    bitmap = await createImageBitmap(data.image);
    const started = performance.now();
    const values = embedder.embed(bitmap).embeddings[0]?.floatEmbedding;
    if (!values?.length) throw new Error("The encoder returned no embedding.");
    const vector = Float32Array.from(values);
    send(
      {
        type: "embedding",
        id: data.id,
        vector,
        ms: performance.now() - started,
      },
      [vector.buffer],
    );
  } catch (error) {
    send({
      type: "failed",
      id: data.id,
      message:
        error instanceof Error
          ? error.message
          : "This photo could not be read.",
    });
  } finally {
    bitmap?.close();
  }
};
