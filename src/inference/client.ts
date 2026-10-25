import type {
  Detection,
  DetectorConfiguration,
  WorkerRequest,
  WorkerResponse,
} from "./types";
export interface FrameResult {
  detections: Detection[];
  inferenceMs: number;
}
interface Pending<T> {
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}
function initializationError(detail?: string): Error {
  return new Error(
    "Inference could not start. Required app, model or runtime files may be unavailable. Check your connection and choose Start camera to retry." +
      (detail ? ` Detector: ${detail}` : ""),
  );
}
/** A fresh worker for each session; at most one transferred frame may be outstanding. */
export class WorkerDetector {
  private worker?: Worker;
  private ready?: Pending<void>;
  private frame?: Pending<FrameResult>;
  private loaded = false;
  private id = 0;
  onFatal?: (error: Error) => void;
  constructor(
    private config: DetectorConfiguration,
    private factory: () => Worker = () =>
      new Worker(new URL("./detector.worker.ts", import.meta.url), {
        type: "module",
      }),
    private loadTimeout = 45000,
  ) {}
  load(): Promise<void> {
    this.close();
    return new Promise((resolve, reject) => {
      try {
        const worker = this.factory();
        this.worker = worker;
        this.ready = {
          resolve,
          reject,
          timer: setTimeout(
            () =>
              this.fail(
                new Error(
                  "Model loading timed out. Check your connection and try again.",
                ),
              ),
            this.loadTimeout,
          ),
        };
        worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
          if (worker !== this.worker) return;
          if (data.type === "ready") {
            this.loaded = true;
            if (this.ready) {
              clearTimeout(this.ready.timer);
              this.ready.resolve();
              this.ready = undefined;
            }
          }
          if (data.type === "result" && data.id === this.id && this.frame) {
            const pending = this.frame;
            this.frame = undefined;
            clearTimeout(pending.timer);
            pending.resolve(data);
          }
          if (data.type === "error")
            this.fail(
              this.loaded
                ? new Error(`Detector: ${data.message}`)
                : initializationError(data.message),
            );
        };
        worker.onerror = (event) => {
          if (worker !== this.worker) return;
          event.preventDefault?.();
          this.fail(
            this.loaded
              ? new Error(
                  "The inference worker stopped unexpectedly. Choose Start camera to retry.",
                )
              : initializationError(),
          );
        };
        worker.onmessageerror = () => {
          if (worker !== this.worker) return;
          this.fail(
            new Error("This browser could not transfer inference data."),
          );
        };
        const base = new URL(import.meta.env.BASE_URL, location.href);
        this.post({
          type: "init",
          modelUrl: new URL(this.config.modelPath, base).href,
          wasmUrl: new URL(this.config.wasmPath, base).href,
          scoreThreshold: this.config.floor,
          maxResults: this.config.maxResults,
          delegate: this.config.delegate,
        });
      } catch (error) {
        this.fail(
          error instanceof Error
            ? error
            : new Error("Could not create the inference worker."),
        );
        reject(error);
      }
    });
  }
  detect(bitmap: ImageBitmap, timestamp: number): Promise<FrameResult> {
    if (!this.loaded || !this.worker || this.frame) {
      bitmap.close();
      return Promise.reject(
        new Error("Inference worker is unavailable or busy."),
      );
    }
    return new Promise((resolve, reject) => {
      this.frame = {
        resolve,
        reject,
        timer: setTimeout(
          () =>
            this.fail(new Error("Inference timed out. Try starting again.")),
          15000,
        ),
      };
      try {
        this.post({ type: "frame", id: ++this.id, bitmap, timestamp }, [
          bitmap,
        ]);
      } catch (error) {
        bitmap.close();
        this.fail(
          error instanceof Error ? error : new Error("Frame transfer failed."),
        );
      }
    });
  }
  private post(message: WorkerRequest, transfer: Transferable[] = []) {
    this.worker!.postMessage(message, transfer);
  }
  private fail(error: Error) {
    this.close(error);
    this.onFatal?.(error);
  }
  close(error = new Error("Inference session stopped.")): void {
    this.loaded = false;
    this.worker?.terminate();
    this.worker = undefined;
    for (const pending of [this.ready, this.frame])
      if (pending) {
        clearTimeout(pending.timer);
        pending.reject(error);
      }
    this.ready = undefined;
    this.frame = undefined;
  }
}
