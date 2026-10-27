import { describe, expect, it } from "vitest";
import {
  differenceHash,
  hammingDistance,
  sha256Hex,
  stableHash,
} from "../src/datasets/hash";

/** Grey gradient image with an optional brightness offset and a bright square. */
function image(
  w: number,
  h: number,
  f: (x: number, y: number) => number,
): Uint8ClampedArray {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const v = f(x, y),
        i = (y * w + x) * 4;
      px[i] = px[i + 1] = px[i + 2] = v;
      px[i + 3] = 255;
    }
  return px;
}
/** Smoothly varying "photo-like" scene: neighbouring grid cells differ clearly. */
const scene = (x: number, y: number) =>
  128 + 60 * Math.sin(x / 4.1) + 50 * Math.cos(y / 3.3 + x / 9);

describe("difference hash", () => {
  it("is identical for identical pixels and 16 hex characters long", () => {
    const a = differenceHash(image(32, 32, scene), 32, 32);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(differenceHash(image(32, 32, scene), 32, 32)).toBe(a);
  });

  it("barely changes with a uniform brightness change or slight noise", () => {
    const base = differenceHash(image(32, 32, scene), 32, 32);
    const brighter = differenceHash(
      image(32, 32, (x, y) => scene(x, y) + 20),
      32,
      32,
    );
    const noisy = differenceHash(
      image(32, 32, (x, y) => scene(x, y) + (((x * 13 + y * 29) % 5) - 2)),
      32,
      32,
    );
    expect(hammingDistance(base, brighter)).toBe(0);
    expect(hammingDistance(base, noisy)).toBeLessThanOrEqual(6);
  });

  it("is unreliable for flat images (documented limitation)", () => {
    // Equal neighbours all give 0 bits, so different flat images look alike.
    const grey = differenceHash(
      image(32, 32, () => 90),
      32,
      32,
    );
    const white = differenceHash(
      image(32, 32, () => 250),
      32,
      32,
    );
    expect(hammingDistance(grey, white)).toBe(0);
  });

  it("differs a lot for a different picture", () => {
    const a = differenceHash(
      image(32, 32, (x) => x * 8),
      32,
      32,
    );
    const b = differenceHash(
      image(32, 32, (x) => 255 - x * 8),
      32,
      32,
    );
    expect(hammingDistance(a, b)).toBeGreaterThan(20);
  });

  it("rejects malformed input", () => {
    expect(() => differenceHash(new Uint8ClampedArray(10), 32, 32)).toThrow();
    expect(() =>
      differenceHash(new Uint8ClampedArray(8 * 8 * 4), 8, 8),
    ).toThrow();
    expect(() => hammingDistance("xyz", "0000000000000000")).toThrow();
  });
});

describe("other hashes", () => {
  it("SHA-256 matches a known value", async () => {
    const bytes = new TextEncoder().encode("abc");
    expect(await sha256Hex(bytes.buffer as ArrayBuffer)).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
  it("stable hash is deterministic and spreads values", () => {
    expect(stableHash("seed:a")).toBe(stableHash("seed:a"));
    expect(stableHash("seed:a")).not.toBe(stableHash("seed:b"));
    expect(hammingDistance("ffffffffffffffff", "0000000000000000")).toBe(64);
  });
});
