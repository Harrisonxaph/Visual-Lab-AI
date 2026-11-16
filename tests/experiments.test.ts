import { describe, expect, it } from "vitest";
import type { ImageRecord, LabelRecord } from "../src/datasets/types";
import {
  selectExamples,
  type ExampleSelection,
} from "../src/learning/examples";
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

// Build manifests through the real deterministic photo-cap selection, then compare stored runs.
function sizeRuns() {
  const labels = [
    { id: "a", name: "a" },
    { id: "b", name: "b" },
  ];
  const photos = labels.flatMap((l, k) =>
    Array.from({ length: 4 }, (_, i) => ({
      ...image(`${l.id}${i}`, l.id, "train"),
      order: k * 4 + i,
    })),
  );
  photos.push(
    { ...image("va", "a", "validation"), order: 8 },
    { ...image("vb", "b", "validation"), order: 9 },
  );
  const make = (cap: number | null) => {
    const selected = selectExamples(
      photos,
      labels as LabelRecord[],
      ["a", "b"],
      cap,
      7,
    );
    return {
      ...model(),
      trainCount: selected.train.length,
      validationCount: selected.validation.length,
      settings: { ...model().settings, perLabelCap: cap },
      experiment: createRunManifest(7, selected),
    };
  };
  return [make(1), make(null)];
}

describe("controlled training-set size comparisons", () => {
  it("allows verified nested caps only in the explicit dataset-size mode, in either direction", () => {
    const [small, large] = sizeRuns();
    expect(compareRecordedRuns(small, large).ok).toBe(false);
    expect(compareRecordedRuns(small, large, "dataset-size")).toMatchObject({
      ok: true,
    });
    expect(compareRecordedRuns(large, small, "dataset-size")).toMatchObject({
      ok: true,
    });
    expect(compareRecordedRuns(small, large, "dataset-size").changes).toContain(
      "training photos",
    );
  });
  it("requires fixed optimiser settings and complete epoch budgets", () => {
    for (const mutate of [
      (m: ModelRecord) => {
        m.settings.learningRate = 0.1;
      },
      (m: ModelRecord) => {
        m.settings.seed++;
      },
      (m: ModelRecord) => {
        m.settings.batchSize = 8;
      },
      (m: ModelRecord) => {
        m.settings.epochs = 3;
      },
      (m: ModelRecord) => {
        m.stoppedEarly = true;
      },
      (m: ModelRecord) => {
        m.history[0].epoch = 1;
      },
    ]) {
      const [small, large] = sizeRuns();
      mutate(large);
      expect(compareRecordedRuns(small, large, "dataset-size").ok).toBe(false);
    }
  });
  it("does not relax validation identity, encoder, class or dataset requirements", () => {
    for (const mutate of [
      (m: ModelRecord) => {
        m.experiment!.validation.reverse();
      },
      (m: ModelRecord) => {
        m.experiment!.validation[0].sha256 = "edited";
      },
      (m: ModelRecord) => {
        m.encoderKey = "other";
      },
      (m: ModelRecord) => {
        m.datasetVersion++;
      },
      (m: ModelRecord) => {
        m.experiment!.splitSeed++;
      },
      (m: ModelRecord) => {
        m.labelIds.reverse();
      },
    ]) {
      const [small, large] = sizeRuns();
      mutate(large);
      expect(compareRecordedRuns(small, large, "dataset-size").ok).toBe(false);
    }
  });
  it("rejects unrelated training examples and wrong seeded subsets", () => {
    const [small, large] = sizeRuns();
    small.experiment!.train[0].id = "unrelated";
    expect(compareRecordedRuns(small, large, "dataset-size").ok).toBe(false);
    const [other, full] = sizeRuns();
    const alternative = full.experiment!.train.find(
      (r) => r.labelId === "a" && r.id !== other.experiment!.train[0].id,
    )!;
    other.experiment!.train[0] = { ...alternative };
    expect(compareRecordedRuns(other, full, "dataset-size").ok).toBe(false);
  });
  it("rejects training/validation overlap by ID or original-file hash, and duplicate references", () => {
    for (const mutate of [
      (m: ModelRecord) => {
        m.experiment!.train[0].id = m.experiment!.validation[0].id;
      },
      (m: ModelRecord) => {
        m.experiment!.train[0].sha256 = m.experiment!.validation[0].sha256;
      },
      (m: ModelRecord) => {
        m.experiment!.train[1] = { ...m.experiment!.train[0] };
      },
      (m: ModelRecord) => {
        m.experiment!.train[0].labelId = "missing";
      },
    ]) {
      const [small, large] = sizeRuns();
      mutate(large);
      expect(compareRecordedRuns(small, large, "dataset-size").ok).toBe(false);
    }
  });
  it("rejects invalid shared settings before treating them as controlled", () => {
    for (const mutate of [
      (m: ModelRecord) => {
        m.settings.batchSize = 0;
      },
      (m: ModelRecord) => {
        m.settings.learningRate = NaN;
      },
      (m: ModelRecord) => {
        m.settings.seed = -1;
      },
      (m: ModelRecord) => {
        m.experiment!.splitSeed = Infinity;
      },
    ]) {
      const [a, b] = sizeRuns();
      mutate(a);
      mutate(b);
      expect(compareRecordedRuns(a, b, "dataset-size").ok).toBe(false);
    }
  });

  it("refuses identical counts, missing manifests and invalid recorded measurements", () => {
    const [small, large] = sizeRuns();
    expect(compareRecordedRuns(small, small, "dataset-size").ok).toBe(false);
    delete large.experiment;
    expect(compareRecordedRuns(small, large, "dataset-size").ok).toBe(false);
    const [a, b] = sizeRuns();
    b.history[0].validationAccuracy = NaN;
    expect(compareRecordedRuns(a, b, "dataset-size").ok).toBe(false);
  });
});
