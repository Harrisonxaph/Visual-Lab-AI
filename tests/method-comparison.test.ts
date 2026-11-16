import { describe, expect, it } from "vitest";
import { createLesson } from "../src/learning/lessons";
import {
  initNetwork,
  networkGradients,
  trainNetwork,
} from "../src/learning/nonlinear";
import {
  prepareMethodComparison,
  runMethodComparison,
} from "../src/learning/method-comparison";
import { finalFixture } from "./fixtures/final-check";
const immediate = () => Promise.resolve();

describe("photo-feature method comparison", () => {
  it("differentiates multiclass CE plus L2 through both matrices, excluding biases", () => {
    const m = initNetwork(42, 3, 3),
      xs = [
        [0.2, -0.4, 0.7],
        [0.5, 0.3, -0.2],
      ],
      ys = [0, 2];
    const a = networkGradients(m, xs, ys, undefined, 0.2),
      zero = networkGradients(m, xs, ys);
    expect(a.hiddenBias).toEqual(zero.hiddenBias);
    expect(a.outputBias).toEqual(zero.outputBias);
    for (const key of ["input", "hiddenBias", "output", "outputBias"] as const)
      for (let i = 0; i < m[key].length; i++) {
        const old = m[key][i],
          step = 1e-5;
        m[key][i] = old + step;
        const plus = networkGradients(m, xs, ys, undefined, 0.2).loss;
        m[key][i] = old - step;
        const minus = networkGradients(m, xs, ys, undefined, 0.2).loss;
        m[key][i] = old;
        expect(Math.abs(a[key][i] - (plus - minus) / (2 * step))).toBeLessThan(
          1e-8,
        );
      }
  });
  it("freshly trains both methods deterministically on shared data without mutation", async () => {
    const { data, settings } = createLesson("learnable"),
      original = structuredClone(data);
    const a = await runMethodComparison(data, settings, {
      yieldBetweenEpochs: immediate,
      yieldBetweenBatches: immediate,
    });
    const b = await runMethodComparison(data, settings, {
      yieldBetweenEpochs: immediate,
      yieldBetweenBatches: immediate,
    });
    expect(a).toEqual(b);
    expect(a.linear.after!.accuracy).toBeGreaterThanOrEqual(0.95);
    expect(a.networkEvaluation.accuracy).toBeGreaterThanOrEqual(0.95);
    expect(a.network.evidence.count).toBe(131);
    expect(data).toEqual(original);
  });
  it("neither optimiser uses validation labels and network prediction loss excludes L2", async () => {
    const { data, settings } = createLesson("learnable");
    const options = {
      yieldBetweenEpochs: immediate,
      yieldBetweenBatches: immediate,
    };
    const a = await runMethodComparison(
      data,
      { ...settings, l2: 0.1 },
      options,
    );
    const b = await runMethodComparison(
      { ...data, validationY: data.validationY.map((y) => (y + 1) % 3) },
      { ...settings, l2: 0.1 },
      options,
    );
    expect(a.linear.model).toEqual(b.linear.model);
    expect(a.network.model).toEqual(b.network.model);
    const last = a.network.history.at(-1)!;
    const weights = [...a.network.model.input, ...a.network.model.output];
    expect(last.trainObjective).toBeCloseTo(
      last.trainLoss + 0.05 * weights.reduce((s, w) => s + w * w, 0),
      12,
    );
  });
  it("refuses incomplete sources and reuses snapshot, provenance, cap and test guards", () => {
    const f = finalFixture(),
      plan = prepareMethodComparison(f, f.model);
    expect(plan.train.map((i) => i.id)).toEqual(["ta", "tb"]);
    expect(plan.validation.map((i) => i.id)).toEqual(["va", "vb"]);
    f.model.stoppedEarly = true;
    expect(() => prepareMethodComparison(f, f.model)).toThrow(/complete/i);
    f.model.stoppedEarly = false;
    f.dataset.version++;
    expect(() => prepareMethodComparison(f, f.model)).toThrow();
  });
  it("cancels within a network batch without producing a complete comparison", async () => {
    const { data, settings } = createLesson("learnable"),
      c = new AbortController();
    let batches = 0;
    await expect(
      runMethodComparison(data, settings, {
        signal: c.signal,
        yieldBetweenEpochs: immediate,
        yieldBetweenBatches: async () => {
          if (++batches === 2) c.abort();
        },
      }),
    ).rejects.toThrow(/cancel/i);
    expect(batches).toBe(2);
  });
  it("rejects non-finite features and unsupported configurations before learning", async () => {
    const { data, settings } = createLesson("learnable");
    for (const bad of [
      { ...data, classes: 11 },
      { ...data, trainY: [9] },
      { ...data, trainX: [[NaN]] },
    ])
      await expect(trainNetwork(bad, settings)).rejects.toThrow();
  });
});
