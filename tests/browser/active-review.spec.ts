import { test, expect, type Page } from "@playwright/test";
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
async function state(page: Page) {
  return page.evaluate(
    () =>
      new Promise<any>((resolve) => {
        const r = indexedDB.open("visual-labs-datasets");
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction([
              "datasets",
              "images",
              "models",
              "embeddings",
              "finalChecks",
            ]),
            d = tx.objectStore("datasets").getAll(),
            i = tx.objectStore("images").getAll(),
            m = tx.objectStore("models").getAll(),
            e = tx.objectStore("embeddings").getAllKeys(),
            f = tx.objectStore("finalChecks").getAll();
          tx.oncomplete = () => {
            resolve(
              JSON.parse(
                JSON.stringify(
                  {
                    datasets: d.result,
                    images: i.result,
                    models: m.result,
                    embeddings: e.result,
                    finals: f.result,
                  },
                  (_, v) => (v instanceof Float64Array ? Array.from(v) : v),
                ),
              ),
            );
            db.close();
          };
        };
      }),
  );
}
async function trained(page: Page) {
  await page.goto("/#datasets");
  await page.getByTestId("ds-example").click();
  await expect(page.locator("#ds-status")).toContainText(
    "Example dataset ready",
    { timeout: 60000 },
  );
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const r = indexedDB.open("visual-labs-datasets");
        r.onerror = () => reject(r.error);
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction(["datasets", "images"], "readwrite"),
            images = tx.objectStore("images"),
            get = images.getAll();
          get.onsuccess = () => {
            const all = get.result;
            const distance = (a: string, b: string) => {
              let n = 0;
              for (let j = 0; j < 16; j++) {
                let x = parseInt(a[j], 16) ^ parseInt(b[j], 16);
                while (x) {
                  n += x & 1;
                  x >>= 1;
                }
              }
              return n;
            };
            const selected = all
              .filter(
                (i) =>
                  i.split === "train" &&
                  all.every(
                    (o) => o.id === i.id || distance(i.dhash, o.dhash) > 6,
                  ),
              )
              .slice(0, 4);
            if (selected.length !== 4)
              throw Error("fixture needs four isolated training images");
            for (const image of selected)
              images.put({ ...image, labelId: null, split: null });
            const d = tx.objectStore("datasets"),
              ds = d.getAll();
            ds.onsuccess = () =>
              d.put({ ...ds.result[0], version: ds.result[0].version + 1 });
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onabort = () => reject(tx.error);
        };
      }),
  );
  await page.locator("#tab-training").click();
  await expect(page.getByTestId("tr-train")).toBeEnabled();
  await page.locator("#tr-epochs").fill("2");
  await page.getByTestId("tr-train").click();
  await expect(page.getByTestId("tr-summary")).toBeVisible({ timeout: 90000 });
  await page.getByTestId("tr-save").click();
  await expect(page.locator("#tr-status")).toContainText("Model saved");
  await expect(page.getByTestId("tr-review-run")).toBeVisible({
    timeout: 1000,
  });
}
test("real unlabelled review uses local probabilities and page-only decisions while protected data stays unchanged", async ({
  page,
}) => {
  test.setTimeout(120000);
  await trained(page);
  const before = await state(page);
  await page.getByTestId("tr-review-run").click();
  await expect(page.locator("#tr-review-status")).toContainText(
    "Review queue ready",
    { timeout: 90000 },
  );
  await expect(page.getByTestId("tr-review-item")).toHaveCount(4);
  await page
    .getByTestId("tr-review-item")
    .first()
    .getByRole("button", { name: "Accept suggestion" })
    .click();
  await page
    .getByTestId("tr-review-item")
    .nth(1)
    .getByRole("button", { name: "Skip", exact: true })
    .click();
  const corrected = page.getByTestId("tr-review-item").nth(2);
  const correction = await corrected
    .locator("select option")
    .evaluateAll(
      (options) =>
        (options as HTMLOptionElement[]).find((option) => !option.selected)!
          .value,
    );
  await corrected.locator("select").selectOption(correction);
  await corrected
    .getByRole("button", { name: "Use selected correction" })
    .click();
  await expect(
    page.getByTestId("tr-review-item").nth(2).locator("select"),
  ).toHaveValue(correction);
  await expect(page.getByTestId("tr-review-summary")).toContainText(
    "2 approved, 1 skipped",
  );
  await page.getByTestId("tr-review-order").selectOption("random");
  await expect(page.getByTestId("tr-review-summary")).toContainText(
    "2 approved, 1 skipped",
  );
  const after = await state(page);
  expect(after.images).toEqual(before.images);
  expect(after.models).toEqual(before.models);
  expect(after.datasets).toEqual(before.datasets);
  expect(after.finals).toEqual(before.finals);
  const added = after.embeddings.filter(
    (id: string) => !before.embeddings.includes(id),
  );
  expect(added).toHaveLength(0);
  expect(
    added.every(
      (id: string) => before.images.find((i) => i.id === id).labelId === null,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  await expect(page.getByTestId("tr-review-item")).toHaveCount(0);
});

test("pool scoring cancels or rejects changed snapshots without a partial queue", async ({
  page,
}) => {
  test.setTimeout(120000);
  await trained(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/models/mobilenet_v3_small.tflite", async (route) => {
    await gate;
    await route.continue().catch(() => {});
  });
  await page.getByTestId("tr-review-run").click();
  await page.getByTestId("tr-review-cancel").click();
  await expect(page.locator("#tr-review-status")).toContainText("cancelled");
  await expect(page.getByTestId("tr-review-item")).toHaveCount(0);
  await page.getByTestId("tr-review-run").click();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator("#tr-review-status")).toContainText("cancelled");
  await page.evaluate(() =>
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    }),
  );
  await page.getByTestId("tr-review-run").click();
  await expect(page.locator("#tr-review-status")).toContainText(
    "Scoring unlabelled",
  );
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const r = indexedDB.open("visual-labs-datasets");
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction(["datasets", "images"], "readwrite"),
            store = tx.objectStore("datasets"),
            get = store.getAll();
          get.onsuccess = () =>
            store.put({ ...get.result[0], version: get.result[0].version + 1 });
          const images = tx.objectStore("images"),
            all = images.getAll();
          all.onsuccess = () => {
            const pool = all.result.find(
              (i) => i.labelId === null && i.split === null,
            );
            const labelId = all.result.find((i) => i.labelId !== null).labelId;
            images.put({ ...pool, labelId, split: "test" });
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
        };
      }),
  );
  release();
  await page.unroute("**/models/mobilenet_v3_small.tflite");
  await expect(page.getByTestId("tr-review-run")).toBeEnabled();
  await expect(page.getByTestId("tr-review-item")).toHaveCount(0);
  await expect(page.locator("#tr-review-status")).toContainText(
    /version|dataset/i,
  );
  const after = await state(page);
  expect(
    after.embeddings.filter(
      (id: string) => after.images.find((i) => i.id === id)?.split === "test",
    ),
  ).toHaveLength(0);
});

test("explicit approval commit saves training-only provenance without changing protected cohorts", async ({
  page,
}) => {
  test.setTimeout(120000);
  await trained(page);
  await page.getByTestId("tr-review-run").click();
  await expect(page.locator("#tr-review-status")).toContainText(
    "Review queue ready",
    { timeout: 90000 },
  );
  const before = await state(page);
  await page
    .getByTestId("tr-review-item")
    .first()
    .getByRole("button", { name: "Accept suggestion" })
    .click();
  await expect(page.getByTestId("tr-review-commit")).toBeDisabled();
  await page.getByTestId("tr-review-consent").check();
  await page.getByTestId("tr-review-commit").click();
  await expect(page.locator("#tr-review-status")).toContainText(
    "1 approved photo committed to training",
  );
  const after = await state(page);
  expect(after.images.filter((i) => i.review)).toHaveLength(1);
  expect(after.images.find((i) => i.review)).toMatchObject({
    split: "train",
    review: {
      sourceModelId: before.models[0].id,
      sourceDatasetVersion: before.datasets[0].version,
    },
  });
  expect(after.images.filter((i) => !i.review)).toEqual(
    before.images.filter((i) => i.id !== after.images.find((i) => i.review).id),
  );
  expect(after.models).toEqual(before.models);
  expect(after.finals).toEqual(before.finals);
  expect(after.datasets[0].version).toBe(before.datasets[0].version + 1);
  await page.getByTestId("tr-round-run").click();
  await expect(page.getByTestId("tr-round-result")).toBeVisible({
    timeout: 90000,
  });
  const round = page.getByTestId("tr-round-result");
  expect(
    Number(await round.getAttribute("data-weight-change")),
  ).toBeGreaterThan(0);
  expect(
    Number(await round.getAttribute("data-after-accuracy")),
  ).toBeGreaterThanOrEqual(0);
  expect(await state(page)).toEqual(after);
  await page.getByTestId("tr-save").click();
  await expect(page.locator("#tr-status")).toContainText("Model saved");
  const savedRound = await state(page);
  expect(savedRound.models).toHaveLength(2);
  const expanded = savedRound.models.find((m) => m.id !== before.models[0].id);
  expect(expanded.trainCount).toBe(before.models[0].trainCount + 1);
  expect(expanded.experiment.validation).toEqual(
    before.models[0].experiment.validation,
  );
  expect(savedRound.images).toEqual(after.images);
  expect(savedRound.finals).toEqual(after.finals);
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByTestId("tr-model")
    .filter({ has: page.getByText(before.models[0].name, { exact: true }) })
    .getByTestId("tr-delete")
    .click();
  await expect(page.getByTestId("tr-round-result")).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("tr-round-result")).toHaveCount(0);
  const savedRow = page
    .getByTestId("tr-model")
    .filter({ has: page.locator("strong", { hasText: "Feedback —" }) });
  await savedRow.getByTestId("tr-restore").click();
  await expect(page.locator("#tr-status")).not.toContainText("no longer");
  await savedRow.getByTestId("tr-review-run").click();
  await expect(page.locator("#tr-review-status")).toContainText(
    "Review queue ready",
    { timeout: 90000 },
  );
  expect((await state(page)).images.filter((i) => i.review)).toHaveLength(1);
});

test("approval writes roll back on asynchronous failure and reject a stale source transaction", async ({
  page,
}) => {
  test.setTimeout(120000);
  await trained(page);
  await page.getByTestId("tr-review-run").click();
  await expect(page.locator("#tr-review-status")).toContainText(
    "Review queue ready",
    { timeout: 90000 },
  );
  await page
    .getByTestId("tr-review-item")
    .first()
    .getByRole("button", { name: "Accept suggestion" })
    .click();
  await page
    .getByTestId("tr-review-item")
    .nth(1)
    .getByRole("button", { name: "Accept suggestion" })
    .click();
  const before = await state(page);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    let writes = 0;
    Object.assign(window, {
      restorePromotionPut: () => {
        IDBObjectStore.prototype.put = original;
      },
    });
    IDBObjectStore.prototype.put = function (
      ...args: Parameters<typeof original>
    ) {
      if (this.name === "images" && args[0].review && ++writes === 2)
        return this.add(args[0]);
      return original.apply(this, args);
    };
  });
  await page.getByTestId("tr-review-consent").check();
  await page.getByTestId("tr-review-commit").click();
  await expect(page.locator("#tr-review-status")).toContainText(
    "could not save dataset changes",
  );
  expect(await state(page)).toEqual(before);
  await page.evaluate(() => (window as any).restorePromotionPut());
  // Another tab's version update occurs before the approval transaction takes its lock.
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const r = indexedDB.open("visual-labs-datasets");
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction("datasets", "readwrite"),
            store = tx.objectStore("datasets"),
            get = store.getAll();
          get.onsuccess = () =>
            store.put({ ...get.result[0], version: get.result[0].version + 1 });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onabort = () => reject(tx.error);
        };
      }),
  );
  const stale = await state(page);
  await page.getByTestId("tr-review-consent").check();
  await page.getByTestId("tr-review-commit").click();
  await expect(page.getByTestId("tr-review-item")).toHaveCount(0);
  expect(await state(page)).toEqual(stale);
});

test("feedback rounds cancel, background and discard stale snapshots without new cache writes", async ({
  page,
}) => {
  test.setTimeout(120000);
  await trained(page);
  await page.getByTestId("tr-review-run").click();
  await expect(page.locator("#tr-review-status")).toContainText(
    "Review queue ready",
    { timeout: 90000 },
  );
  await page
    .getByTestId("tr-review-item")
    .first()
    .getByRole("button", { name: "Accept suggestion" })
    .click();
  await page.getByTestId("tr-review-consent").check();
  await page.getByTestId("tr-review-commit").click();
  await expect(page.locator("#tr-review-status")).toContainText(
    "committed to training",
  );
  const before = await state(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/models/mobilenet_v3_small.tflite", async (route) => {
    await gate;
    await route.continue().catch(() => {});
  });
  await page.getByTestId("tr-round-run").click();
  await page.getByTestId("tr-round-cancel").click();
  await expect(page.locator("#tr-round-status")).toContainText("cancelled");
  await expect(page.getByTestId("tr-round-result")).toHaveCount(0);
  await page.getByTestId("tr-round-run").click();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator("#tr-round-status")).toContainText("cancelled");
  await page.evaluate(() =>
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    }),
  );
  expect(await state(page)).toEqual(before);
  await page.getByTestId("tr-round-run").click();
  await expect(page.locator("#tr-round-status")).toContainText(
    "Preparing round features",
  );
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const r = indexedDB.open("visual-labs-datasets");
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction("datasets", "readwrite"),
            s = tx.objectStore("datasets"),
            q = s.getAll();
          q.onsuccess = () =>
            s.put({ ...q.result[0], version: q.result[0].version + 1 });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
        };
      }),
  );
  release();
  await page.unroute("**/models/mobilenet_v3_small.tflite");
  await expect(page.getByTestId("tr-round-run")).toBeEnabled();
  await expect(page.getByTestId("tr-round-result")).toHaveCount(0);
  await expect(page.locator("#tr-round-status")).toContainText(
    /changed|edits/i,
  );
  const after = await state(page);
  expect(after.embeddings).toEqual(before.embeddings);
  expect(after.images).toEqual(before.images);
  expect(after.models).toEqual(before.models);
  expect(after.finals).toEqual(before.finals);
});
