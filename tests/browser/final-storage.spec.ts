import { test, expect } from "@playwright/test";

test("softmax and neural choices compete for the same durable dataset lock", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { DatasetDb } = await import("/src/datasets/db.ts");
    const { DatasetService } = await import("/src/datasets/service.ts");
    const { finalFixture } = await import("/tests/fixtures/final-check.ts");
    const { createNetworkFinalChoice, fingerprintModel } = await import(
      "/src/learning/final-evaluation.ts"
    );
    const { prepareMethodComparison } = await import(
      "/src/learning/method-comparison.ts"
    );
    const { trainNetwork } = await import("/src/learning/nonlinear.ts");
    const f = finalFixture(),
      db = await DatasetDb.open(),
      second = await DatasetDb.open();
    const x = [0, 1].map((j) =>
      Float32Array.from({ length: f.model.dims }, (_, i) => (i === j ? 1 : 0)),
    );
    const run = await trainNetwork(
      {
        dims: f.model.dims,
        classes: 2,
        trainX: x,
        trainY: [0, 1],
        validationX: x,
        validationY: [0, 1],
      },
      f.model.settings,
    );
    const choice = createNetworkFinalChoice(
      f.model,
      run,
      prepareMethodComparison(f, f.model),
    );
    await db.commit({
      put: {
        datasets: [f.dataset],
        labels: f.labels,
        images: f.images,
        models: [f.model],
      },
    });
    const [nnHash, softmaxHash] = await Promise.all([
      fingerprintModel(f.model, choice),
      fingerprintModel(f.model),
    ]);
    const attempts = await Promise.allSettled([
      db.finalChecks().claim(f.model, nnHash, undefined, choice),
      second.finalChecks().claim(f.model, softmaxHash),
    ]);
    const lock = (
      attempts.find(
        (r) => r.status === "fulfilled",
      ) as PromiseFulfilledResult<any>
    ).value;
    let switched = false;
    try {
      await second
        .finalChecks()
        .claim(
          f.model,
          lock.networkChoice ? softmaxHash : nnHash,
          undefined,
          lock.networkChoice ? undefined : choice,
        );
    } catch {
      switched = true;
    }
    const complete = await db.finalChecks().complete(lock, f.model, {
      completedAt: new Date().toISOString(),
      loss: 0.5,
      truth: [0, 1],
      predicted: [0, 1],
    });
    let overwritten = false;
    try {
      await second.finalChecks().claim(f.model, nnHash, undefined, choice);
    } catch {
      overwritten = true;
    }
    const service = await DatasetService.open();
    await service.deleteDataset(f.dataset.id);
    const deleted = await db.finalChecks().read(f.dataset.id);
    service.close();
    db.close();
    second.close();
    return {
      successes: attempts.filter((r) => r.status === "fulfilled").length,
      switched,
      overwritten,
      status: complete.status,
      deleted: deleted ?? null,
    };
  });
  expect(result).toEqual({
    successes: 1,
    switched: true,
    overwritten: true,
    status: "complete",
    deleted: null,
  });
});

test("the final choice is atomic across connections, immutable after completion, and removed with its dataset", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { DatasetDb } = await import("/src/datasets/db.ts");
    const { DatasetService } = await import("/src/datasets/service.ts");
    const { finalFixture } = await import("/tests/fixtures/final-check.ts");
    const { fingerprintModel } = await import(
      "/src/learning/final-evaluation.ts"
    );
    const f = finalFixture(),
      other = structuredClone(f.model);
    other.id = "m2";
    const db = await DatasetDb.open(),
      second = await DatasetDb.open();
    await db.commit({
      put: {
        datasets: [f.dataset],
        labels: f.labels,
        images: f.images,
        models: [f.model, other],
      },
    });
    const [ha, hb] = await Promise.all([
      fingerprintModel(f.model),
      fingerprintModel(other),
    ]);
    const attempts = await Promise.allSettled([
      db.finalChecks().claim(f.model, ha),
      second.finalChecks().claim(other, hb),
    ]);
    const lock = (
      attempts.find(
        (r) => r.status === "fulfilled",
      ) as PromiseFulfilledResult<any>
    ).value;
    const winner = lock.modelId === f.model.id ? f.model : other;
    const loser = winner.id === f.model.id ? other : f.model;
    const refuse = async (work: Promise<unknown>) => {
      try {
        await work;
        return false;
      } catch {
        return true;
      }
    };
    const switched = await refuse(
      db.finalChecks().claim(loser, await fingerprintModel(loser)),
    );
    const metrics = {
      completedAt: new Date().toISOString(),
      loss: 0.5,
      truth: [0, 1],
      predicted: [0, 1],
    };
    const invalid = await refuse(
      db
        .finalChecks()
        .complete(lock, winner, { ...metrics, predicted: [3, 3] }),
    );
    const complete = await db.finalChecks().complete(lock, winner, metrics);
    const overwritten = await refuse(
      db.finalChecks().complete(lock, winner, { ...metrics, loss: 0.1 }),
    );
    const service = await DatasetService.open();
    await service.deleteDataset(f.dataset.id);
    const deleted = await db.finalChecks().read(f.dataset.id);
    service.close();
    db.close();
    second.close();
    return {
      successes: attempts.filter((r) => r.status === "fulfilled").length,
      switched,
      invalid,
      overwritten,
      status: complete.status,
      deleted: deleted ?? null,
    };
  });
  expect(result).toEqual({
    successes: 1,
    switched: true,
    invalid: true,
    overwritten: true,
    status: "complete",
    deleted: null,
  });
});

test("changed datasets cannot finish or reset a locked final check", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { DatasetDb } = await import("/src/datasets/db.ts");
    const { finalFixture } = await import("/tests/fixtures/final-check.ts");
    const { fingerprintModel } = await import(
      "/src/learning/final-evaluation.ts"
    );
    const f = finalFixture(),
      db = await DatasetDb.open(),
      hash = await fingerprintModel(f.model);
    await db.commit({
      put: {
        datasets: [f.dataset],
        labels: f.labels,
        images: f.images,
        models: [f.model],
      },
    });
    const lock = await db.finalChecks().claim(f.model, hash);
    await db.commit({ put: { datasets: [{ ...f.dataset, version: 2 }] } });
    let rejected = 0;
    try {
      await db.finalChecks().complete(lock, f.model, {
        completedAt: new Date().toISOString(),
        loss: 0.1,
        truth: [0, 1],
        predicted: [0, 1],
      });
    } catch {
      rejected++;
    }
    try {
      await db.finalChecks().claim(f.model, hash);
    } catch {
      rejected++;
    }
    const stored = await db.finalChecks().read("d");
    db.close();
    return { rejected, status: stored?.status, result: stored?.result ?? null };
  });
  expect(result).toEqual({ rejected: 2, status: "locked", result: null });
});

test("upgrading v2 keeps saved parameters and cached embeddings, adding only the final store", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { finalFixture } = await import("/tests/fixtures/final-check.ts");
    const f = finalFixture();
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open("visual-labs-datasets", 2);
      open.onupgradeneeded = () => {
        const db = open.result;
        db.createObjectStore("datasets", { keyPath: "id" });
        db.createObjectStore("blobs", { keyPath: "id" });
        for (const name of ["labels", "images", "models", "embeddings"])
          db.createObjectStore(name, {
            keyPath: name === "embeddings" ? "imageId" : "id",
          }).createIndex("datasetId", "datasetId");
      };
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result,
          tx = db.transaction(
            ["datasets", "models", "embeddings"],
            "readwrite",
          );
        tx.objectStore("datasets").put(f.dataset);
        tx.objectStore("models").put(f.model);
        tx.objectStore("embeddings").put({
          datasetId: "d",
          imageId: "ta",
          vector: new Float32Array([1, 2]),
          encoderKey: "legacy",
        });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onabort = () => reject(tx.error);
      };
    });
    const { DatasetDb } = await import("/src/datasets/db.ts");
    const db = await DatasetDb.open(),
      models = await db.listModels("d"),
      embeddings = await db.getEmbeddings(["ta"]);
    const record = await db.finalChecks().read("d");
    db.close();
    return {
      bias: Array.from(models[0].bias),
      weights: models[0].weights.length,
      vector: Array.from(embeddings[0].vector),
      record: record ?? null,
    };
  });
  expect(result).toEqual({
    bias: [1, 0],
    weights: 2048,
    vector: [1, 2],
    record: null,
  });
});

test("storage refusal creates no final lock; a cancelled completion preserves the retryable choice", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { DatasetDb } = await import("/src/datasets/db.ts");
    const { finalFixture } = await import("/tests/fixtures/final-check.ts");
    const { fingerprintModel } = await import(
      "/src/learning/final-evaluation.ts"
    );
    const f = finalFixture(),
      db = await DatasetDb.open(),
      hash = await fingerprintModel(f.model);
    await db.commit({
      put: {
        datasets: [f.dataset],
        labels: f.labels,
        images: f.images,
        models: [f.model],
      },
    });
    const original = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (value, key) {
      if (this.name === "finalChecks")
        throw new DOMException(
          "Simulated storage refusal",
          "QuotaExceededError",
        );
      return key === undefined
        ? original.call(this, value)
        : original.call(this, value, key);
    };
    let refused = false;
    try {
      await db.finalChecks().claim(f.model, hash);
    } catch {
      refused = true;
    } finally {
      IDBObjectStore.prototype.add = original;
    }
    const absent = !(await db.finalChecks().read("d"));
    const lock = await db.finalChecks().claim(f.model, hash);
    const c = new AbortController();
    c.abort();
    let cancelled = false;
    try {
      await db.finalChecks().complete(
        lock,
        f.model,
        {
          completedAt: new Date().toISOString(),
          loss: 0.1,
          truth: [0, 1],
          predicted: [0, 1],
        },
        c.signal,
      );
    } catch {
      cancelled = true;
    }
    const saved = await db.finalChecks().read("d");
    db.close();
    return {
      refused,
      absent,
      cancelled,
      status: saved?.status,
      result: saved?.result ?? null,
    };
  });
  expect(result).toEqual({
    refused: true,
    absent: true,
    cancelled: true,
    status: "locked",
    result: null,
  });
});
