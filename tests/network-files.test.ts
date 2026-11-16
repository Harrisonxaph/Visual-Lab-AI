import { describe, expect, it } from "vitest";
import { ENCODER, ENCODER_KEY } from "../src/learning/encoder";
import { evaluateNetwork, trainNetwork } from "../src/learning/nonlinear";
import {
  serializeNetworkFile,
  parseNetworkFile,
  prepareNetworkCheck,
  MAX_NETWORK_FILE_BYTES,
} from "../src/learning/network-files";
import { finalFixture } from "./fixtures/final-check";

async function fixture() {
  const f = finalFixture();
  f.model.settings.epochs = 2;
  const x = (first: number) =>
    Float32Array.from({ length: ENCODER.dimensions }, (_, i) =>
      i === first ? 1 : 0,
    );
  const data = {
    dims: ENCODER.dimensions,
    classes: 2,
    trainX: [x(0), x(1)],
    trainY: [0, 1],
    validationX: [x(0), x(1)],
    validationY: [0, 1],
  };
  const run = await trainNetwork(
    data,
    { ...f.model.settings, l2: 0.1 },
    { yieldBetweenEpochs: () => Promise.resolve() },
  );
  f.model.settings.l2 = 0.1;
  f.model.history = structuredClone(run.history);
  f.model.experiment!.algorithm = "softmax-sgd-f64-l2/v1";
  return {
    f,
    data,
    run,
    plan: {
      train: f.images.filter((i) => i.split === "train"),
      validation: f.images.filter((i) => i.split === "validation"),
    },
  };
}
describe("bounded neural-network model files", () => {
  it("round-trips all parameters and predictions without including names or image pixels by default", async () => {
    const { f, run, plan, data } = await fixture();
    const json = serializeNetworkFile(f.model, run, plan);
    const parsed = parseNetworkFile(json);
    expect(parsed.network).toEqual(run.model);
    expect(
      evaluateNetwork(parsed.network, data.validationX, data.validationY),
    ).toEqual(evaluateNetwork(run.model, data.validationX, data.validationY));
    expect(parsed.classes.map((c) => c.name)).toEqual([undefined, undefined]);
    expect(parsed.train.map((r) => r.id)).toEqual(["ta", "tb"]);
    expect(parsed.validation.map((r) => r.id)).toEqual(["va", "vb"]);
    expect(JSON.parse(json)).not.toHaveProperty("image");
    expect(JSON.parse(json)).not.toHaveProperty("weights");
    expect(new TextEncoder().encode(json).byteLength).toBeLessThan(
      MAX_NETWORK_FILE_BYTES,
    );
    expect(
      parseNetworkFile(
        serializeNetworkFile(f.model, run, plan, true),
      ).classes.map((c) => c.name),
    ).toEqual(["a", "b"]);
  });
  it("refuses oversized, malformed, unknown-architecture and inconsistent parameter files", async () => {
    const { f, run, plan } = await fixture(),
      good = JSON.parse(serializeNetworkFile(f.model, run, plan));
    for (const mutate of [
      (x: any) => (x.schema = "other"),
      (x: any) => x.network.input.pop(),
      (x: any) => (x.network.outputBias[0] = null),
      (x: any) => (x.train[0].dhash = 1234567890123456),
      (x: any) => (x.classes[1].id = x.classes[0].id),
      (x: any) => (x.train = []),
      (x: any) => (x.validation[0].sha256 = x.train[0].sha256),
      (x: any) => (x.settings.epochs = 301),
      (x: any) => (x.history[1].validationAccuracy = 2),
      (x: any) => x.history.pop(),
      (x: any) => (x.algorithm = "softmax-sgd-f64/v1"),
    ]) {
      const bad = structuredClone(good);
      mutate(bad);
      expect(() => parseNetworkFile(JSON.stringify(bad))).toThrow();
    }
    expect(() => parseNetworkFile("null")).toThrow();
    expect(() => parseNetworkFile("{")).toThrow();
    expect(() =>
      parseNetworkFile(" ".repeat(MAX_NETWORK_FILE_BYTES + 1)),
    ).toThrow(/large/i);
    expect(() => parseNetworkFile("🙂".repeat(300000))).toThrow(/large/i);
  });
  it("discards unrecognised private fields and prototype keys from imported data", async () => {
    const { f, run, plan } = await fixture();
    const raw = JSON.parse(serializeNetworkFile(f.model, run, plan));
    raw.image = "private pixels";
    raw.settings.secret = "private metadata";
    raw.network.embedding = [1, 2, 3];
    Object.defineProperty(raw, "__proto__", {
      value: { polluted: true },
      enumerable: true,
    });
    const parsed = parseNetworkFile(JSON.stringify(raw));
    expect(parsed).not.toHaveProperty("image");
    expect(parsed.settings).not.toHaveProperty("secret");
    expect(parsed.network).not.toHaveProperty("embedding");
    expect(({} as any).polluted).toBeUndefined();
  });
  it("canonicalises uppercase difference hashes before screening copies", async () => {
    const { f, run, plan } = await fixture();
    const raw = JSON.parse(serializeNetworkFile(f.model, run, plan));
    raw.train[1].dhash = raw.train[1].dhash.toUpperCase();
    const parsed = parseNetworkFile(JSON.stringify(raw));
    expect(parsed.train[1].dhash).toBe("ffffffffffffffff");
    expect(prepareNetworkCheck(f, parsed).images.map((i) => i.id)).toEqual([
      "va",
      "vb",
    ]);
  });
  it("requires the original encoder/dataset and labels, while changed versions warn", async () => {
    const { f, run, plan } = await fixture(),
      record = parseNetworkFile(serializeNetworkFile(f.model, run, plan));
    expect(prepareNetworkCheck(f, record).images.map((i) => i.id)).toEqual([
      "va",
      "vb",
    ]);
    f.dataset.version++;
    expect(prepareNetworkCheck(f, record).warning).toMatch(/changed/i);
    expect(() =>
      prepareNetworkCheck({ ...f, labels: f.labels.slice(0, 1) }, record),
    ).toThrow(/label/i);
    expect(() =>
      prepareNetworkCheck(
        { ...f, dataset: { ...f.dataset, id: "different" } },
        record,
      ),
    ).toThrow(/dataset/i);
    expect(() =>
      prepareNetworkCheck(f, {
        ...record,
        encoderKey: ENCODER_KEY + "changed",
      }),
    ).toThrow(/encoder/i);
  });
  it("screens training IDs, exact copies and near copies out of current validation; test images never enter the plan", async () => {
    const { f, run, plan } = await fixture(),
      record = parseNetworkFile(serializeNetworkFile(f.model, run, plan));
    f.images[2].dhash = f.images[0].dhash;
    const check = prepareNetworkCheck(f, record);
    expect(check.excluded).toBe(1);
    expect(check.images.map((i) => i.id)).toEqual(["vb"]);
    expect(check.truth).toEqual([1]);
    f.images[3].sha256 = f.images[1].sha256;
    expect(() => prepareNetworkCheck(f, record)).toThrow(/validation/i);
  });
  it("refuses incomplete networks and includes only actual validation/training provenance", async () => {
    const { f, run, plan } = await fixture();
    expect(() =>
      serializeNetworkFile(f.model, { ...run, stoppedEarly: true }, plan),
    ).toThrow();
    expect(() =>
      serializeNetworkFile(f.model, run, {
        ...plan,
        validation: [f.images[4]],
      }),
    ).toThrow(/test|validation|metadata/i);
  });
});
