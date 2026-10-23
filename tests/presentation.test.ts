import { it, expect } from "vitest";
import { formatScore, visibleDetections } from "../src/detections";
it("never presents a detector score as certainty", () => {
  expect(formatScore(0.995)).toBe("99%");
  expect(formatScore(1)).toBe("99%");
  expect(formatScore(0.764)).toBe("76%");
});
it("counts only drawable boxes and clips partially visible results", () => {
  const detected = (x: number, width: number, score = 0.8) => ({
    label: "cup",
    score,
    box: { x, y: 10, width, height: 20 },
  });
  const result = visibleDetections(
    [
      detected(-10, 30),
      detected(120, 10),
      detected(10, -5),
      detected(10, 10, 0.4),
    ],
    0.5,
    100,
    80,
  );
  expect(result).toEqual([
    { label: "cup", score: 0.8, box: { x: 0, y: 10, width: 20, height: 20 } },
  ]);
});
