/** Bound capture waits; close late results so cancellation cannot leak frame memory. */
export function captureFrame(
  video: HTMLVideoElement,
  create: (video: HTMLVideoElement) => Promise<ImageBitmap> = createImageBitmap,
  timeout = 5000,
): Promise<ImageBitmap> {
  return new Promise((resolve, reject) => {
    let finished = false;
    const timer = setTimeout(() => {
      finished = true;
      reject(new Error("Frame capture timed out. Try starting again."));
    }, timeout);
    Promise.resolve()
      .then(() => create(video))
      .then(
        (bitmap) => {
          if (finished) {
            bitmap.close();
            return;
          }
          finished = true;
          clearTimeout(timer);
          resolve(bitmap);
        },
        (error) => {
          if (!finished) {
            finished = true;
            clearTimeout(timer);
            reject(error);
          }
        },
      );
  });
}
