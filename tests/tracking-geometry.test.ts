import { expect, test } from "vitest";
import {
  normalizeDetections,
  intersectionOverUnion,
  containedVideoRect,
  hitTestTracks,
} from "../src/tracking/geometry";
const d = {
  label: "cup",
  score: 0.8,
  box: { x: 10, y: 5, width: 20, height: 10 },
};
test("normalizes valid clipped boxes, preserves source indexes and rejects invalid data", () => {
  expect(normalizeDetections([d], 100, 50, 0.05)[0].box).toEqual({
    x: 0.1,
    y: 0.1,
    width: 0.2,
    height: 0.2,
  });
  expect(
    normalizeDetections(
      [{ ...d, box: { x: -10, y: 0, width: 30, height: 20 } }],
      100,
      50,
      0.05,
    )[0].box.width,
  ).toBe(0.2);
  for (const score of [0.049, 1.1, NaN, Infinity])
    expect(normalizeDetections([{ ...d, score }], 100, 50, 0.05)).toEqual([]);
  for (const width of [0, NaN, Infinity, -1])
    expect(normalizeDetections([d], width, 50, 0.05)).toEqual([]);
  expect(
    normalizeDetections(
      [{ ...d, box: { ...d.box, width: 0 } }, d],
      100,
      50,
      0.05,
    )[0].sourceIndex,
  ).toBe(1);
  expect(intersectionOverUnion(d.box, d.box)).toBe(1);
  expect(intersectionOverUnion(d.box, { ...d.box, x: 100 })).toBe(0);
});
test("contain mapping excludes letterboxes and nested hits choose smallest then birth order", () => {
  const rect = containedVideoRect(
    { x: 10, y: 20, width: 200, height: 200 },
    100,
    50,
  );
  expect(rect).toEqual({ x: 10, y: 70, width: 200, height: 100 });
  const tracks = [
    { id: 1, birthOrder: 1, box: { x: 0, y: 0, width: 1, height: 1 } },
    { id: 3, birthOrder: 3, box: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 } },
    { id: 2, birthOrder: 2, box: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 } },
  ];
  expect(hitTestTracks({ x: 50, y: 30 }, rect, tracks)).toBeNull();
  expect(hitTestTracks({ x: 50, y: 90 }, rect, tracks)).toBe(2);
  for (const scale of [1, 2, 3]) {
    const r = containedVideoRect(
      { x: 0, y: 0, width: 100 * scale, height: 200 * scale },
      100,
      200,
    );
    expect(hitTestTracks({ x: 20 * scale, y: 40 * scale }, r, tracks)).toBe(2);
  }
});
