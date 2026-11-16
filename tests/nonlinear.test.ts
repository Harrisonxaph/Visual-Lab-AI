import { describe, expect, it } from "vitest";
import { createLesson, runCapacityComparison } from "../src/learning/lessons";
import {
  initNetwork,
  networkGradients,
  trainNetwork,
} from "../src/learning/nonlinear";

const pause = () => Promise.resolve();
describe("tiny nonlinear numeric learner", () => {
  it("backpropagates mean cross-entropy through both layers and biases", () => {
    const model = initNetwork(42);
    const xs = [
        [0.4, -0.7],
        [-0.2, 0.5],
        [0.8, 0.1],
      ],
      ys = [0, 1, 1];
    const gradient = networkGradients(model, xs, ys);
    for (const key of ["input", "hiddenBias", "output", "outputBias"] as const)
      for (let i = 0; i < model[key].length; i++) {
        const original = model[key][i],
          step = 1e-5;
        model[key][i] = original + step;
        const plus = networkGradients(model, xs, ys).loss;
        model[key][i] = original - step;
        const minus = networkGradients(model, xs, ys).loss;
        model[key][i] = original;
        expect(
          Math.abs(gradient[key][i] - (plus - minus) / (2 * step)),
        ).toBeLessThan(1e-8);
      }
  });
  it("uses stable score-based loss for extremely wrong predictions", () => {
    const model = initNetwork(42);
    model.output.fill(0);
    model.outputBias.set([1000, -1000]);
    expect(networkGradients(model, [[1, 0]], [1]).loss).toBe(2000);
  });
  it("learns the same nonlinear task that the linear classifier underfits", async () => {
    const result = await runCapacityComparison({ yieldBetweenEpochs: pause });
    expect(result.complete).toBe(true);
    const linear = result.linear.history.at(-1)!,
      network = result.network!.history.at(-1)!;
    expect(linear.validationAccuracy).toBeLessThan(0.8);
    expect(network.validationAccuracy).toBeGreaterThanOrEqual(0.95);
    expect(network.validationLoss).toBeLessThan(
      result.network!.history[0].validationLoss! * 0.2,
    );
    expect(result.network!.evidence.count).toBe(42);
    expect(result.network!.evidence.inputMeanAbsChange).toBeGreaterThan(0);
    expect(result.network!.evidence.outputMeanAbsChange).toBeGreaterThan(0);
  });
  it("is seeded, leaves inputs intact and never learns validation labels", async () => {
    const { data, settings } = createLesson("underfitting"),
      copy = structuredClone(data);
    const a = await trainNetwork(data, settings, { yieldBetweenEpochs: pause });
    const b = await trainNetwork(data, settings, { yieldBetweenEpochs: pause });
    const c = await trainNetwork(
      { ...data, validationY: data.validationY.map((y) => 1 - y) },
      settings,
      { yieldBetweenEpochs: pause },
    );
    expect(a).toEqual(b);
    expect(a.model).toEqual(c.model);
    expect(data).toEqual(copy);
    expect(a.initial).toEqual(initNetwork(settings.seed));
  });
  it.each(["linear", "network"] as const)(
    "cancels during %s without publishing a complete comparison",
    async (method) => {
      const controller = new AbortController();
      const result = await runCapacityComparison({
        signal: controller.signal,
        yieldBetweenEpochs: pause,
        onEpoch: (which, row) => {
          if (which === method && row.epoch === 2) controller.abort();
        },
      });
      expect(result.complete).toBe(false);
      if (method === "linear") expect(result.network).toBeNull();
      else expect(result.network!.history.at(-1)!.epoch).toBe(2);
    },
  );
});
