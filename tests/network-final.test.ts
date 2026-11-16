import { describe, expect, it } from "vitest";
import { finalFixture } from "./fixtures/final-check";
import { ENCODER } from "../src/learning/encoder";
import { prepareMethodComparison } from "../src/learning/method-comparison";
import { trainNetwork, evaluateNetwork } from "../src/learning/nonlinear";
import {
  createNetworkFinalChoice,
  prepareFinalPlan,
  fingerprintModel,
  runFinalCheck,
} from "../src/learning/final-evaluation";

async function fixture() {
  const f = finalFixture();
  const vectors = [0, 1].map((j) =>
    Float32Array.from({ length: ENCODER.dimensions }, (_, i) =>
      i === j ? 1 : 0,
    ),
  );
  const run = await trainNetwork(
    {
      dims: ENCODER.dimensions,
      classes: 2,
      trainX: vectors,
      trainY: [0, 1],
      validationX: vectors,
      validationY: [0, 1],
    },
    f.model.settings,
    { yieldBetweenEpochs: () => Promise.resolve() },
  );
  const choice = createNetworkFinalChoice(
    f.model,
    run,
    prepareMethodComparison(f, f.model),
  );
  return { f, vectors, choice };
}
describe("locked neural-network final evaluation", () => {
  it("records the actual network method/weights and provenance without changing legacy softmax plans", async () => {
    const { f, choice } = await fixture();
    const legacy = prepareFinalPlan(f.dataset, f.labels, f.images, f.model);
    expect(legacy).not.toHaveProperty("networkChoice");
    const plan = prepareFinalPlan(
      f.dataset,
      f.labels,
      f.images,
      f.model,
      choice,
    );
    expect(plan.networkChoice).toEqual(choice);
    expect(plan.test.map((i) => i.id)).toEqual(["xa", "xb"]);
    expect(plan.sourceRun).toEqual(f.model.experiment);
  });
  it("binds method and both network matrices to the fingerprint, retaining the legacy hash", async () => {
    const { f, choice } = await fixture();
    const original = await fingerprintModel(f.model),
      neural = await fingerprintModel(f.model, choice);
    expect(neural).not.toBe(original);
    choice.network.input[0] += 0.1;
    expect(await fingerprintModel(f.model, choice)).not.toBe(neural);
    expect(await fingerprintModel(f.model)).toBe(original);
  });
  it("evaluates the locked network, reads only held-out blobs and never updates parameters", async () => {
    const { f, vectors, choice } = await fixture();
    const plan = prepareFinalPlan(
      f.dataset,
      f.labels,
      f.images,
      f.model,
      choice,
    );
    const lock = {
      ...plan,
      id: "lock",
      createdAt: "now",
      status: "locked" as const,
      modelFingerprint: await fingerprintModel(f.model, choice),
    };
    const before = structuredClone(choice),
      reads: string[] = [];
    let index = 0;
    const result = await runFinalCheck(
      lock,
      f.model,
      async (id) => {
        reads.push(id);
        return new Blob();
      },
      async () => vectors[index++],
    );
    const expected = evaluateNetwork(choice.network, vectors, [0, 1]);
    expect(result.predicted).toEqual(expected.predicted);
    expect(result.loss).toBe(expected.loss);
    expect(reads).toEqual(["xa", "xb"]);
    expect(choice).toEqual(before);
  });
  it("refuses changed parameters and bad candidates before accessing test pixels", async () => {
    const { f, choice } = await fixture();
    const plan = prepareFinalPlan(
      f.dataset,
      f.labels,
      f.images,
      f.model,
      choice,
    );
    const lock = {
      ...plan,
      id: "lock",
      createdAt: "now",
      status: "locked" as const,
      modelFingerprint: await fingerprintModel(f.model, choice),
    };
    lock.networkChoice!.network.outputBias[0]++;
    let reads = 0;
    await expect(
      runFinalCheck(
        lock,
        f.model,
        async () => {
          reads++;
          return new Blob();
        },
        async () => new Float32Array(ENCODER.dimensions),
      ),
    ).rejects.toThrow(/model|locked/i);
    expect(reads).toBe(0);
    choice.validation[0].sha256 = "changed";
    expect(() =>
      prepareFinalPlan(f.dataset, f.labels, f.images, f.model, choice),
    ).toThrow();
  });
  it("retains the same test integrity guards and cancellation behaviour", async () => {
    const { f, choice } = await fixture();
    f.images[4].sha256 = f.images[0].sha256;
    expect(() =>
      prepareFinalPlan(f.dataset, f.labels, f.images, f.model, choice),
    ).toThrow(/overlap|copy/i);
    f.images[4].sha256 = "sha-xa";
    const plan = prepareFinalPlan(
        f.dataset,
        f.labels,
        f.images,
        f.model,
        choice,
      ),
      c = new AbortController();
    const lock = {
      ...plan,
      id: "lock",
      createdAt: "now",
      status: "locked" as const,
      modelFingerprint: await fingerprintModel(f.model, choice),
    };
    await expect(
      runFinalCheck(
        lock,
        f.model,
        async () => new Blob(),
        async () => new Float32Array(ENCODER.dimensions),
        { signal: c.signal, onProgress: () => c.abort() },
      ),
    ).rejects.toThrow(/cancel/i);
  });
});
