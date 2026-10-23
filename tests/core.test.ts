import { describe, it, expect, vi } from 'vitest';
import { filterDetections, clipBox, ProcessingMeter } from '../src/detections';
import { Camera } from '../src/camera';
import { Lab, type LabDependencies } from '../src/lab';
import { WorkerDetector } from '../src/inference/client';
const detection = { label: 'cat', score: 0.5, box: { x: 0, y: 0, width: 10, height: 10 } };
const deferred = <T>() => { let resolve!: (value: T) => void; let reject!: (reason: unknown) => void; const promise = new Promise<T>((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; };
const flush = async () => { for(let i=0;i<12;i++) await Promise.resolve(); };
function harness() {
  let callback: (() => void) | undefined;
  const close = vi.fn();
  const deps: LabDependencies = {
    camera: { start: vi.fn(async () => {}), stop: vi.fn() },
    detector: { load: vi.fn(async () => {}), detect: vi.fn(async () => ({ detections: [detection], inferenceMs: 20 })), close: vi.fn() },
    capture: vi.fn(async () => ({ width: 640, height: 480, close } as unknown as ImageBitmap)),
    schedule: (cb) => { callback=cb; return 1; }, cancel: () => { callback=undefined; }, now: () => 100,
    mediaTime: () => 1,
  };
  const lab = new Lab(deps, vi.fn());
  return { lab, deps, close, tick: async () => { const cb=callback;callback=undefined;cb?.();await flush(); } };
}
describe('detection processing', () => {
  it('uses inclusive thresholds, rejects invalid scores and handles empty output', () => {
    expect(filterDetections([detection], 0.5)).toHaveLength(1);
    expect(filterDetections([detection], 0.51)).toEqual([]);
    expect(filterDetections([], 0.05)).toEqual([]);
    expect(filterDetections([{...detection,score:NaN},{...detection,score:1.1}],0.05)).toEqual([]);
  });
  it('clips native pixel boxes to the frame and rejects invisible boxes', () => {
    expect(clipBox({x:-10,y:20,width:30,height:100},100,80)).toEqual({x:0,y:20,width:20,height:60});
    expect(clipBox({x:120,y:0,width:10,height:10},100,80)).toBeNull();
  });
  it('measures completed frames per elapsed time, not camera FPS', () => {
    const meter=new ProcessingMeter();meter.reset(0);
    expect(meter.complete(250)).toBe(4);expect(meter.complete(1000)).toBe(2);
    meter.reset(2000);expect(meter.complete(2500)).toBe(2);
  });
});
describe('camera privacy lifecycle', () => {
  it('releases a camera stream granted after Stop', async () => {
    const permission=deferred<MediaStream>(); const stop=vi.fn();
    const video={srcObject:null,play:vi.fn(async()=>{}),pause:vi.fn()} as unknown as HTMLVideoElement;
    const camera=new Camera(video,()=>{},()=>permission.promise);
    const pending=camera.start(); camera.stop();permission.resolve({getTracks:()=>[{stop,addEventListener:vi.fn(),removeEventListener:vi.fn()}]} as unknown as MediaStream);
    await pending;expect(stop).toHaveBeenCalledOnce();expect(video.srcObject).toBeNull();
  });
  it('propagates camera permission rejection', async () => {
    const camera=new Camera({pause:vi.fn()} as unknown as HTMLVideoElement,()=>{},async()=>{throw new DOMException('Denied','NotAllowedError');});
    await expect(camera.start()).rejects.toMatchObject({name:'NotAllowedError'});
  });
});
describe('lab cancellation and scheduling', () => {
  it('does not accept results after pause and permits a fresh frame after resume', async () => {
    const h=harness();const inference=deferred<{detections: typeof detection[];inferenceMs:number}>();
    vi.mocked(h.deps.detector.detect).mockReturnValueOnce(inference.promise);
    await h.lab.start();await h.tick();h.lab.pause();
    inference.resolve({detections:[detection],inferenceMs:20});await flush();
    expect(h.lab.snapshot.state).toBe('paused');expect(h.lab.snapshot.detections).toEqual([]);
    h.lab.resume();await h.tick();expect(h.lab.snapshot.detections).toEqual([detection]);
  });
  it('closes a bitmap captured after stop without sending it to the worker', async () => {
    const h=harness();const frame=deferred<ImageBitmap>();vi.mocked(h.deps.capture).mockReturnValueOnce(frame.promise);
    await h.lab.start();await h.tick();h.lab.stop();frame.resolve({close:h.close} as unknown as ImageBitmap);await flush();
    expect(h.close).toHaveBeenCalledOnce();expect(h.deps.detector.detect).not.toHaveBeenCalled();expect(h.lab.snapshot.state).toBe('stopped');
  });
  it('limits processing to one frame in flight', async () => {
    const h=harness();const inference=deferred<{detections: typeof detection[];inferenceMs:number}>();
    vi.mocked(h.deps.detector.detect).mockReturnValueOnce(inference.promise);
    await h.lab.start();await h.tick();await h.tick();expect(h.deps.capture).toHaveBeenCalledOnce();
    h.lab.stop();inference.resolve({detections:[],inferenceMs:1});await flush();
  });
  it('reports model failures, releases camera and can retry', async () => {
    const h=harness();vi.mocked(h.deps.detector.load).mockRejectedValueOnce(new Error('Model unavailable'));
    await h.lab.start();expect(h.lab.snapshot.state).toBe('error');expect(h.deps.camera.stop).toHaveBeenCalled();
    await h.lab.start();expect(h.lab.snapshot.state).toBe('running');h.lab.stop();
  });
  it('does not revive after Stop while loading', async () => {
    const h=harness();const load=deferred<void>();vi.mocked(h.deps.detector.load).mockReturnValueOnce(load.promise);
    const starting=h.lab.start();await flush();h.lab.stop();load.resolve();await starting;
    expect(h.lab.snapshot.state).toBe('stopped');
  });
});
describe('worker lifecycle', () => {
  it('times out model loading, terminates the worker and creates a new one on retry', async () => {
    vi.useFakeTimers();vi.stubGlobal('location',{href:'http://localhost/'});
    const worker={postMessage:vi.fn(),terminate:vi.fn(),onmessage:null,onerror:null,onmessageerror:null};
    const factory=vi.fn(()=>worker as unknown as Worker);
    const detector=new WorkerDetector(factory,100);
    const rejected=expect(detector.load()).rejects.toThrow(/timed out/i);
    await vi.advanceTimersByTimeAsync(101);await rejected;expect(worker.terminate).toHaveBeenCalledOnce();
    const retry=detector.load();
    (worker.onmessage as unknown as (e: {data:unknown})=>void)({data:{type:'ready'}});await retry;
    expect(factory).toHaveBeenCalledTimes(2);detector.close();vi.useRealTimers();vi.unstubAllGlobals();
  });
});
