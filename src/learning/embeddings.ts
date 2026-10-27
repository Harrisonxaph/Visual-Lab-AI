import type { BlobRecord, ImageRecord } from "../datasets/types";
import { ENCODER, ENCODER_KEY } from "./encoder";
import { assertNoTestImages } from "./examples";
import type { EmbeddingRecord } from "./types";

export class CancelledError extends Error {
  constructor() {
    super("Cancelled.");
  }
}

export interface EmbeddingStore {
  getEmbeddings(imageIds: readonly string[]): Promise<EmbeddingRecord[]>;
  saveEmbeddings(records: EmbeddingRecord[]): Promise<void>;
  getBlob(id: string): Promise<BlobRecord | undefined>;
}

export interface EmbeddingResult {
  vectors: Map<string, Float32Array>;
  computed: number;
  reused: number;
}

/**
 * Returns an embedding for every photo, reusing ones already saved on this device for the same
 * encoder and computing (then saving) the rest one at a time. Test-split photos are refused.
 * Cancelling keeps every embedding saved so far.
 */
export async function embedImages(
  store: EmbeddingStore,
  embed: (image: Blob) => Promise<Float32Array>,
  images: readonly Pick<ImageRecord, "id" | "datasetId" | "split">[],
  options: {
    signal?: AbortSignal;
    onProgress?: (done: number, total: number) => void;
  } = {},
): Promise<EmbeddingResult> {
  assertNoTestImages(images);
  const vectors = new Map<string, Float32Array>();
  for (const e of await store.getEmbeddings(images.map((i) => i.id)))
    if (e.encoderKey === ENCODER_KEY && e.vector?.length === ENCODER.dimensions)
      vectors.set(e.imageId, e.vector);
  const reused = vectors.size;
  const missing = images.filter((i) => !vectors.has(i.id));
  let computed = 0;
  options.onProgress?.(reused, images.length);
  for (const image of missing) {
    if (options.signal?.aborted) throw new CancelledError();
    const blob = await store.getBlob(image.id);
    if (!blob) throw new Error("A photo is missing from storage.");
    const vector = await embed(blob.image);
    if (vector.length !== ENCODER.dimensions)
      throw new Error("The encoder returned an unexpected number of values.");
    await store.saveEmbeddings([
      {
        imageId: image.id,
        datasetId: image.datasetId,
        encoderKey: ENCODER_KEY,
        vector,
      },
    ]);
    vectors.set(image.id, vector);
    computed++;
    options.onProgress?.(reused + computed, images.length);
  }
  return { vectors, computed, reused };
}
