import { test, expect, type Page } from "@playwright/test";

// Real encoder (MobileNetV3-Small via MediaPipe in a worker), real IndexedDB and the real
// Training lab UI in Chromium, trained on the generated example dataset.

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

async function loadExample(page: Page) {
  page.on("dialog", (d) => d.accept());
  await page.goto("/#datasets");
  await page.getByTestId("ds-example").click();
  await expect(page.locator("#ds-status")).toContainText(
    "Example dataset ready",
    { timeout: 60000 },
  );
  await page.locator("#tab-training").click();
  await expect(page.locator("#training-view")).toBeVisible();
  await expect(page.getByTestId("tr-train")).toBeEnabled();
}

/** Reads a whole object store straight from IndexedDB, bypassing the UI. */
function readStore<T = Record<string, unknown>>(page: Page, store: string) {
  return page.evaluate(
    (store) =>
      new Promise<unknown[]>((resolve, reject) => {
        const open = indexedDB.open("visual-labs-datasets");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const r = db.transaction(store).objectStore(store).getAll();
          r.onsuccess = () => {
            db.close();
            resolve(
              (r.result as Record<string, unknown>[]).map((x) =>
                Object.fromEntries(
                  Object.entries(x).filter(
                    ([, v]) => !ArrayBuffer.isView(v) && !(v instanceof Blob),
                  ),
                ),
              ),
            );
          };
          r.onerror = () => reject(r.error);
        };
      }),
    store,
  ) as Promise<T[]>;
}

/**
 * Installs Playwright's fake clock and pauses it, so zero-delay timers (training yields between
 * epochs with one) run only when the test calls clock.runFor. The clock starts at a fixed time and
 * pauses one second later: pausing at a fixed wall-clock date fails ("Cannot fast-forward to the
 * past") whenever the real time is already later than that date.
 */
async function holdClock(page: Page) {
  const start = new Date("2026-01-01T00:00:00Z");
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.getTime() + 1000));
}

async function train(page: Page, epochs = "50") {
  await page.locator("#tr-epochs").fill(epochs);
  await page.getByTestId("tr-train").click();
  const summary = page.getByTestId("tr-summary");
  await expect(summary).toBeVisible({ timeout: 90000 });
  return summary;
}

test("trains on the example dataset: loss falls, validation accuracy ≥ 90%, test photos sealed, embeddings reused", async ({
  page,
}) => {
  test.setTimeout(180000);
  await loadExample(page);
  await expect(page.locator("#tr-labels")).toContainText("sealed");
  const summary = await train(page);
  const before = Number(await summary.getAttribute("data-validation-before"));
  const after = Number(await summary.getAttribute("data-validation-after"));
  const lossFirst = Number(await summary.getAttribute("data-loss-first"));
  const lossLast = Number(await summary.getAttribute("data-loss-last"));
  console.log(
    `example: validation accuracy ${before} -> ${after}, training loss ${lossFirst} -> ${lossLast}`,
  );
  expect(after).toBeGreaterThanOrEqual(0.9);
  expect(lossLast).toBeLessThan(lossFirst * 0.5);
  await expect(summary).toHaveAttribute("data-epochs", "50");
  await expect(page.getByTestId("tr-param-count")).toContainText(
    "3,075 numbers were trained: 3 labels × 1,024 weights, plus 3 biases",
  );
  await expect(page.locator("#tr-loss-chart")).toHaveAttribute(
    "aria-label",
    /over 50 epochs/,
  );

  const images = await readStore<{ id: string; split: string | null }>(
    page,
    "images",
  );
  const embeddings = await readStore<{ imageId: string }>(page, "embeddings");
  const split = new Map(images.map((i) => [i.id, i.split]));
  const usable = images.filter(
    (i) => i.split === "train" || i.split === "validation",
  );
  expect(images.some((i) => i.split === "test")).toBe(true);
  expect(embeddings).toHaveLength(usable.length);
  expect(embeddings.every((e) => split.get(e.imageId) !== "test")).toBe(true);
  const validationCount = images.filter((i) => i.split === "validation").length;
  await expect(page.locator("#tr-compare tr")).toHaveCount(validationCount + 1);
  await expect(page.locator("#tr-result")).toContainText(
    `Embeddings: ${usable.length} computed now, 0 reused`,
  );

  // Second run: every embedding comes from the on-device cache.
  await train(page, "5");
  await expect(page.locator("#tr-result")).toContainText(
    `Embeddings: 0 computed now, ${usable.length} reused`,
  );
});

test("cancelling keeps the epochs completed so far", async ({ page }) => {
  test.setTimeout(180000);
  await loadExample(page);
  // Training yields to the browser between epochs with a zero-delay timer. A paused fake clock
  // holds it between epochs, so the test can cancel at a known point.
  await holdClock(page);
  await page.locator("#tr-epochs").fill("300");
  await page.getByTestId("tr-train").click();
  const text = page.locator("#tr-progress-text");
  await expect(text).toContainText("Epoch 0 of 300", { timeout: 90000 });
  for (let i = 0; i < 3; i++) await page.clock.runFor(1);
  await expect(text).not.toContainText("Epoch 0 of 300");
  await page.getByTestId("tr-cancel").click();
  await page.clock.runFor(1);
  const summary = page.getByTestId("tr-summary");
  await expect(summary).toHaveAttribute("data-stopped-early", "true");
  await expect(summary).toContainText("Stopped early after");
  const done = Number(await summary.getAttribute("data-epochs"));
  expect(done).toBeGreaterThanOrEqual(1);
  expect(done).toBeLessThan(300);
  await expect(page.locator("#tr-metrics")).toContainText(
    `After (epoch ${done})`,
  );
  await expect(page.getByTestId("tr-train")).toBeEnabled();
});

test("refuses out-of-range settings and selections without two labels", async ({
  page,
}) => {
  test.setTimeout(120000);
  await loadExample(page);
  await page.locator("#tr-lr").fill("5");
  await page.getByTestId("tr-train").click();
  await expect(page.locator("#tr-status")).toContainText(
    "Learning rate must be between 0.01 and 2",
  );
  await expect(page.getByTestId("tr-summary")).toHaveCount(0);
  await page.locator("#tr-lr").fill("0.5");
  await page.getByLabel("Use label circle").uncheck();
  await page.getByLabel("Use label square").uncheck();
  await expect(page.locator("#tr-problems")).toContainText(
    "Choose at least two labels",
  );
  await expect(page.getByTestId("tr-train")).toBeDisabled();
});

test("a saved model survives a reload, loads with the same results, and is removed with its dataset", async ({
  page,
}) => {
  test.setTimeout(180000);
  await loadExample(page);
  const summary = await train(page, "20");
  const after = Number(await summary.getAttribute("data-validation-after"));
  const lastColumn = (table: string) =>
    page
      .locator(`${table} tr td:last-child`)
      .evaluateAll((cells) => cells.map((c) => c.textContent));
  const trainedAnswers = await lastColumn("#tr-compare");
  expect(trainedAnswers.length).toBeGreaterThan(0);
  await page.getByTestId("tr-save").click();
  await expect(page.locator("#tr-status")).toContainText("Model saved");
  await expect(page.getByTestId("tr-model")).toHaveCount(1);

  await page.reload();
  await page.locator("#tab-training").click();
  await expect(page.getByTestId("tr-model")).toHaveCount(1);
  await page.getByTestId("tr-load").click();
  await expect(page.getByTestId("tr-loaded-accuracy")).toContainText(
    `right ${Math.round(after * 100)}% of the time (when trained: ${Math.round(after * 100)}%)`,
    { timeout: 60000 },
  );
  await expect(page.locator("#tr-loaded .ds-notice")).toHaveCount(0);
  // Same photos, same answers and the same confidence after the reload.
  expect(await lastColumn("#tr-loaded-compare")).toEqual(trainedAnswers);

  // Changing the dataset: the model still loads, with a warning.
  await page.locator("#tab-datasets").click();
  await page.getByTestId("ds-delete-image").first().click();
  await page.locator("#tab-training").click();
  await page.getByTestId("tr-load").click();
  await expect(page.locator("#tr-loaded .ds-notice")).toContainText(
    "The dataset has changed since this model was trained",
  );

  // Deleting a label the model needs: loading is refused.
  await page.locator("#tab-datasets").click();
  await page
    .locator("#ds-labels li")
    .filter({ has: page.getByLabel("Name of label circle") })
    .getByRole("button", { name: "Delete (keep photos unlabelled)" })
    .click();
  await page.locator("#tab-training").click();
  await page.getByTestId("tr-load").click();
  await expect(page.locator("#tr-status")).toContainText(
    "needs labels that no longer exist: circle",
  );

  // Deleting the dataset removes its embeddings and saved models too.
  expect((await readStore(page, "models")).length).toBe(1);
  await page.locator("#tab-datasets").click();
  await page.getByRole("button", { name: "Delete this dataset" }).click();
  await expect
    .poll(async () => (await readStore(page, "models")).length)
    .toBe(0);
  expect((await readStore(page, "embeddings")).length).toBe(0);
});

test("upgrading storage from version 1 keeps existing datasets", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("visual-labs-datasets", 1);
        open.onupgradeneeded = () => {
          const db = open.result;
          db.createObjectStore("datasets", { keyPath: "id" });
          db.createObjectStore("labels", { keyPath: "id" }).createIndex(
            "datasetId",
            "datasetId",
          );
          db.createObjectStore("images", { keyPath: "id" }).createIndex(
            "datasetId",
            "datasetId",
          );
          db.createObjectStore("blobs", { keyPath: "id" });
        };
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(["datasets", "labels"], "readwrite");
          tx.objectStore("datasets").put({
            id: "old",
            name: "Made before Phase 3",
            createdAt: "2026-01-01T00:00:00.000Z",
            seed: 1,
            version: 4,
            isExample: false,
            nextOrder: 1,
            duplicatesSkipped: 0,
            notRelated: [],
          });
          tx.objectStore("labels").put({
            id: "lab",
            datasetId: "old",
            name: "mug",
            createdAt: "2026-01-01T00:00:00.000Z",
          });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
  await page.goto("/?after-upgrade#training"); // a full page load, not a hash change
  await expect(page.locator("#tr-dataset")).toContainText(
    "Made before Phase 3",
  );
  await expect(page.locator("#tr-labels")).toContainText("mug");
  const info = await page.evaluate(
    () =>
      new Promise<{ version: number; stores: string[] }>((resolve) => {
        const open = indexedDB.open("visual-labs-datasets");
        open.onsuccess = () => {
          const db = open.result;
          resolve({ version: db.version, stores: [...db.objectStoreNames] });
          db.close();
        };
      }),
  );
  expect(info.version).toBe(2);
  expect(info.stores.sort()).toEqual(
    ["blobs", "datasets", "embeddings", "images", "labels", "models"].sort(),
  );
});

test("regression: after a re-split, a loaded model is never checked on photos it learned from", async ({
  page,
}) => {
  test.setTimeout(180000);
  await loadExample(page);
  await train(page, "20");
  await page.getByTestId("tr-save").click();
  await expect(page.getByTestId("tr-model")).toHaveCount(1);
  const [model] = await readStore<{ trainImages: { id: string }[] }>(
    page,
    "models",
  );
  const learned = new Set(model.trainImages.map((t) => t.id));
  expect(learned.size).toBeGreaterThan(0);

  await page.locator("#tab-datasets").click();
  await page.getByTestId("ds-resplit").click();
  await expect(page.locator("#ds-status")).not.toContainText("went wrong");
  // The leak exists: some photos the model learned from are now validation photos.
  await expect
    .poll(async () =>
      (await readStore<{ id: string; split: string }>(page, "images")).some(
        (i) => i.split === "validation" && learned.has(i.id),
      ),
    )
    .toBe(true);

  await page.locator("#tab-training").click();
  await page.getByTestId("tr-load").click();
  const accuracy = page.getByTestId("tr-loaded-accuracy");
  await expect(accuracy).toBeVisible({ timeout: 60000 });
  expect(Number(await accuracy.getAttribute("data-excluded"))).toBeGreaterThan(
    0,
  );
  await expect(page.getByTestId("tr-loaded-excluded")).toContainText(
    "left out because this model learned from",
  );
  const checked = await page
    .locator("#tr-loaded-compare tr[data-image-id]")
    .evaluateAll((rows) =>
      rows.map((r) => (r as HTMLElement).dataset.imageId!),
    );
  expect(checked.length).toBe(
    Number(await accuracy.getAttribute("data-checked")),
  );
  expect(checked.filter((id) => learned.has(id))).toEqual([]);
});

test("regression: deleting the dataset in the Dataset lab during training discards the run and saves nothing", async ({
  page,
}) => {
  test.setTimeout(180000);
  await loadExample(page);
  await train(page, "1"); // fills the embedding cache, as in the reported reproduction
  // Hold training between epochs with a paused fake clock.
  await holdClock(page);
  await page.locator("#tr-epochs").fill("300");
  await page.getByTestId("tr-train").click();
  await expect(page.locator("#tr-progress-text")).toContainText(
    "Epoch 0 of 300",
    { timeout: 60000 },
  );

  await page.locator("#tab-datasets").click();
  await page.getByRole("button", { name: "Delete this dataset" }).click();
  await expect
    .poll(async () => (await readStore(page, "datasets")).length)
    .toBe(0);
  await page.locator("#tab-training").click();
  await page.clock.runFor(1);

  await expect(page.locator("#tr-status")).toContainText(
    "The dataset was deleted while training was running",
  );
  await expect(page.getByTestId("tr-summary")).toHaveCount(0);
  await expect(page.getByTestId("tr-save")).toHaveCount(0);
  expect(await readStore(page, "models")).toEqual([]);
  expect(await readStore(page, "embeddings")).toEqual([]);
  expect(await readStore(page, "datasets")).toEqual([]);
});

test("storage refuses a model or embedding whose dataset or photo was deleted meanwhile", async ({
  page,
}) => {
  await page.goto("/");
  const outcome = await page.evaluate(async () => {
    const { DatasetService } = await import("/src/datasets/service.ts");
    const training = await DatasetService.open();
    const datasets = await DatasetService.open();
    const d = await training.createDataset("Deleted meanwhile");
    await datasets.reload();
    await datasets.deleteDataset(d.id);
    const kinds: string[] = [];
    try {
      await training.saveModel({
        id: "m",
        datasetId: d.id,
        name: "late",
        createdAt: "",
        encoderKey: "k",
        datasetVersion: 1,
        labelIds: ["a", "b"],
        labelNames: ["a", "b"],
        dims: 1,
        weights: new Float64Array(2),
        bias: new Float64Array(2),
        settings: {
          learningRate: 0.5,
          epochs: 1,
          batchSize: 16,
          perLabelCap: null,
          seed: 1,
        },
        history: [],
        stoppedEarly: false,
        trainCount: 0,
        validationCount: 0,
        trainImages: [],
      });
      kinds.push("saved");
    } catch (e) {
      kinds.push((e as { kind: string }).kind);
    }
    try {
      await training.saveEmbeddings([
        {
          imageId: "deleted-photo",
          datasetId: d.id,
          encoderKey: "k",
          vector: new Float32Array(4),
        },
      ]);
      kinds.push("saved");
    } catch (e) {
      kinds.push((e as { kind: string }).kind);
    }
    training.close();
    datasets.close();
    return kinds;
  });
  expect(outcome).toEqual(["missing", "missing"]);
  expect(await readStore(page, "models")).toEqual([]);
  expect(await readStore(page, "embeddings")).toEqual([]);
});
