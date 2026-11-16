import { describe, expect, it } from "vitest";
import { createLesson, LESSON_IDS, runLesson } from "../src/learning/lessons";

const noYield = () => Promise.resolve();

describe("controlled numeric learning lessons", () => {
  it("generates repeatable independent arrays within bounded work limits", () => {
    for (const id of LESSON_IDS) {
      const a = createLesson(id),
        b = createLesson(id);
      expect(a.data).toEqual(b.data);
      expect(a.data.trainX[0]).not.toBe(b.data.trainX[0]);
      expect(a.data.trainX.some((x) => a.data.validationX.includes(x))).toBe(
        false,
      );
      expect(a.data.dims).toBeLessThanOrEqual(48);
      expect(
        a.data.trainX.length + a.data.validationX.length,
      ).toBeLessThanOrEqual(150);
      expect(a.settings.epochs).toBeLessThanOrEqual(150);
      expect(a.settings.learningRate).toBeGreaterThanOrEqual(0.01);
      expect(a.settings.learningRate).toBeLessThanOrEqual(2);
    }
  });

  it("learns a genuine relationship that generalises to separate numeric examples", async () => {
    const { run } = await runLesson("learnable", {
      yieldBetweenEpochs: noYield,
    });
    const first = run.history[0],
      last = run.history.at(-1)!;
    expect(last.trainAccuracy).toBeGreaterThanOrEqual(0.95);
    expect(last.validationAccuracy).toBeGreaterThanOrEqual(0.95);
    expect(last.trainLoss).toBeLessThan(first.trainLoss * 0.5);
    expect(last.validationLoss).toBeLessThan(first.validationLoss! * 0.5);
    expect(run.evidence.meanAbsChange).toBeGreaterThan(0);
  });

  it("memorises random labels without implying useful validation predictions", async () => {
    const { run } = await runLesson("overfitting", {
      yieldBetweenEpochs: noYield,
    });
    const first = run.history[0],
      last = run.history.at(-1)!;
    expect(last.trainAccuracy).toBeGreaterThanOrEqual(0.95);
    expect(last.validationAccuracy).toBeLessThan(0.6);
    expect(last.trainLoss).toBeLessThan(first.trainLoss * 0.3);
    expect(last.validationLoss).toBeGreaterThan(first.validationLoss!);
  });

  it("shows capacity-limited underfitting on a nonlinear rule", async () => {
    const { run } = await runLesson("underfitting", {
      yieldBetweenEpochs: noYield,
    });
    const last = run.history.at(-1)!;
    expect(last.trainAccuracy).toBeLessThan(0.8);
    expect(last.validationAccuracy).toBeLessThan(0.8);
    expect(last.trainLoss).toBeGreaterThan(0.4);
    expect(run.evidence.meanAbsChange).toBeGreaterThan(0);
  });

  it("cancels after completed epochs and labels the result partial", async () => {
    const c = new AbortController();
    const { run } = await runLesson("overfitting", {
      signal: c.signal,
      yieldBetweenEpochs: noYield,
      onEpoch: (row) => {
        if (row.epoch === 3) c.abort();
      },
    });
    expect(run.stoppedEarly).toBe(true);
    expect(run.history.at(-1)!.epoch).toBe(3);
  });

  it("rejects unknown scenarios instead of silently running a different lesson", () => {
    expect(() => createLesson("other" as never)).toThrow(/lesson/i);
  });
});
