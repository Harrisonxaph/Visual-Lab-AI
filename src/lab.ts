import { cameraError } from "./camera";
import { ProcessingMeter } from "./detections";
import type { Detection } from "./inference/types";
import type { FrameResult } from "./inference/client";
export type LabState =
  | "idle"
  | "loading"
  | "running"
  | "paused"
  | "stopped"
  | "error";
export interface Snapshot {
  state: LabState;
  detections: Detection[];
  inferenceMs: number | null;
  processingFps: number | null;
  width: number;
  height: number;
  error: string;
  message: string;
}
export interface LabDependencies {
  camera: { start(): Promise<void>; stop(): void };
  detector: {
    load(): Promise<void>;
    detect(bitmap: ImageBitmap, timestamp: number): Promise<FrameResult>;
    close(): void;
  };
  capture(): Promise<ImageBitmap>;
  schedule(callback: () => void): number;
  cancel(id: number): void;
  now(): number;
  mediaTime(): number;
}
export class Lab {
  snapshot: Snapshot = {
    state: "idle",
    detections: [],
    inferenceMs: null,
    processingFps: null,
    width: 640,
    height: 480,
    error: "",
    message: "",
  };
  private generation = 0;
  private scheduled?: number;
  private busy = false;
  private lastVideoTime = -1;
  private lastTimestamp = 0;
  private lastFrameAt = -Infinity;
  private meter = new ProcessingMeter();
  constructor(
    private deps: LabDependencies,
    private update: (snapshot: Snapshot) => void,
  ) {}
  private emit(patch: Partial<Snapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.update(this.snapshot);
  }
  async start(): Promise<void> {
    this.stop();
    const generation = this.generation;
    this.emit({
      state: "loading",
      error: "",
      message: "Waiting for camera permission…",
    });
    try {
      await this.deps.camera.start();
      if (generation !== this.generation) return;
      this.emit({ message: "Loading on-device model…" });
      await this.deps.detector.load();
      if (generation !== this.generation) return;
      this.meter.reset(this.deps.now());
      this.lastVideoTime = -1;
      this.emit({ state: "running", message: "" });
      this.schedule();
    } catch (error) {
      if (generation === this.generation) this.fail(error);
    }
  }
  pause(): void {
    if (this.snapshot.state !== "running") return;
    this.generation++;
    this.unschedule();
    this.emit({
      state: "paused",
      detections: [],
      inferenceMs: null,
      processingFps: null,
      message: "Inference paused. Camera preview is still on.",
    });
  }
  resume(): void {
    if (this.snapshot.state !== "paused") return;
    this.lastVideoTime = -1;
    this.lastFrameAt = -Infinity;
    this.meter.reset(this.deps.now());
    this.emit({ state: "running", message: "" });
    this.schedule();
  }
  stop(): void {
    this.generation++;
    this.unschedule();
    this.deps.camera.stop();
    this.deps.detector.close();
    this.emit({
      state: "stopped",
      detections: [],
      inferenceMs: null,
      processingFps: null,
      error: "",
      message: "Camera off. Frames were not saved.",
    });
  }
  fail(error: unknown): void {
    this.stop();
    this.emit({ state: "error", error: cameraError(error), message: "" });
  }
  private unschedule() {
    if (this.scheduled !== undefined) this.deps.cancel(this.scheduled);
    this.scheduled = undefined;
  }
  private schedule() {
    if (
      this.snapshot.state === "running" &&
      !this.busy &&
      this.scheduled === undefined
    )
      this.scheduled = this.deps.schedule(() => {
        this.scheduled = undefined;
        void this.process();
      });
  }
  private async process(): Promise<void> {
    if (this.busy || this.snapshot.state !== "running") return;
    const now = this.deps.now(),
      videoTime = this.deps.mediaTime();
    if (videoTime === this.lastVideoTime || now - this.lastFrameAt < 100) {
      this.schedule();
      return;
    }
    this.busy = true;
    const generation = this.generation;
    try {
      const bitmap = await this.deps.capture();
      if (generation !== this.generation || this.snapshot.state !== "running") {
        bitmap.close();
        return;
      }
      const width = bitmap.width,
        height = bitmap.height;
      this.lastVideoTime = videoTime;
      this.lastFrameAt = now;
      const timestamp = Math.max(this.deps.now(), this.lastTimestamp + 1);
      this.lastTimestamp = timestamp;
      const result = await this.deps.detector.detect(bitmap, timestamp);
      if (generation !== this.generation || this.snapshot.state !== "running")
        return;
      this.emit({
        detections: result.detections,
        width,
        height,
        inferenceMs: result.inferenceMs,
        processingFps: this.meter.complete(this.deps.now()),
      });
    } catch (error) {
      if (generation === this.generation) this.fail(error);
    } finally {
      this.busy = false;
      this.schedule();
    }
  }
}
