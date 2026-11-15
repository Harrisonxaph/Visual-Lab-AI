import { describe, expect, it } from "vitest";
import { classificationMetrics } from "../src/learning/metrics";

describe("classification metrics", () => {
  it("uses actual rows and predicted columns with exact counts", () => {
    const m = classificationMetrics([0, 0, 0, 1, 1, 2], [0, 0, 1, 1, 2, 0], 3);
    expect(m.confusion).toEqual([
      [2, 1, 0],
      [0, 1, 1],
      [1, 0, 0],
    ]);
    expect(m.total).toBe(6);
    expect(m.correct).toBe(3);
    expect(m.accuracy).toBe(0.5);
    expect(m.perClass[0]).toEqual({
      support: 3,
      predicted: 3,
      truePositive: 2,
      falsePositive: 1,
      falseNegative: 1,
      precision: 2 / 3,
      recall: 2 / 3,
    });
    expect(m.perClass[1].precision).toBe(0.5);
    expect(m.perClass[1].recall).toBe(0.5);
    expect(m.perClass[2].precision).toBe(0);
    expect(m.perClass[2].recall).toBe(0);
  });

  it("distinguishes undefined precision from measured zero recall", () => {
    const m = classificationMetrics([0, 1], [0, 0], 3);
    expect(m.perClass[1].precision).toBeNull();
    expect(m.perClass[1].recall).toBe(0);
    expect(m.perClass[2].precision).toBeNull();
    expect(m.perClass[2].recall).toBeNull();
  });

  it("distinguishes measured zero precision from undefined recall", () => {
    const m = classificationMetrics([0, 0], [1, 1], 2);
    expect(m.accuracy).toBe(0);
    expect(m.perClass[1].precision).toBe(0);
    expect(m.perClass[1].recall).toBeNull();
  });

  it("reports no measurement for an empty selection", () => {
    const m = classificationMetrics([], [], 2);
    expect(m.total).toBe(0);
    expect(m.correct).toBe(0);
    expect(m.accuracy).toBeNull();
    expect(m.confusion).toEqual([
      [0, 0],
      [0, 0],
    ]);
    expect(m.perClass.every((c) => c.precision === null)).toBe(true);
    expect(m.perClass.every((c) => c.recall === null)).toBe(true);
  });

  it("reports perfect predictions without changing the inputs", () => {
    const truth = Object.freeze([0, 1, 1, 0]);
    const predicted = Object.freeze([0, 1, 1, 0]);
    const m = classificationMetrics(truth, predicted, 2);
    expect(m.accuracy).toBe(1);
    expect(m.perClass.every((c) => c.precision === 1 && c.recall === 1)).toBe(
      true,
    );
    expect(truth).toEqual([0, 1, 1, 0]);
  });

  it("rejects mismatched lengths instead of producing misleading metrics", () => {
    expect(() => classificationMetrics([0], [], 2)).toThrow(/same length/);
  });

  it("rejects invalid class counts", () => {
    for (const count of [0, -1, 1.5, NaN, Infinity])
      expect(() => classificationMetrics([], [], count)).toThrow(/class count/);
  });

  it("rejects invalid truth and prediction indices", () => {
    for (const index of [-1, 2, 0.5, NaN, Infinity]) {
      expect(() => classificationMetrics([index], [0], 2)).toThrow(/index/);
      expect(() => classificationMetrics([0], [index], 2)).toThrow(/index/);
    }
  });

  it("preserves count identities on seeded multiclass examples", () => {
    let seed = 7;
    const next = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed;
    };
    const truth = Array.from({ length: 101 }, () => next() % 5);
    const predicted = truth.map(() => next() % 5);
    const m = classificationMetrics(truth, predicted, 5);
    expect(m.confusion.flat().reduce((a, b) => a + b, 0)).toBe(truth.length);
    expect(m.perClass.reduce((n, c) => n + c.support, 0)).toBe(truth.length);
    expect(m.perClass.reduce((n, c) => n + c.predicted, 0)).toBe(truth.length);
    expect(m.correct).toBe(truth.filter((v, i) => v === predicted[i]).length);
    m.perClass.forEach((c, k) => {
      expect(c.support).toBe(m.confusion[k].reduce((a, b) => a + b, 0));
      expect(c.predicted).toBe(m.confusion.reduce((n, row) => n + row[k], 0));
    });
  });
});
