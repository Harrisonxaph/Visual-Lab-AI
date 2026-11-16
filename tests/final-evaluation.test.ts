import { describe, expect, it } from "vitest";
import { finalFixture as fixture } from "./fixtures/final-check";
import { ENCODER } from "../src/learning/encoder";
import {
  prepareFinalPlan,
  fingerprintModel,
  runFinalCheck,
} from "../src/learning/final-evaluation";

describe("explicit final held-out checks", () => {
  it("selects only test examples, with the frozen model's class order", () => {
    const f = fixture(),
      plan = prepareFinalPlan(f.dataset, f.labels, f.images, f.model);
    expect(plan.test.map((x) => x.id)).toEqual(["xa", "xb"]);
    expect(plan.test.map((x) => x.labelId)).toEqual(["a", "b"]);
  });
  it("refuses changed snapshots, unknown provenance, partial models and missing test classes", () => {
    for (const mutate of [
      (f: ReturnType<typeof fixture>) => {
        f.dataset.version++;
      },
      (f: ReturnType<typeof fixture>) => {
        delete f.model.experiment;
      },
      (f: ReturnType<typeof fixture>) => {
        f.model.stoppedEarly = true;
      },
      (f: ReturnType<typeof fixture>) => {
        f.images.pop();
      },
      (f: ReturnType<typeof fixture>) => {
        f.model.encoderKey = "other";
      },
      (f: ReturnType<typeof fixture>) => {
        f.model.weights[0] = NaN;
      },
      (f: ReturnType<typeof fixture>) => {
        f.model.labelNames.pop();
      },
      (f: ReturnType<typeof fixture>) => {
        f.model.settings.learningRate = NaN;
      },
    ]) {
      const f = fixture();
      mutate(f);
      expect(() =>
        prepareFinalPlan(f.dataset, f.labels, f.images, f.model),
      ).toThrow();
    }
  });
  it("refuses exact and likely-near copies of either training or validation images", () => {
    for (const source of [0, 2])
      for (const property of ["sha256", "dhash"] as const) {
        const f = fixture();
        f.images[4][property] = f.images[source][property];
        expect(() =>
          prepareFinalPlan(f.dataset, f.labels, f.images, f.model),
        ).toThrow(/overlap|copy/i);
      }
  });
  it("fingerprints actual weights, encoder, class order and recorded training configuration", async () => {
    const f = fixture(),
      hash = await fingerprintModel(f.model);
    expect(await fingerprintModel(structuredClone(f.model))).toBe(hash);
    f.model.weights[0] = 0.1;
    expect(await fingerprintModel(f.model)).not.toBe(hash);
  });
  it("evaluates only the locked test references without caching embeddings", async () => {
    const f = fixture(),
      plan = prepareFinalPlan(f.dataset, f.labels, f.images, f.model);
    const lock = {
      ...plan,
      id: "lock",
      modelFingerprint: await fingerprintModel(f.model),
      status: "locked" as const,
      createdAt: "now",
    };
    const reads: string[] = [];
    const result = await runFinalCheck(
      lock,
      f.model,
      async (id) => {
        reads.push(id);
        return new Blob();
      },
      async () => new Float32Array(ENCODER.dimensions),
    );
    expect(reads).toEqual(["xa", "xb"]);
    expect(result.truth).toEqual([0, 1]);
    expect(result.predicted).toEqual([0, 0]);
    expect(result.loss).toBeGreaterThan(0);
  });
  it("refuses a different model before reading test blobs", async () => {
    const f = fixture(),
      plan = prepareFinalPlan(f.dataset, f.labels, f.images, f.model);
    const lock = {
      ...plan,
      id: "lock",
      modelFingerprint: await fingerprintModel(f.model),
      status: "locked" as const,
      createdAt: "now",
    };
    f.model.bias[0]++;
    let read = false;
    await expect(
      runFinalCheck(
        lock,
        f.model,
        async () => {
          read = true;
          return new Blob();
        },
        async () => new Float32Array(ENCODER.dimensions),
      ),
    ).rejects.toThrow(/model/i);
    expect(read).toBe(false);
  });
  it("cancels pending encoding immediately and never returns partial predictions", async () => {
    const f = fixture(),
      plan = prepareFinalPlan(f.dataset, f.labels, f.images, f.model);
    const lock = {
      ...plan,
      id: "lock",
      modelFingerprint: await fingerprintModel(f.model),
      status: "locked" as const,
      createdAt: "now",
    };
    const c = new AbortController();
    const job = runFinalCheck(
      lock,
      f.model,
      async () => new Blob(),
      async () => {
        c.abort();
        return new Promise<Float32Array>(() => {});
      },
      { signal: c.signal },
    );
    await expect(job).rejects.toThrow(/cancel/i);
  });
});
