import { describe, expect, it } from "vitest";
import {
  chooseBatch,
  runAcquisitionExperiment,
} from "../src/learning/acquisition";
import { initModel } from "../src/learning/softmax";
const samples = () =>
  Array.from({ length: 24 }, (_, i) => ({
    id: `n${i}`,
    label: i % 2,
    sha256: `s${i}`,
    dhash: ((BigInt(i + 1) * 0x9e3779b97f4a7c15n) & 0xffffffffffffffffn)
      .toString(16)
      .padStart(16, "0"),
    x: new Float32Array([i % 2 ? -1 : 1, (i / 24) * 0.1]),
  }));
describe("matched-budget acquisition", () => {
  it("selects without pool truth and uses deterministic random order", () => {
    const pool = samples(),
      model = initModel(2, 2, 42);
    const first = chooseBatch(pool, model, 4, 42);
    const altered = chooseBatch(
      pool.map((s) => ({ ...s, label: 1 - s.label })),
      model,
      4,
      42,
    );
    expect(first).toEqual(altered);
    expect(first.uncertainty).toHaveLength(4);
    expect(new Set(first.random).size).toBe(4);
    expect(() => chooseBatch(pool, model, 40, 42)).toThrow();
    model.weights.set([2, 0, -2, 0]);
    model.bias.fill(0);
    expect(
      chooseBatch(
        [...pool, { id: "ambiguous", x: new Float32Array([0, 1]) }],
        model,
        1,
        42,
      ).uncertainty,
    ).toEqual(["ambiguous"]);
  });
  it("trains both arms on equal label budgets and one shared disjoint validation cohort", async () => {
    const result = await runAcquisitionExperiment(samples(), 2, {
      yieldBetweenEpochs: async () => {},
    });
    expect(result.uncertainty.selected).toHaveLength(4);
    expect(result.random.selected).toHaveLength(4);
    const heldout = new Set(result.validation.map((r) => r.id));
    expect(
      [
        ...result.initial,
        ...result.uncertainty.selected,
        ...result.random.selected,
      ].some((id) => heldout.has(id)),
    ).toBe(false);
    expect(result.uncertainty.meanParameterChange).toBeGreaterThan(0);
    expect(result.random.meanParameterChange).toBeGreaterThan(0);
    expect(result.uncertainty.accuracy).toBeGreaterThanOrEqual(0);
    expect(result.random.accuracy).toBeLessThanOrEqual(1);
    expect(
      await runAcquisitionExperiment(samples(), 2, {
        yieldBetweenEpochs: async () => {},
      }),
    ).toEqual(result);
  });
  it("rejects damaged features and stops a cancelled run without a completed report", async () => {
    const input = samples();
    input[0].x[0] = NaN;
    await expect(runAcquisitionExperiment(input, 2)).rejects.toThrow();
    const abort = new AbortController();
    abort.abort();
    await expect(
      runAcquisitionExperiment(samples(), 2, { signal: abort.signal }),
    ).rejects.toThrow(/cancel/i);
  });
  it("identical acquired sets give identical fitted results, regardless of acquisition order", async () => {
    const result = await runAcquisitionExperiment(
      Array.from({ length: 40 }, (_, i) => ({
        id: `all-${i}`,
        label: i % 5,
        sha256: `all-sha-${i}`,
        dhash: ((BigInt(i + 1) * 0x9e3779b97f4a7c15n) & 0xffffffffffffffffn)
          .toString(16)
          .padStart(16, "0"),
        x: Float32Array.from({ length: 5 }, (_, j) => (j === i % 5 ? 1 : 0)),
      })),
      5,
      {
        yieldBetweenEpochs: async () => {},
      },
    );
    expect([...result.uncertainty.selected].sort()).toEqual(
      [...result.random.selected].sort(),
    );
    expect(result.uncertainty.trainingOrder).toEqual(
      result.random.trainingOrder,
    );
    expect(result.uncertainty.loss).toBe(result.random.loss);
    expect(result.uncertainty.meanParameterChange).toBe(
      result.random.meanParameterChange,
    );
  });
});
