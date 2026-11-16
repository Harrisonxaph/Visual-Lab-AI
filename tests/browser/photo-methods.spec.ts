import { test, expect, type Page } from "@playwright/test";
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
async function setup(page: Page) {
  await page.goto("/#datasets");
  await page.getByTestId("ds-example").click();
  await expect(page.locator("#ds-status")).toContainText(
    "Example dataset ready",
    { timeout: 60000 },
  );
  await page.locator("#tab-training").click();
  await expect(page.getByTestId("tr-train")).toBeEnabled();
  await page.locator("#tr-cap").fill("2");
  await page.locator("#tr-epochs").fill("3");
  await page.locator("#tr-l2").fill("0.1");
  await page.getByTestId("tr-train").click();
  await expect(page.getByTestId("tr-summary")).toBeVisible({ timeout: 90000 });
  await page.getByTestId("tr-save").click();
  await expect(page.locator("#tr-status")).toContainText("Model saved");
}
async function stored(page: Page) {
  return page.evaluate(
    () =>
      new Promise<any>((resolve, reject) => {
        const r = indexedDB.open("visual-labs-datasets");
        r.onerror = () => reject(r.error);
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction([
              "models",
              "images",
              "embeddings",
              "finalChecks",
            ]);
          const models = tx.objectStore("models").getAll(),
            images = tx.objectStore("images").getAll(),
            embeddings = tx.objectStore("embeddings").getAllKeys(),
            finals = tx.objectStore("finalChecks").getAll();
          tx.oncomplete = () => {
            const tests = new Set(
              images.result.filter((i) => i.split === "test").map((i) => i.id),
            );
            resolve({
              models: models.result.map((m) => ({
                ...m,
                weights: Array.from(m.weights),
                bias: Array.from(m.bias),
              })),
              testCached: embeddings.result.filter((id) => tests.has(id))
                .length,
              finals: finals.result,
            });
            db.close();
          };
        };
      }),
  );
}
test("fresh linear and neural models share real cached features without touching saved models or tests", async ({
  page,
}) => {
  test.setTimeout(180000);
  await setup(page);
  const before = await stored(page);
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  // Current form settings must not replace the saved source configuration.
  await page.locator("#tr-cap").fill("9");
  await page.locator("#tr-l2").fill("0.7");
  await page.getByTestId("tr-methods-run").click();
  await expect(page.locator("#tr-baseline-status")).toContainText(
    "Training-method comparison completed",
    { timeout: 90000 },
  );
  const result = page.locator("#tr-methods-result");
  await expect(result).toContainText("6 training");
  await expect(result).toContainText("L2 strength 0.1");
  await expect(result).toContainText("freshly trained");
  await expect(result).toContainText("Equal epochs are not equal compute");
  await expect(
    result.locator("#tr-methods-linear").getByTestId("metric-total"),
  ).toHaveText(String(before.models[0].validationCount));
  await expect(
    result.locator("#tr-methods-network").getByTestId("metric-total"),
  ).toHaveText(String(before.models[0].validationCount));
  const first = await result
    .locator("[data-testid=methods-measurements]")
    .textContent();
  expect(await stored(page)).toEqual(before);
  expect(requests).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByTestId("tr-methods-run").click();
  await expect(page.locator("#tr-baseline-status")).toContainText(
    "Training-method comparison completed",
    { timeout: 90000 },
  );
  expect(
    await result.locator("[data-testid=methods-measurements]").textContent(),
  ).toBe(first);
  await page.reload();
  await expect(page.locator("#tr-methods-result")).toHaveCount(0);
});
test("cancel, background, navigation and stale snapshots never publish partial training comparisons", async ({
  page,
}) => {
  test.setTimeout(180000);
  await setup(page);
  const before = await stored(page);
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:00:01Z"));
  await page.getByTestId("tr-methods-run").click();
  await page.getByTestId("tr-baseline-cancel").click();
  await page.clock.runFor(10);
  await expect(page.locator("#tr-baseline-status")).toContainText("cancelled");
  await expect(page.locator("#tr-methods-result")).toHaveCount(0);
  await page.getByTestId("tr-methods-run").click();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(10);
  await expect(page.locator("#tr-baseline-status")).toContainText("cancelled");
  await page.evaluate(() =>
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    }),
  );
  await page.getByTestId("tr-methods-run").click();
  await page.locator("#tab-detection").click();
  await page.clock.runFor(10);
  await page.locator("#tab-training").click();
  await expect(page.locator("#tr-methods-result")).toHaveCount(0);
  expect(await stored(page)).toEqual(before);
  await page.getByTestId("tr-methods-run").click();
  await expect(page.locator("#tr-baseline-status")).toContainText(
    "Training fresh softmax",
  );
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const r = indexedDB.open("visual-labs-datasets");
        r.onerror = () => reject(r.error);
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction("datasets", "readwrite"),
            store = tx.objectStore("datasets"),
            get = store.getAll();
          get.onsuccess = () => {
            const dataset = get.result[0];
            dataset.version++;
            store.put(dataset);
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onabort = () => reject(tx.error);
        };
      }),
  );
  await page.clock.runFor(100);
  await expect(page.locator("#tr-baseline-status")).toContainText(
    /dataset|version/i,
  );
  await expect(page.locator("#tr-methods-result")).toHaveCount(0);
});
