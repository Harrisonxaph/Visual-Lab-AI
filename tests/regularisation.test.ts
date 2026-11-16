import { describe, expect, it } from "vitest";
import { seededRandom } from "../src/datasets/example";
import {
  evaluate,
  initModel,
  lossAndGradients,
  trainEpoch,
} from "../src/learning/softmax";
import { runTraining, validateSettings } from "../src/learning/trainer";
import type { TrainingSettings } from "../src/learning/types";

const data = {
  classes: 2,
  dims: 2,
  trainX: [
    [1, 0],
    [0.8, 0.2],
    [0, 1],
    [0.2, 0.8],
  ],
  trainY: [0, 0, 1, 1],
  validationX: [
    [0.9, 0.1],
    [0.1, 0.9],
  ],
  validationY: [0, 1],
};
const settings: TrainingSettings = {
  learningRate: 0.5,
  epochs: 3,
  batchSize: 2,
  perLabelCap: null,
  seed: 42,
};
const immediate = () => Promise.resolve();

describe("L2 weight regularisation", () => {
  it("has the exact finite-difference gradient of mean CE plus lambda/2 sum(W squared)", () => {
    const m = initModel(2, 2, 42),
      l2 = 0.3;
    const analytic = lossAndGradients(
      m,
      data.trainX,
      data.trainY,
      undefined,
      l2,
    );
    for (const key of ["weights", "bias"] as const)
      for (let i = 0; i < m[key].length; i++) {
        const original = m[key][i],
          step = 1e-5;
        m[key][i] = original + step;
        const plus = lossAndGradients(
          m,
          data.trainX,
          data.trainY,
          undefined,
          l2,
        ).loss;
        m[key][i] = original - step;
        const minus = lossAndGradients(
          m,
          data.trainX,
          data.trainY,
          undefined,
          l2,
        ).loss;
        m[key][i] = original;
        expect(
          Math.abs(analytic[key][i] - (plus - minus) / (2 * step)),
        ).toBeLessThan(1e-8);
      }
  });
  it("adds lambda W once to the mean gradient and never penalises biases", () => {
    const m = initModel(2, 2, 42);
    const zero = lossAndGradients(m, data.trainX, data.trainY);
    const regular = lossAndGradients(
      m,
      data.trainX,
      data.trainY,
      undefined,
      0.2,
    );
    expect(regular.loss - zero.loss).toBeCloseTo(
      0.1 * [...m.weights].reduce((sum, w) => sum + w * w, 0),
      14,
    );
    m.weights.forEach((w, i) =>
      expect(regular.weights[i] - zero.weights[i]).toBeCloseTo(0.2 * w, 14),
    );
    expect(regular.bias).toEqual(zero.bias);
  });
  it("shrinks weights by the expected amount when features supply no weight gradient", () => {
    const a = {
      classes: 2,
      dims: 2,
      weights: new Float64Array([1, 2, 3, 4]),
      bias: new Float64Array([0.7, -0.3]),
    };
    const b = structuredClone(a);
    trainEpoch(
      a,
      [
        [0, 0],
        [0, 0],
      ],
      [0, 1],
      0.1,
      2,
      seededRandom(9),
    );
    trainEpoch(
      b,
      [
        [0, 0],
        [0, 0],
      ],
      [0, 1],
      0.1,
      2,
      seededRandom(9),
      0.2,
    );
    expect([...a.weights]).toEqual([1, 2, 3, 4]);
    b.weights.forEach((w, i) => expect(w).toBeCloseTo(a.weights[i] * 0.98, 14));
    expect(b.bias).toEqual(a.bias);
  });
  it("preserves legacy missing/zero behaviour and the pre-change numerical fixture", async () => {
    const a = await runTraining(data, settings, {
      yieldBetweenEpochs: immediate,
    });
    const b = await runTraining(
      data,
      { ...settings, l2: 0 },
      { yieldBetweenEpochs: immediate },
    );
    expect(a.model).toEqual(b.model);
    expect(a.history).toEqual(b.history);
    const expected = [
      0.4724624061696122, -0.49638784105675265, -0.5004403003112897,
      0.48224875929838623,
    ];
    a.model.weights.forEach((w, i) => expect(w).toBeCloseTo(expected[i], 14));
    expect(a.history.at(-1)!.trainLoss).toBeCloseTo(0.3813230955824317, 14);
    expect(a.history.at(-1)).not.toHaveProperty("trainObjective");
  });
  it("keeps prediction CE separate from the penalised training objective", async () => {
    const run = await runTraining(
      data,
      { ...settings, l2: 0.2 },
      { yieldBetweenEpochs: immediate },
    );
    const last = run.history.at(-1)!;
    const prediction = evaluate(run.model, data.trainX, data.trainY);
    const penalty = 0.1 * [...run.model.weights].reduce((s, w) => s + w * w, 0);
    expect(last.trainLoss).toBe(prediction.loss);
    expect(last.trainObjective).toBeCloseTo(prediction.loss + penalty, 14);
    expect(last.validationLoss).toBe(
      evaluate(run.model, data.validationX, data.validationY).loss,
    );
  });
  it("never uses validation labels in regularised optimisation", async () => {
    const a = await runTraining(
      data,
      { ...settings, l2: 0.2 },
      { yieldBetweenEpochs: immediate },
    );
    const b = await runTraining(
      { ...data, validationY: [1, 0] },
      { ...settings, l2: 0.2 },
      { yieldBetweenEpochs: immediate },
    );
    expect(a.model).toEqual(b.model);
    expect(a.history.map((r) => r.trainObjective)).toEqual(
      b.history.map((r) => r.trainObjective),
    );
  });
  it("validates strength and reports stable CE even when probabilities underflow", async () => {
    for (const l2 of [-1, NaN, Infinity, 1.01, null as unknown as number]) {
      expect(validateSettings({ ...settings, l2 }).join(" ")).toMatch(/L2/i);
      await expect(
        runTraining(
          data,
          { ...settings, l2 },
          { yieldBetweenEpochs: immediate },
        ),
      ).rejects.toThrow(/L2/i);
    }
    const m = {
      classes: 2,
      dims: 2,
      weights: new Float64Array([1000, 0, -1000, 0]),
      bias: new Float64Array(2),
    };
    expect(lossAndGradients(m, [[1, 0]], [1]).loss).toBeCloseTo(2000, 10);
  });
  it("cancellation keeps only completed epochs and their actual objective", async () => {
    const controller = new AbortController();
    const run = await runTraining(
      data,
      { ...settings, epochs: 10, l2: 0.2 },
      {
        signal: controller.signal,
        yieldBetweenEpochs: immediate,
        onEpoch: (row) => {
          if (row.epoch === 2) controller.abort();
        },
      },
    );
    expect(run.stoppedEarly).toBe(true);
    expect(run.history.at(-1)!.epoch).toBe(2);
    expect(run.history.every((r) => Number.isFinite(r.trainObjective))).toBe(
      true,
    );
  });
});
