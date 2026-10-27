import { describe, expect, it } from "vitest";
import { seededRandom } from "../src/datasets/example";
import type {
  DatasetRecord,
  ImageRecord,
  LabelRecord,
  Split,
} from "../src/datasets/types";
import { CancelledError, embedImages } from "../src/learning/embeddings";
import { ENCODER, ENCODER_KEY } from "../src/learning/encoder";
import {
  assertNoTestImages,
  SealedTestError,
  selectExamples,
} from "../src/learning/examples";
import { checkCompatibility } from "../src/learning/models";
import {
  evaluate,
  initModel,
  lossAndGradients,
  predict,
  trainEpoch,
  TrainingUnstableError,
  type SoftmaxModel,
} from "../src/learning/softmax";
import {
  DEFAULT_SETTINGS,
  describeOutcome,
  runTraining,
  validateSettings,
  type TrainingData,
} from "../src/learning/trainer";
import type { EmbeddingRecord, ModelRecord } from "../src/learning/types";

const noYield = () => Promise.resolve();

function unit(v: number[]) {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return v.map((x) => x / n);
}

/**
 * Controlled fixture: each class is a random direction in `dims` dimensions; examples are that
 * direction plus noise, scaled to length 1 like real encoder output.
 */
function clusters(
  classes: number,
  dims: number,
  perClass: number,
  noise: number,
  seed: number,
) {
  const r = seededRandom(seed);
  const gauss = () =>
    Math.sqrt(-2 * Math.log(Math.max(r(), 1e-12))) *
    Math.cos(2 * Math.PI * r());
  const centres = Array.from({ length: classes }, () =>
    unit(Array.from({ length: dims }, gauss)),
  );
  const xs: Float32Array[] = [],
    ys: number[] = [];
  for (let i = 0; i < perClass; i++)
    centres.forEach((c, k) => {
      xs.push(
        Float32Array.from(
          unit(c.map((v) => v + (noise / Math.sqrt(dims)) * gauss())),
        ),
      );
      ys.push(k);
    });
  return { xs, ys };
}

function fixtureData(seed = 7): TrainingData {
  // Same seed, same random sequence: the first 90 examples are the training set and the
  // last 30 are new draws around the same class directions, unseen during training.
  const all = clusters(3, 1024, 40, 1.2, seed);
  return {
    trainX: all.xs.slice(0, 90),
    trainY: all.ys.slice(0, 90),
    validationX: all.xs.slice(90),
    validationY: all.ys.slice(90),
    classes: 3,
    dims: 1024,
  };
}

const settings = (seed = 1, epochs = 50) => ({
  ...DEFAULT_SETTINGS,
  epochs,
  perLabelCap: null,
  seed,
});

describe("softmax classifier", () => {
  it("probabilities are positive and sum to 1, even for huge scores", () => {
    const m = initModel(4, 3, 3);
    m.bias[2] = 1e6; // naive exp() would overflow
    const p = predict(m, [0.5, -0.2, 0.1]);
    expect(p.every((v) => v >= 0 && Number.isFinite(v))).toBe(true);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(p[2]).toBeCloseTo(1, 12);
    const e = evaluate(m, [[0.5, -0.2, 0.1]], [0]);
    expect(Number.isFinite(e.loss)).toBe(true);
    expect(e.loss).toBeGreaterThan(1e5); // confidently wrong: large but finite loss
  });

  it("analytic gradients match finite differences (relative error < 1e-6)", () => {
    const r = seededRandom(11);
    const m = initModel(3, 5, 5, 0.5);
    for (let k = 0; k < 3; k++) m.bias[k] = r() - 0.5;
    const xs = Array.from({ length: 7 }, () =>
      Array.from({ length: 5 }, () => r() * 2 - 1),
    );
    const ys = [0, 1, 2, 1, 0, 2, 2];
    const g = lossAndGradients(m, xs, ys);
    const eps = 1e-6;
    const numeric = (arr: Float64Array, i: number) => {
      const keep = arr[i];
      arr[i] = keep + eps;
      const up = lossAndGradients(m, xs, ys).loss;
      arr[i] = keep - eps;
      const down = lossAndGradients(m, xs, ys).loss;
      arr[i] = keep;
      return (up - down) / (2 * eps);
    };
    let worst = 0;
    const check = (arr: Float64Array, grad: Float64Array) => {
      for (let i = 0; i < arr.length; i++) {
        const n = numeric(arr, i);
        const rel =
          Math.abs(n - grad[i]) /
          Math.max(1e-8, Math.abs(n) + Math.abs(grad[i]));
        worst = Math.max(worst, rel);
      }
    };
    check(m.weights, g.weights);
    check(m.bias, g.bias);
    expect(worst).toBeLessThan(1e-6);
  });

  it("stops with a clear error when the numbers stop being finite", () => {
    const { xs, ys } = clusters(2, 8, 10, 0.5, 3);
    // An absurd step size sends the weights to ±Infinity (and Infinity − Infinity is NaN).
    const m = initModel(2, 8, 1);
    expect(() => trainEpoch(m, xs, ys, Infinity, 16, seededRandom(1))).toThrow(
      TrainingUnstableError,
    );
    const overflow = initModel(2, 8, 1);
    overflow.weights.fill(1e308);
    expect(() =>
      trainEpoch(
        overflow,
        xs.map((x) => x.map(() => 1e10)),
        ys,
        1,
        16,
        seededRandom(1),
      ),
    ).toThrow(TrainingUnstableError);
  });
});

describe("training on a controlled fixture", () => {
  it("loss falls and validation accuracy reaches at least 95%", async () => {
    const data = fixtureData();
    const run = await runTraining(data, settings(), {
      yieldBetweenEpochs: noYield,
    });
    expect(run.history).toHaveLength(51);
    const first = run.history[0],
      last = run.history.at(-1)!;
    expect(last.trainLoss).toBeLessThan(first.trainLoss * 0.5);
    expect(last.validationLoss!).toBeLessThan(first.validationLoss!);
    expect(last.validationAccuracy!).toBeGreaterThanOrEqual(0.95);
    expect(run.after!.accuracy).toBe(last.validationAccuracy);
    expect(run.before!.accuracy).toBe(first.validationAccuracy);
    expect(run.evidence.count).toBe(3 * 1024 + 3);
    expect(run.evidence.normAfter).toBeGreaterThan(run.evidence.normBefore);
    expect(run.evidence.meanAbsChange).toBeGreaterThan(0);
    expect(describeOutcome(run)).toMatch(/Validation accuracy improved/);
  });

  it("the same data, settings and seed give identical weights; another seed differs", async () => {
    const data = fixtureData();
    const a = await runTraining(data, settings(5, 5), {
      yieldBetweenEpochs: noYield,
    });
    const b = await runTraining(data, settings(5, 5), {
      yieldBetweenEpochs: noYield,
    });
    const c = await runTraining(data, settings(6, 5), {
      yieldBetweenEpochs: noYield,
    });
    expect(Array.from(a.model.weights)).toEqual(Array.from(b.model.weights));
    expect(a.history).toEqual(b.history);
    expect(Array.from(a.model.weights)).not.toEqual(
      Array.from(c.model.weights),
    );
  });

  it("cancelling keeps the epochs completed so far, marked as stopped early", async () => {
    const controller = new AbortController();
    const run = await runTraining(fixtureData(), settings(1, 50), {
      signal: controller.signal,
      yieldBetweenEpochs: noYield,
      onEpoch: (r) => {
        if (r.epoch === 3) controller.abort();
      },
    });
    expect(run.stoppedEarly).toBe(true);
    expect(run.history.at(-1)!.epoch).toBe(3);
    expect(describeOutcome(run)).toMatch(/^Stopped early after 3/);
  });

  it("reports no improvement honestly when labels carry no signal", async () => {
    const { xs } = clusters(2, 64, 20, 1, 4);
    const r = seededRandom(9);
    const ys = xs.map(() => (r() < 0.5 ? 0 : 1));
    const run = await runTraining(
      {
        trainX: xs.slice(0, 30),
        trainY: ys.slice(0, 30),
        validationX: xs.slice(30),
        validationY: ys.slice(30),
        classes: 2,
        dims: 64,
      },
      settings(2, 30),
      { yieldBetweenEpochs: noYield },
    );
    const text = describeOutcome(run);
    expect(text).toMatch(/Validation accuracy/);
    if (run.after!.accuracy <= run.before!.accuracy)
      expect(text).not.toMatch(/improved/);
  });

  it("validates settings ranges", () => {
    expect(
      validateSettings({ learningRate: 0.5, epochs: 50, perLabelCap: null }),
    ).toEqual([]);
    expect(
      validateSettings({
        learningRate: 5,
        epochs: 50,
        perLabelCap: null,
      }).join(),
    ).toMatch(/Learning rate/);
    expect(
      validateSettings({
        learningRate: 0.5,
        epochs: 0,
        perLabelCap: null,
      }).join(),
    ).toMatch(/Epochs/);
    expect(
      validateSettings({
        learningRate: 0.5,
        epochs: 2.5,
        perLabelCap: null,
      }).join(),
    ).toMatch(/Epochs/);
    expect(
      validateSettings({ learningRate: NaN, epochs: 5, perLabelCap: 0 }),
    ).toHaveLength(2);
  });
});

function image(
  i: number,
  labelId: string | null,
  split: Split | null,
): ImageRecord {
  return {
    id: `img-${i}`,
    datasetId: "d1",
    labelId,
    sha256: `sha-${i}`,
    dhash: "0000000000000000",
    width: 10,
    height: 10,
    bytes: 1,
    order: i,
    addedAt: "",
    source: "upload",
    split,
  };
}
const labels: LabelRecord[] = ["A", "B", "C"].map((id) => ({
  id,
  datasetId: "d1",
  name: id.toLowerCase(),
  createdAt: id,
}));
const splits: Split[] = [
  "train",
  "train",
  "train",
  "train",
  "validation",
  "test",
];
const images = labels.flatMap((l, li) =>
  Array.from({ length: 12 }, (_, i) =>
    image(li * 100 + i, l.id, splits[i % 6]),
  ),
);

describe("example selection", () => {
  it("uses training and validation photos of the chosen labels and never test photos", () => {
    const s = selectExamples(images, labels, ["A", "C"], null, 1);
    expect(s.problems).toEqual([]);
    expect(s.classes.map((c) => c.id)).toEqual(["A", "C"]);
    expect(s.train).toHaveLength(16);
    expect(s.validation).toHaveLength(4);
    expect([...s.train, ...s.validation].some((i) => i.split === "test")).toBe(
      false,
    );
    expect(
      s.train.every((i, n) => s.classes[s.trainLabels[n]].id === i.labelId),
    ).toBe(true);
    expect(
      s.validation.every(
        (i, n) => s.classes[s.validationLabels[n]].id === i.labelId,
      ),
    ).toBe(true);
  });

  it("a per-label cap picks the same subset for the same seed", () => {
    const a = selectExamples(images, labels, ["A", "B"], 3, 42);
    const b = selectExamples(images, labels, ["A", "B"], 3, 42);
    expect(a.train).toHaveLength(6);
    expect(a.train.map((i) => i.id)).toEqual(b.train.map((i) => i.id));
    expect(a.validation).toHaveLength(4); // the cap applies to training photos only
  });

  it("explains why training cannot start", () => {
    expect(
      selectExamples(images, labels, ["A"], null, 1).problems.join(),
    ).toMatch(/at least two/);
    const noTrain = images.map((i) =>
      i.labelId === "B" && i.split === "train"
        ? { ...i, split: "validation" as const }
        : i,
    );
    expect(
      selectExamples(noTrain, labels, ["A", "B"], null, 1).problems.join(),
    ).toMatch(/“b” has no training photos/);
  });

  it("the guard refuses test photos before they can be embedded or evaluated", () => {
    expect(() =>
      assertNoTestImages([{ split: "train" }, { split: "test" }]),
    ).toThrow(SealedTestError);
    expect(() =>
      assertNoTestImages([{ split: "train" }, { split: "validation" }]),
    ).not.toThrow();
  });
});

describe("saved model compatibility", () => {
  const dataset = { id: "d1", version: 9 } as DatasetRecord;
  const model = (patch: Partial<ModelRecord> = {}): ModelRecord => ({
    id: "m1",
    datasetId: "d1",
    name: "Model 1",
    createdAt: "",
    encoderKey: ENCODER_KEY,
    datasetVersion: 9,
    labelIds: ["A", "B"],
    labelNames: ["a", "b"],
    dims: 4,
    weights: new Float64Array(8),
    bias: new Float64Array(2),
    settings: settings(),
    history: [],
    stoppedEarly: false,
    trainCount: 1,
    validationCount: 1,
    ...patch,
  });

  it("accepts a matching model, and warns when the dataset changed", () => {
    expect(checkCompatibility(model(), ENCODER_KEY, dataset, labels)).toEqual({
      ok: true,
      warning: null,
    });
    const changed = checkCompatibility(
      model({ datasetVersion: 3 }),
      ENCODER_KEY,
      dataset,
      labels,
    );
    expect(changed.ok && changed.warning).toMatch(/dataset has changed/);
  });

  it("refuses a different encoder, a missing label, another dataset or damaged weights", () => {
    const reason = (m: ModelRecord) => {
      const c = checkCompatibility(m, ENCODER_KEY, dataset, labels);
      return c.ok ? "" : c.reason;
    };
    expect(reason(model({ encoderKey: "other" }))).toMatch(/different encoder/);
    expect(
      reason(model({ labelIds: ["A", "Z"], labelNames: ["a", "zebra"] })),
    ).toMatch(/no longer exist: zebra/);
    expect(reason(model({ datasetId: "d2" }))).toMatch(/different dataset/);
    expect(reason(model({ weights: new Float64Array(7) }))).toMatch(/damaged/);
    const nan = new Float64Array(8);
    nan[3] = NaN;
    expect(reason(model({ weights: nan }))).toMatch(/damaged/);
  });

  it("predictions from restored weights equal the originals", () => {
    const m: SoftmaxModel = initModel(3, 6, 8, 0.3);
    const restored = {
      ...m,
      weights: new Float64Array(Array.from(m.weights)),
      bias: m.bias.slice(),
    };
    const x = [0.1, 0.2, -0.3, 0.4, 0, 0.5];
    expect(Array.from(predict(restored, x))).toEqual(Array.from(predict(m, x)));
  });
});

describe("embedding cache", () => {
  const blob = new Blob(["x"]);
  const make = (cached: EmbeddingRecord[]) => {
    const saved: EmbeddingRecord[] = [];
    return {
      saved,
      store: {
        getEmbeddings: async (ids: readonly string[]) =>
          cached.filter((c) => ids.includes(c.imageId)),
        saveEmbeddings: async (r: EmbeddingRecord[]) => void saved.push(...r),
        getBlob: async (id: string) => ({ id, image: blob, thumb: blob }),
      },
    };
  };
  const vec = (v: number) => new Float32Array(ENCODER.dimensions).fill(v);
  const imgs = [
    { id: "a", datasetId: "d", split: "train" as const },
    { id: "b", datasetId: "d", split: "validation" as const },
    { id: "c", datasetId: "d", split: "train" as const },
  ];

  it("reuses embeddings from the same encoder and recomputes stale ones", async () => {
    const { store, saved } = make([
      { imageId: "a", datasetId: "d", encoderKey: ENCODER_KEY, vector: vec(1) },
      {
        imageId: "b",
        datasetId: "d",
        encoderKey: "old-encoder",
        vector: vec(2),
      },
    ]);
    let calls = 0;
    const r = await embedImages(store, async () => (calls++, vec(3)), imgs);
    expect(r.reused).toBe(1);
    expect(r.computed).toBe(2);
    expect(calls).toBe(2);
    expect(saved.map((s) => s.imageId)).toEqual(["b", "c"]);
    expect(saved.every((s) => s.encoderKey === ENCODER_KEY)).toBe(true);
    expect(r.vectors.get("a")![0]).toBe(1);
    expect(r.vectors.get("b")![0]).toBe(3);
  });

  it("refuses test photos before embedding anything", async () => {
    const { store } = make([]);
    let calls = 0;
    await expect(
      embedImages(store, async () => (calls++, vec(1)), [
        ...imgs,
        { id: "t", datasetId: "d", split: "test" },
      ]),
    ).rejects.toThrow(SealedTestError);
    expect(calls).toBe(0);
  });

  it("cancelling keeps what was saved", async () => {
    const { store, saved } = make([]);
    const c = new AbortController();
    await expect(
      embedImages(store, async () => (c.abort(), vec(1)), imgs, {
        signal: c.signal,
      }),
    ).rejects.toThrow(CancelledError);
    expect(saved).toHaveLength(1);
  });
});
