import { expect, test } from "vitest";
import { minimumCostAssignment } from "../src/tracking/assignment";
test("globally minimizes competing rows with explicit unmatched choices", () => {
  expect(
    minimumCostAssignment(
      [
        [0.1, 0.2],
        [0.11, Infinity],
      ],
      1.1,
    ),
  ).toEqual([1, 0]);
  expect(minimumCostAssignment([], 1.1)).toEqual([]);
  expect(minimumCostAssignment([[], []], 1.1)).toEqual([null, null]);
  expect(minimumCostAssignment([[Infinity], [Infinity]], 1.1)).toEqual([
    null,
    null,
  ]);
  expect(minimumCostAssignment([[0.1], [0.2]], 1.1)).toEqual([0, null]);
  expect(
    minimumCostAssignment(
      [
        [0.1, 0.1],
        [0.1, 0.1],
      ],
      1.1,
    ),
  ).toEqual([0, 1]);
  expect(minimumCostAssignment([[2]], 1.1)).toEqual([null]);
});
test("matches brute-force costs for bounded rectangular samples", () => {
  let seed = 3;
  const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  for (let n = 1; n <= 4; n++)
    for (let m = 0; m <= 4; m++)
      for (let trial = 0; trial < 20; trial++) {
        const c = Array.from({ length: n }, () =>
          Array.from({ length: m }, () =>
            rand() < 0.2 ? Infinity : rand() * 1.5,
          ),
        );
        const enumerate = (i: number, used: Set<number>): number =>
          i === n
            ? 0
            : Math.min(
                1.1 + enumerate(i + 1, used),
                ...c[i].map((x, j) =>
                  used.has(j)
                    ? Infinity
                    : x + enumerate(i + 1, new Set([...used, j])),
                ),
              );
        const a = minimumCostAssignment(c, 1.1);
        expect(
          a.reduce<number>((s, j, i) => s + (j === null ? 1.1 : c[i][j]), 0),
        ).toBeCloseTo(enumerate(0, new Set()));
        expect(new Set(a.filter((x) => x !== null)).size).toBe(
          a.filter((x) => x !== null).length,
        );
      }
});
