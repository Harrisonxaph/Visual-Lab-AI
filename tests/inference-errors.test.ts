import { afterEach, expect, it, vi } from "vitest";
import { WorkerDetector } from "../src/inference/client";
import { MODEL, type WorkerResponse } from "../src/inference/types";

afterEach(() => vi.unstubAllGlobals());
function setup() {
  vi.stubGlobal("location", { href: "http://localhost/" });
  const worker = {
    postMessage: vi.fn(),
    terminate: vi.fn(),
    onmessage: null as ((event: MessageEvent<WorkerResponse>) => void) | null,
    onerror: null as ((event: ErrorEvent) => void) | null,
    onmessageerror: null,
  };
  const detector = new WorkerDetector(MODEL, () => worker as unknown as Worker);
  const fatal = vi.fn();
  detector.onFatal = fatal;
  return { worker, detector, fatal };
}

it.each([true, false])(
  "initialization failure offers connection/retry guidance without trusting onLine=%s",
  async (onLine) => {
    vi.stubGlobal("navigator", { onLine });
    const { worker, detector } = setup();
    const loading = detector.load();
    const failure = expect(loading).rejects.toThrow(
      /required.*files.*check your connection.*Start camera/is,
    );
    worker.onerror!({ preventDefault: vi.fn() } as unknown as ErrorEvent);
    await failure;
    expect(worker.terminate).toHaveBeenCalledOnce();
  },
);

it("initialization-reported runtime details remain visible alongside retry guidance", async () => {
  const { worker, detector } = setup();
  const failure = expect(detector.load()).rejects.toThrow(
    /Check your connection.*Detector: Unsupported model operator CustomOp/is,
  );
  worker.onmessage!({
    data: { type: "error", message: "Unsupported model operator CustomOp" },
  } as MessageEvent<WorkerResponse>);
  await failure;
  expect(worker.terminate).toHaveBeenCalledOnce();
});

it("a worker failure after ready remains a runtime error and rejects the in-flight frame", async () => {
  const { worker, detector, fatal } = setup();
  const loading = detector.load();
  worker.onmessage!({
    data: { type: "ready" },
  } as MessageEvent<WorkerResponse>);
  await loading;
  const frame = detector.detect(
    { close: vi.fn() } as unknown as ImageBitmap,
    1,
  );
  const failure = expect(frame).rejects.toThrow(
    "The inference worker stopped unexpectedly. Choose Start camera to retry.",
  );
  worker.onerror!({ preventDefault: vi.fn() } as unknown as ErrorEvent);
  await failure;
  expect(fatal.mock.calls[0][0].message).not.toMatch(
    /connection|network|not support/i,
  );
  expect(worker.terminate).toHaveBeenCalledOnce();
});

it("a reported inference error keeps its runtime details without adding network advice", async () => {
  const { worker, detector, fatal } = setup();
  const loading = detector.load();
  worker.onmessage!({
    data: { type: "ready" },
  } as MessageEvent<WorkerResponse>);
  await loading;
  worker.onmessage!({
    data: { type: "error", message: "Invalid input tensor" },
  } as MessageEvent<WorkerResponse>);
  expect(fatal.mock.calls[0][0].message).toBe("Detector: Invalid input tensor");
  expect(worker.terminate).toHaveBeenCalledOnce();
});
