import { differenceHash, sha256Hex } from "./hash";
import { LIMITS } from "./limits";

export class ImportError extends Error {}

export interface PreparedImage {
  sha256: string;
  dhash: string;
  width: number;
  height: number;
  image: Blob;
  thumb: Blob;
}

async function decode(file: Blob): Promise<ImageBitmap> {
  try {
    // Respect the photo's orientation tag where the browser supports the option.
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    try {
      return await createImageBitmap(file);
    } catch {
      throw new ImportError(
        "This file could not be read as an image in this browser (unsupported format or damaged file).",
      );
    }
  }
}

function canvas(width: number, height: number) {
  const c = new OffscreenCanvas(width, height);
  const ctx = c.getContext("2d");
  if (!ctx) throw new ImportError("This browser could not process the image.");
  return { c, ctx };
}

async function encode(
  source: CanvasImageSource,
  sw: number,
  sh: number,
  longSide: number,
  quality: number,
) {
  const scale = Math.min(1, longSide / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale)),
    h = Math.max(1, Math.round(sh * scale));
  const { c, ctx } = canvas(w, h);
  ctx.fillStyle = "#fff"; // JPEG has no transparency
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, w, h);
  return {
    canvas: c,
    width: w,
    height: h,
    blob: await c.convertToBlob({ type: "image/jpeg", quality }),
  };
}

/**
 * Turns a picked file into what the dataset stores: a downscaled JPEG (longest side 512 px),
 * a small thumbnail, a SHA-256 of the original bytes (exact-duplicate check) and a difference
 * hash (likely near-duplicate check). Re-encoding drops the original file's metadata, such as
 * location and camera details; the original file itself is not kept.
 */
export async function prepareImage(file: Blob): Promise<PreparedImage> {
  if (file.size === 0) throw new ImportError("The file is empty.");
  if (file.size > LIMITS.maxFileBytes)
    throw new ImportError(
      `The file is larger than ${LIMITS.maxFileBytes / 1024 / 1024} MB.`,
    );
  const sha256 = await sha256Hex(await file.arrayBuffer());
  const bitmap = await decode(file);
  try {
    if (!bitmap.width || !bitmap.height)
      throw new ImportError("The image has no pixels.");
    const stored = await encode(
      bitmap,
      bitmap.width,
      bitmap.height,
      LIMITS.storedLongSide,
      LIMITS.storedQuality,
    );
    const thumb = await encode(
      stored.canvas,
      stored.width,
      stored.height,
      LIMITS.thumbLongSide,
      LIMITS.thumbQuality,
    );
    const { ctx } = canvas(32, 32);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, 32, 32);
    const dhash = differenceHash(ctx.getImageData(0, 0, 32, 32).data, 32, 32);
    return {
      sha256,
      dhash,
      width: stored.width,
      height: stored.height,
      image: stored.blob,
      thumb: thumb.blob,
    };
  } catch (error) {
    if (error instanceof ImportError) throw error;
    throw new ImportError("This browser could not process the image.");
  } finally {
    bitmap.close();
  }
}
