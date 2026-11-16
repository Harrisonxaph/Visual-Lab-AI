import { describe, expect, it } from "vitest";
import type { ModelRecord } from "../src/learning/types";
import { serializeRunReport } from "../src/learning/run-report";

const model = (): ModelRecord => ({
  id: "run-id",
  datasetId: "dataset-id",
  datasetVersion: 3,
  name: "Private model name",
  createdAt: "2026-11-16T00:00:00.000Z",
  encoderKey: "encoder/runtime/preprocessing",
  dims: 2,
  labelIds: ["a", "b"],
  labelNames: ["Private class", "<script>alert(1)</script>"],
  weights: new Float64Array([1, 2, 3, 4]),
  bias: new Float64Array([1, 2]),
  settings: {
    learningRate: 0.5,
    epochs: 2,
    batchSize: 16,
    perLabelCap: null,
    seed: 42,
  },
  history: [0, 1, 2].map((epoch) => ({
    epoch,
    trainLoss: 1 - epoch * 0.2,
    trainAccuracy: epoch * 0.5,
    validationLoss: 1 - epoch * 0.1,
    validationAccuracy: epoch * 0.25,
  })),
  stoppedEarly: false,
  trainCount: 2,
  validationCount: 1,
  trainImages: [
    {
      id: "secret-provenance",
      sha256: "secret-extra-hash",
      dhash: "secret-perceptual-hash",
    },
  ],
  experiment: {
    version: 1,
    algorithm: "softmax-sgd-f64/v1",
    splitSeed: 7,
    labelIds: ["a", "b"],
    train: [
      { id: "t1", sha256: "file-hash-1", labelId: "a" },
      { id: "t2", sha256: "file-hash-2", labelId: "b" },
    ],
    validation: [{ id: "v1", sha256: "file-hash-3", labelId: "a" }],
  },
});

describe("local recorded run reports", () => {
  it("exports an explicit allowlist with names omitted by default", () => {
    const m = model();
    Object.assign(m, { photos: "secret-photo", unexpected: "secret-field" });
    Object.assign(m.settings, { secret: "secret-setting" });
    Object.assign(m.experiment!.train[0], { secret: "secret-reference" });
    Object.assign(m.history[0], { secret: "secret-metric" });
    const text = serializeRunReport(m);
    const report = JSON.parse(text);
    expect(report.schema).toBe("visual-labs.run-report/v1");
    expect(report.classes).toEqual([{ id: "a" }, { id: "b" }]);
    expect(text).not.toMatch(/Private|<script>|secret|weights|bias/);
    expect(report.manifest.train).toEqual(
      m.experiment!.train.map(({ id, sha256, labelId }) => ({
        id,
        sha256,
        labelId,
      })),
    );
    expect(report.settings).toEqual({
      learningRate: 0.5,
      epochs: 2,
      batchSize: 16,
      perLabelCap: null,
      seed: 42,
    });
    expect(report.history).toHaveLength(3);
    expect(report.testResultsIncluded).toBe(false);
  });
  it("includes literal class names only after explicit opt-in", () => {
    expect(JSON.parse(serializeRunReport(model(), true)).classes).toEqual([
      { id: "a", name: "Private class" },
      { id: "b", name: "<script>alert(1)</script>" },
    ]);
  });
  it("preserves planned versus completed epochs and early stopping", () => {
    const m = model();
    m.history.pop();
    m.stoppedEarly = true;
    const report = JSON.parse(serializeRunReport(m));
    expect(report.settings.epochs).toBe(2);
    expect(report.completedEpochs).toBe(1);
    expect(report.stoppedEarly).toBe(true);
    expect(report.dataset).toEqual({ id: "dataset-id", version: 3 });
  });
  it("keeps missing validation measurements null, not zero", () => {
    const m = model();
    m.validationCount = 0;
    m.experiment!.validation = [];
    for (const row of m.history)
      row.validationLoss = row.validationAccuracy = null;
    const report = JSON.parse(serializeRunReport(m));
    expect(report.history[2].validationAccuracy).toBeNull();
    expect(report.validationCount).toBe(0);
  });
  it("labels legacy records without manifests as unavailable for exact replay", () => {
    const m = model();
    delete m.experiment;
    const report = JSON.parse(serializeRunReport(m));
    expect(report.manifest).toBeNull();
    expect(report.replayMetadata).toBe("unavailable");
  });
  it("rejects invalid metrics or settings rather than JSON coercing them to null", () => {
    for (const mutate of [
      (m: ModelRecord) => {
        m.history[1].trainLoss = NaN;
      },
      (m: ModelRecord) => {
        m.history[2].validationAccuracy = Infinity;
      },
      (m: ModelRecord) => {
        m.history[1].trainAccuracy = 1.1;
      },
      (m: ModelRecord) => {
        m.history[1].epoch = 0;
      },
      (m: ModelRecord) => {
        m.settings.seed = NaN;
      },
      (m: ModelRecord) => {
        m.settings.learningRate = Infinity;
      },
    ]) {
      const m = model();
      mutate(m);
      expect(() => serializeRunReport(m)).toThrow(/cannot export/i);
    }
  });
  it("rejects inconsistent provenance and counts", () => {
    for (const mutate of [
      (m: ModelRecord) => {
        m.experiment!.train.pop();
      },
      (m: ModelRecord) => {
        m.experiment!.labelIds.reverse();
      },
      (m: ModelRecord) => {
        m.experiment!.validation[0].labelId = "missing";
      },
      (m: ModelRecord) => {
        m.experiment!.validation[0].id = "t1";
      },
      (m: ModelRecord) => {
        m.experiment!.algorithm = "unknown" as never;
      },
    ]) {
      const m = model();
      mutate(m);
      expect(() => serializeRunReport(m)).toThrow(/cannot export/i);
    }
  });
});

describe("L2 report fields", () => {
  it("records strength, algorithm and objective while retaining prediction losses", () => {
    const m = model();
    m.settings.l2 = 0.2;
    m.experiment!.algorithm = "softmax-sgd-f64-l2/v1";
    for (const row of m.history) row.trainObjective = row.trainLoss + 3;
    const report = JSON.parse(serializeRunReport(m));
    expect(report.settings.l2).toBe(0.2);
    expect(report.manifest.algorithm).toBe("softmax-sgd-f64-l2/v1");
    expect(report.history[2].trainLoss).toBe(m.history[2].trainLoss);
    expect(report.history[2].trainObjective).toBe(m.history[2].trainObjective);
    expect(report.history[2].validationLoss).toBe(m.history[2].validationLoss);
  });
  it("refuses misleading regularised metadata rather than omitting its objective", () => {
    const m = model();
    m.settings.l2 = 0.2;
    expect(() => serializeRunReport(m)).toThrow(/cannot export/i);
    m.experiment!.algorithm = "softmax-sgd-f64-l2/v1";
    expect(() => serializeRunReport(m)).toThrow(/cannot export/i);
    for (const row of m.history) row.trainObjective = row.trainLoss + 3;
    m.history[1].trainObjective = NaN;
    expect(() => serializeRunReport(m)).toThrow(/cannot export/i);
  });
});
