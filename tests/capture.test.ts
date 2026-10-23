import { it, expect, vi } from "vitest";
import { captureFrame } from "../src/capture";
it("times out a stalled capture and closes the bitmap if it later arrives", async () => {
  vi.useFakeTimers();
  let finish!: (frame: ImageBitmap) => void;
  const close = vi.fn();
  const create = () =>
    new Promise<ImageBitmap>((resolve) => {
      finish = resolve;
    });
  const result = expect(
    captureFrame({} as HTMLVideoElement, create, 100),
  ).rejects.toThrow(/timed out/i);
  await vi.advanceTimersByTimeAsync(101);
  await result;
  finish({ close } as unknown as ImageBitmap);
  await vi.advanceTimersByTimeAsync(0);
  expect(close).toHaveBeenCalledOnce();
  vi.useRealTimers();
});
