import { MODEL } from "../inference/types";
import type { EmbedderRequest, EmbedderResponse } from "./embedder-types";
import { ENCODER } from "./encoder";

export class EncoderError extends Error {}

/**
 * Runs the frozen encoder in a worker so the page stays responsive. The model file is fetched
 * from this site only when first needed. One photo is processed at a time.
 */
export class Embedder {
  private worker?: Worker;
  private ready?: Promise<void>;
  private pending = new Map<
    number,
    { resolve: (v: Float32Array) => void; reject: (e: Error) => void }
  >();
  private nextId = 0;

  constructor(
    private factory: () => Worker = () =>
      new Worker(new URL("./embedder.worker.ts", import.meta.url), {
        type: "module",
      }),
    private loadTimeout = 45000,
    private embedTimeout = 15000,
  ) {}

  load(): Promise<void> {
    if (this.ready) return this.ready;
    this.ready = new Promise<void>((resolve, reject) => {
      const fail = (message: string) => {
        this.close();
        reject(new EncoderError(message));
      };
      const timer = setTimeout(
        () =>
          fail(
            "The encoder took too long to load. Check your connection and try again.",
          ),
        this.loadTimeout,
      );
      try {
        const worker = this.factory();
        this.worker = worker;
        worker.onmessage = ({ data }: MessageEvent<EmbedderResponse>) => {
          if (data.type === "ready") {
            clearTimeout(timer);
            resolve();
          } else if (data.type === "error") {
            clearTimeout(timer);
            fail(`The encoder could not start: ${data.message}`);
          } else {
            const p = this.pending.get(data.id);
            if (!p) return;
            this.pending.delete(data.id);
            if (data.type === "embedding") p.resolve(data.vector);
            else p.reject(new EncoderError(data.message));
          }
        };
        worker.onerror = (event) => {
          event.preventDefault?.();
          clearTimeout(timer);
          fail("The encoder stopped unexpectedly. Try again.");
        };
        const base = new URL(import.meta.env.BASE_URL, location.href);
        this.post({
          type: "init",
          modelUrl: new URL(ENCODER.modelPath, base).href,
          wasmUrl: new URL(MODEL.wasmPath, base).href,
        });
      } catch {
        clearTimeout(timer);
        fail("This browser could not start the encoder.");
      }
    });
    return this.ready;
  }

  async embed(image: Blob): Promise<Float32Array> {
    await this.load();
    const id = ++this.nextId;
    return new Promise<Float32Array>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new EncoderError("The encoder took too long on a photo."));
      }, this.embedTimeout);
      this.pending.set(id, {
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
      this.post({ type: "embed", id, image });
    });
  }

  private post(message: EmbedderRequest) {
    this.worker!.postMessage(message);
  }

  close() {
    this.worker?.terminate();
    this.worker = undefined;
    this.ready = undefined;
    for (const p of this.pending.values())
      p.reject(new EncoderError("The encoder was stopped."));
    this.pending.clear();
  }
}
