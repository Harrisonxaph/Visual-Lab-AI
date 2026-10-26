import { expect, test, vi } from "vitest";
import { Lab, type LabDependencies } from "../src/lab";
const flush = async () => {
  for (let i = 0; i < 15; i++) await Promise.resolve();
};
function setup(observer: any) {
  let cb: (() => void) | undefined;
  let time = 100;
  const deps: LabDependencies = {
    camera: { start: async () => {}, stop: vi.fn() },
    detector: {
      load: async () => {},
      close: vi.fn(),
      detect: async () => ({ detections: [], inferenceMs: 1 }),
    },
    capture: async () => ({ width: 640, height: 480, close: vi.fn() }) as any,
    schedule: (f) => {
      cb = f;
      return 1;
    },
    cancel: () => {
      cb = undefined;
    },
    now: () => time,
    mediaTime: () => time,
  };
  const lab = new Lab(deps, vi.fn(), observer);
  return {
    lab,
    deps,
    tick: async () => {
      time += 100;
      cb?.();
      await flush();
    },
  };
}
test("accepted frame observer precedes render, controls close segment once, geometry clears", async () => {
  const frames: any[] = [],
    bounds: any[] = [];
  const h = setup({
    onFrame: (f: any) => frames.push(f),
    onBoundary: (b: any) => bounds.push(b),
  });
  await h.lab.start();
  await h.tick();
  expect(frames).toHaveLength(1);
  expect(frames[0]).toMatchObject({ sequence: 1, width: 640, segment: 1 });
  h.lab.pause();
  h.lab.pause();
  expect(bounds).toHaveLength(1);
  h.lab.resume();
  await h.tick();
  expect(frames[1].segment).toBe(2);
  h.lab.geometryChanged(480, 640);
  expect(h.lab.snapshot.detections).toEqual([]);
  h.lab.stop();
  expect(bounds.map((b) => b.reason)).toContain("geometry");
});
test("throwing observer fails safely without recursive observer calls", async () => {
  const onFrame = vi.fn(() => {
    throw new Error("observer failed");
  });
  const h = setup({
    onFrame,
    onBoundary: () => {
      throw new Error("boundary failed");
    },
  });
  await h.lab.start();
  await h.tick();
  expect(h.lab.snapshot.state).toBe("error");
  expect(h.deps.camera.stop).toHaveBeenCalled();
  expect(h.deps.detector.close).toHaveBeenCalled();
  expect(onFrame).toHaveBeenCalledTimes(1);
});

test("late capture and result never commit after geometry or Stop; bitmap closes", async () => {
  const frames: any[] = [],
    bounds: any[] = [];
  const h = setup({
    onFrame: (f: any) => frames.push(f),
    onBoundary: (b: any) => bounds.push(b),
  });
  let resolve!: (v: any) => void;
  const close = vi.fn();
  h.deps.capture = () =>
    new Promise((r) => {
      resolve = r;
    });
  await h.lab.start();
  const tick = h.tick();
  await flush();
  h.lab.stop();
  resolve({ width: 640, height: 480, close });
  await tick;
  expect(close).toHaveBeenCalledOnce();
  expect(frames).toHaveLength(0);
  h.deps.capture = async () => ({ width: 640, height: 480, close }) as any;
  await h.lab.start();
  h.deps.detector.detect = () =>
    new Promise((r) => {
      resolve = r;
    });
  const second = h.tick();
  await flush();
  h.lab.geometryChanged(480, 640);
  resolve({ detections: [], inferenceMs: 1 });
  await second;
  expect(frames).toHaveLength(0);
});
test("observer boundary failure preserves error state and releases resources", async () => {
  const h = setup({
    onFrame: () => {},
    onBoundary: () => {
      throw new Error("observer failed");
    },
  });
  await h.lab.start();
  await h.tick();
  expect(() => h.lab.pause()).not.toThrow();
  expect(h.lab.snapshot.state).toBe("error");
  expect(h.deps.camera.stop).toHaveBeenCalled();
});

test("analysis-gap boundary failure cannot commit another frame after cleanup", async () => {
  let frames = 0;
  const h = setup({
    onFrame: () => {
      frames++;
    },
    onBoundary: () => {
      throw new Error("gap boundary failed");
    },
  });
  await h.lab.start();
  await h.tick();
  let now = 5000;
  h.deps.now = () => now;
  h.deps.mediaTime = () => now;
  await h.tick();
  expect(frames).toBe(1);
  expect(h.lab.snapshot.state).toBe("error");
});

test("capture size change without a resize event starts a new segment and resumes commits", async () => {
  const frames: any[] = [],
    boundaries: any[] = [];
  const h = setup({
    onFrame: (f: any) => frames.push(f),
    onBoundary: (b: any) => boundaries.push(b),
  });
  const start = vi.spyOn(h.deps.camera, "start");
  await h.lab.start();
  await h.tick();
  const close = vi.fn();
  h.deps.capture = async () => ({ width: 480, height: 640, close }) as any;
  await h.tick();
  expect(close).toHaveBeenCalledOnce();
  await h.tick();
  await h.tick();
  expect(frames.map((f) => [f.width, f.height])).toEqual([
    [640, 480],
    [480, 640],
    [480, 640],
  ]);
  expect(frames[1].segment).toBe(2);
  expect(boundaries.map((b) => b.reason)).toEqual(["geometry"]);
  expect(start).toHaveBeenCalledOnce();
  expect(h.deps.detector.close).toHaveBeenCalledOnce();
  expect(h.lab.snapshot.state).toBe("running");
});
