/** Hex SHA-256 of bytes, using the browser's built-in crypto. */
export async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

/**
 * Difference hash ("dHash"): shrink the image to 9×8 grey pixels and record, for each row,
 * whether each pixel is brighter than its right-hand neighbour. 64 yes/no answers make a
 * 64-bit fingerprint. Resizing, re-saving or small colour changes barely alter it; a different
 * picture usually changes many bits. It cannot recognise crops, rotations or new viewpoints.
 *
 * `rgba` is a width×height RGBA pixel array (e.g. from a small canvas).
 */
export function differenceHash(
  rgba: ArrayLike<number>,
  width: number,
  height: number,
): string {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 9 ||
    height < 8 ||
    rgba.length !== width * height * 4
  )
    throw new Error("Invalid pixel data for difference hash");
  // Area-average grey values into a 9×8 grid.
  const grid = new Float64Array(72);
  for (let gy = 0; gy < 8; gy++)
    for (let gx = 0; gx < 9; gx++) {
      const x0 = Math.floor((gx * width) / 9),
        x1 = Math.max(x0 + 1, Math.floor(((gx + 1) * width) / 9)),
        y0 = Math.floor((gy * height) / 8),
        y1 = Math.max(y0 + 1, Math.floor(((gy + 1) * height) / 8));
      let sum = 0,
        n = 0;
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) {
          const i = (y * width + x) * 4;
          sum += 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
          n++;
        }
      grid[gy * 9 + gx] = sum / n;
    }
  let hex = "";
  for (let gy = 0; gy < 8; gy++) {
    let byte = 0;
    for (let gx = 0; gx < 8; gx++)
      byte = (byte << 1) | (grid[gy * 9 + gx] > grid[gy * 9 + gx + 1] ? 1 : 0);
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}

/** Number of differing bits between two 16-hex-character difference hashes. */
export function hammingDistance(a: string, b: string): number {
  if (!/^[0-9a-f]{16}$/.test(a) || !/^[0-9a-f]{16}$/.test(b))
    throw new Error("Invalid difference hash");
  let d = 0;
  for (let i = 0; i < 16; i += 2) {
    let x = parseInt(a.slice(i, i + 2), 16) ^ parseInt(b.slice(i, i + 2), 16);
    while (x) {
      d += x & 1;
      x >>= 1;
    }
  }
  return d;
}

/** Small deterministic 32-bit hash of a string (FNV-1a), for repeatable tie-breaking. */
export function stableHash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
