import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
async function setup(page: Page) {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/#datasets");
  await page.getByTestId("ds-example").click();
  await expect(page.locator("#ds-status")).toContainText(
    "Example dataset ready",
    { timeout: 60000 },
  );
  await page.locator("#tab-training").click();
  await expect(page.getByTestId("tr-train")).toBeEnabled();
  await expect(page.locator("#tr-l2")).toBeVisible();
  await page.locator("#tr-epochs").fill("3");
}
async function save(page: Page) {
  await page.getByTestId("tr-train").click();
  await expect(page.getByTestId("tr-summary")).toBeVisible({ timeout: 90000 });
  await page.getByTestId("tr-save").click();
  await expect(page.locator("#tr-status")).toContainText("Model saved");
}
async function records(page: Page) {
  return page.evaluate(
    () =>
      new Promise<any>((resolve, reject) => {
        const open = indexedDB.open("visual-labs-datasets");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result,
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
            const testIds = new Set(
              images.result.filter((i) => i.split === "test").map((i) => i.id),
            );
            resolve({
              models: models.result
                .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
                .map((m) => ({
                  ...m,
                  weights: Array.from(m.weights),
                  bias: Array.from(m.bias),
                })),
              testCached: embeddings.result.filter((id) => testIds.has(id))
                .length,
              finals: finals.result,
            });
            db.close();
          };
        };
      }),
  );
}

test("regularised runs save/restore/repeat/export and remain compatible with comparison, baseline and final checks", async ({
  page,
}) => {
  test.setTimeout(180000);
  await setup(page);
  await expect(page.locator("#tr-l2")).toHaveValue("0");
  await save(page);
  const zero = (await records(page)).models[0];
  expect(zero.settings.l2).toBeUndefined();
  expect(zero.experiment.algorithm).toBe("softmax-sgd-f64/v1");
  await page.locator("#tr-l2").fill("0.2");
  await save(page);
  const regular = (await records(page)).models[1];
  expect(regular.settings.l2).toBe(0.2);
  expect(regular.experiment.algorithm).toBe("softmax-sgd-f64-l2/v1");
  expect(regular.weights).not.toEqual(zero.weights);
  const last = regular.history.at(-1),
    penalty =
      0.1 * regular.weights.reduce((s: number, w: number) => s + w * w, 0);
  expect(last.trainObjective).toBeCloseTo(last.trainLoss + penalty, 12);
  await expect(page.locator("#tr-run-comparison-status")).toContainText(
    "Same recorded training and validation examples",
  );
  await expect(page.locator("#tr-run-comparison")).toContainText("L2 strength");
  await expect(page.locator("#tr-run-comparison")).toContainText(
    "validation loss excludes",
  );
  await page.locator("#tr-l2").fill("0.4");
  await page.getByTestId("tr-restore").nth(0).click();
  await expect(page.locator("#tr-l2")).toHaveValue("0");
  await page.getByTestId("tr-restore").nth(1).click();
  await expect(page.locator("#tr-l2")).toHaveValue("0.2");
  await save(page);
  const repeated = (await records(page)).models[2];
  expect(repeated.weights).toEqual(regular.weights);
  expect(repeated.history).toEqual(regular.history);
  const downloading = page.waitForEvent("download");
  await page.getByTestId("tr-report").nth(1).click();
  const report = JSON.parse(
    await readFile((await (await downloading).path())!, "utf8"),
  );
  expect(report.settings.l2).toBe(0.2);
  expect(report.history).toEqual(regular.history);
  await page.getByTestId("tr-baseline-run").nth(1).click();
  await expect(page.locator("#tr-baseline-status")).toContainText(
    "Comparison completed",
    { timeout: 90000 },
  );
  expect((await records(page)).testCached).toBe(0);
  await page.locator("#tr-final-model").selectOption(regular.id);
  await page.getByTestId("tr-final-run").click();
  await expect(page.locator("#tr-final-status")).toContainText(
    "Final check recorded",
    { timeout: 90000 },
  );
  await expect(page.locator("#tr-final")).toContainText("L2 strength 0.2");
  const after = await records(page);
  expect(after.finals[0].settings.l2).toBe(0.2);
  expect(after.testCached).toBe(0);
  expect(after.models[1].weights).toEqual(regular.weights);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("invalid strength is refused before encoder requests or data writes", async ({
  page,
}) => {
  await setup(page);
  const requests: string[] = [];
  page.on("request", (r) => {
    if (/\.tflite/.test(r.url())) requests.push(r.url());
  });
  for (const value of ["-0.1", "1.1", ""]) {
    await page.locator("#tr-l2").fill(value);
    await page.getByTestId("tr-train").click();
    await expect(page.locator("#tr-status")).toContainText("L2 strength");
    await expect(page.getByTestId("tr-summary")).toHaveCount(0);
  }
  const state = await records(page);
  expect(state.models).toHaveLength(0);
  expect(state.finals).toHaveLength(0);
  expect(requests).toEqual([]);
});
