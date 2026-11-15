import { describe, expect, it } from "vitest";
import type { ImageRecord } from "../src/datasets/types";
import type { ExampleSelection } from "../src/learning/examples";
import {
  compareRecordedRuns,
  createRunManifest,
  replayProblem,
  repeatSettings,
  validateSeed,
} from "../src/learning/experiments";
import type { ModelRecord } from "../src/learning/types";

const image = (id: string, labelId: string, split: "train" | "validation") =>
  ({ id, labelId, split, sha256: `hash-${id}` }) as ImageRecord;
const selection = (): ExampleSelection => ({
  classes: [
    { id: "a", name: "a" },
    { id: "b", name: "b" },
  ],
  train: [image("t1", "a", "train"), image("t2", "b", "train")],
  trainLabels: [0, 1],
  validation: [image("v1", "a", "validation"), image("v2", "b", "validation")],
  validationLabels: [0, 1],
  problems: [],
});
const model = (): ModelRecord => ({
  id: "m1",
  datasetId: "d",
  datasetVersion: 4,
  name: "Model",
  createdAt: "",
  encoderKey: "encoder-v1",
  dims: 2,
  labelIds: ["a", "b"],
  labelNames: ["a", "b"],
  weights: new Float64Array(4),
  bias: new Float64Array(2),
  settings: {
    learningRate: 0.5,
    epochs: 2,
    batchSize: 16,
    perLabelCap: null,
    seed: 42,
  },
  history: [
    {
      epoch: 2,
      trainLoss: 0.4,
      trainAccuracy: 1,
      validationLoss: 0.5,
      validationAccuracy: 0.5,
    },
  ],
  stoppedEarly: false,
  trainCount: 2,
  validationCount: 2,
  experiment: createRunManifest(7, selection()),
});

describe("recorded run reproducibility", () => {
  it("accepts the full unsigned 32-bit seed range and rejects ambiguous values", () => {
    expect(validateSeed(0)).toBeNull();
    expect(validateSeed(4294967295)).toBeNull();
    for (const seed of [NaN, Infinity, -1, 0.5, 4294967296])
      expect(validateSeed(seed)).toMatch(/seed/i);
  });

  it("copies the ordered data and labels without storing test photos", () => {
    const s = selection();
    const manifest = createRunManifest(7, s);
    s.train[0].labelId = "changed";
    expect(manifest.train[0]).toEqual({
      id: "t1",
      sha256: "hash-t1",
      labelId: "a",
    });
    expect(manifest.validation.map((i) => i.id)).toEqual(["v1", "v2"]);
    expect(() =>
      createRunManifest(7, {
        ...selection(),
        validation: [{ ...image("test", "a", "validation"), split: "test" }],
      }),
    ).toThrow(/sealed/i);
  });

  it("compares recorded validation on identical data while listing changed settings", () => {
    const a = model(),
      b = model();
    b.id = "m2";
    b.settings = { ...b.settings, learningRate: 0.1, seed: 9 };
    const c = compareRecordedRuns(a, b);
    expect(c.ok).toBe(true);
    expect(c.changes).toContain("learning rate");
    expect(c.changes).toContain("seed");
  });

  it("refuses records without provenance or validation measurements", () => {
    const a = model(),
      b = model();
    delete b.experiment;
    expect(compareRecordedRuns(a, b).ok).toBe(false);
    b.experiment = createRunManifest(7, selection());
    b.history[0].validationAccuracy = null;
    expect(compareRecordedRuns(a, b).ok).toBe(false);
  });

  it("refuses different datasets, versions, encoders, class order and split seeds", () => {
    for (const mutate of [
      (m: ModelRecord) => {
        m.datasetId = "other";
      },
      (m: ModelRecord) => {
        m.datasetVersion++;
      },
      (m: ModelRecord) => {
        m.encoderKey = "other";
      },
      (m: ModelRecord) => {
        m.labelIds.reverse();
      },
      (m: ModelRecord) => {
        m.experiment!.splitSeed++;
      },
    ]) {
      const b = model();
      mutate(b);
      expect(compareRecordedRuns(model(), b).ok).toBe(false);
    }
  });

  it("refuses training subsets, reordered examples, changed labels and edited photos", () => {
    for (const mutate of [
      (m: ModelRecord) => {
        m.experiment!.train.pop();
      },
      (m: ModelRecord) => {
        m.experiment!.train.reverse();
      },
      (m: ModelRecord) => {
        m.experiment!.validation[0].labelId = "b";
      },
      (m: ModelRecord) => {
        m.experiment!.train[0].sha256 = "edited";
      },
    ]) {
      const b = model();
      mutate(b);
      expect(compareRecordedRuns(model(), b).ok).toBe(false);
    }
  });

  it("restores only the same dataset snapshot and exact selected examples", () => {
    const m = model();
    const context = {
      datasetId: "d",
      datasetVersion: 4,
      encoderKey: "encoder-v1",
      splitSeed: 7,
      selection: selection(),
    };
    expect(replayProblem(m, context)).toBeNull();
    expect(replayProblem(m, { ...context, datasetVersion: 5 })).toMatch(
      /changed/i,
    );
    const changed = selection();
    changed.train[0].labelId = "b";
    expect(replayProblem(m, { ...context, selection: changed })).toMatch(
      /examples/i,
    );
  });
  it("repeats completed epochs rather than the original cancelled budget", () => {
    const m = model();
    m.settings.epochs = 300;
    m.stoppedEarly = true;
    m.history[0].epoch = 3;
    expect(repeatSettings(m)?.epochs).toBe(3);
    m.history[0].epoch = 0;
    expect(repeatSettings(m)).toBeNull();
  });

  it("lists completed epoch differences and rejects non-finite saved losses", () => {
    const a = model(),
      b = model();
    b.history[0].epoch = 1;
    b.stoppedEarly = true;
    expect(compareRecordedRuns(a, b).changes).toContain("completed epochs");
    b.history[0].validationLoss = NaN;
    expect(compareRecordedRuns(a, b).ok).toBe(false);
    b.history[0].validationLoss = 0.5;
    b.history[0].trainLoss = Infinity;
    expect(compareRecordedRuns(a, b).ok).toBe(false);
  });
});
