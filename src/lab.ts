import type {
  CommittedFrame,
  TrackingBoundary,
  BoundaryReason,
} from "./tracking/types";
export interface LabObserver {
  onFrame(frame: CommittedFrame): void;
  onBoundary(boundary: TrackingBoundary): void;
}
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
  private sessionId = 0;
  private segment = 0;
  private geometry = 0;
  private sequence = 0;
  private segmentOpen = false;
  private dimensions: { width: number; height: number } | null = null;
  private previousSample: number | null = null;
  private suppressObserver = false;
  private boundary(reason: BoundaryReason) {
    if (!this.segmentOpen) return true;
    this.segmentOpen = false;
    if (!this.suppressObserver) {
      try {
        this.observer?.onBoundary({
          sessionId: this.sessionId,
          segment: this.segment,
          reason,
          atMs: this.deps.now(),
        });
      } catch (error) {
        this.suppressObserver = true;
        this.fail(error);
        return false;
      }
    }
    return true;
  }
  geometryChanged(width: number, height: number): void {
    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0
    )
      return;
    if (this.dimensions?.width === width && this.dimensions.height === height)
      return;
    this.dimensions = { width, height };
    if (this.snapshot.state !== "running" && this.snapshot.state !== "paused")
      return;
    if (!this.boundary("geometry")) return;
    this.geometry++;
    this.generation++;
    this.previousSample = null;
    this.emit({ detections: [], width, height });
    this.schedule();
  }
  private scheduled?: number;
  private busy = false;
  private pauseAfterLoad = false;
  private lastVideoTime = -1;
  private lastTimestamp = 0;
  private lastFrameAt = -Infinity;
  private meter = new ProcessingMeter();
  constructor(
    private deps: LabDependencies,
    private update: (snapshot: Snapshot) => void,
    private observer?: LabObserver,
  ) {}
  private emit(patch: Partial<Snapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.update(this.snapshot);
  }
  async start(): Promise<void> {
    this.stop();
    this.suppressObserver = false;
    this.sessionId++;
    this.segment = 0;
    this.geometry = 1;
    this.sequence = 0;
    this.segmentOpen = false;
    this.dimensions = null;
    this.previousSample = null;
    this.pauseAfterLoad = false;
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
      if (this.pauseAfterLoad) this.pause();
      else this.schedule();
    } catch (error) {
      if (generation === this.generation) this.fail(error);
    }
  }
  pause(reason: "pause" | "hidden" = "pause"): void {
    if (this.snapshot.state === "loading") {
      this.pauseAfterLoad = true;
      return;
    }
    if (this.snapshot.state !== "running") return;
    if (!this.boundary(reason)) return;
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
    this.previousSample = null;
    this.lastVideoTime = -1;
    this.lastFrameAt = -Infinity;
    this.meter.reset(this.deps.now());
    this.emit({ state: "running", message: "" });
    this.schedule();
  }
  stop(reason: BoundaryReason = "stop"): void {
    if (!this.boundary(reason)) return;
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
  cameraEnded(): void {
    this.stop("camera-ended");
    this.emit({
      message:
        "Camera connection ended. The camera may have disconnected or been interrupted by another app. Choose Start camera to reconnect.",
    });
  }
  fail(error: unknown): void {
    this.stop("error");
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
      if (
        this.dimensions &&
        (width !== this.dimensions.width || height !== this.dimensions.height)
      ) {
        bitmap.close();
        return;
      }
      this.dimensions = { width, height };
      const timestamp = Math.max(this.deps.now(), this.lastTimestamp + 1);
      this.lastTimestamp = timestamp;
      const result = await this.deps.detector.detect(bitmap, timestamp);
      if (generation !== this.generation || this.snapshot.state !== "running")
        return;
      if (this.previousSample !== null && now - this.previousSample > 2000)
        if (!this.boundary("analysis-gap")) return;
      if (!this.segmentOpen) {
        this.segment++;
        this.segmentOpen = true;
      }
      this.previousSample = now;
      const frame: CommittedFrame = {
        sessionId: this.sessionId,
        segment: this.segment,
        geometry: this.geometry,
        sequence: ++this.sequence,
        sampledAtMs: now,
        completedAtMs: this.deps.now(),
        width,
        height,
        detections: result.detections,
      };
      try {
        this.observer?.onFrame(frame);
      } catch (error) {
        this.suppressObserver = true;
        throw error;
      }
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
