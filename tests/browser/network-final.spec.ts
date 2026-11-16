import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
async function trained(page: Page) {
  await page.goto("/#datasets");
  await page.getByTestId("ds-example").click();
  await expect(page.locator("#ds-status")).toContainText(
    "Example dataset ready",
    { timeout: 60000 },
  );
  await page.locator("#tab-training").click();
  await expect(page.getByTestId("tr-train")).toBeEnabled();
  await page.locator("#tr-epochs").fill("2");
  await page.locator("#tr-cap").fill("2");
  await page.locator("#tr-l2").fill("0.1");
  await page.getByTestId("tr-train").click();
  await expect(page.getByTestId("tr-summary")).toBeVisible({ timeout: 90000 });
  await page.getByTestId("tr-save").click();
  await expect(page.locator("#tr-status")).toContainText("Model saved");
  await page.getByTestId("tr-methods-run").click();
  await expect(page.locator("#tr-baseline-status")).toContainText(
    "Training-method comparison completed",
    { timeout: 90000 },
  );
}
async function state(page: Page) {
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
            ]),
            models = tx.objectStore("models").getAll(),
            images = tx.objectStore("images").getAll(),
            embeddings = tx.objectStore("embeddings").getAllKeys(),
            checks = tx.objectStore("finalChecks").getAll();
          tx.oncomplete = () => {
            const tests = new Set(
              images.result.filter((i) => i.split === "test").map((i) => i.id),
            );
            resolve(
              JSON.parse(
                JSON.stringify(
                  {
                    models: models.result,
                    checks: checks.result,
                    cachedTests: embeddings.result.filter((id) => tests.has(id))
                      .length,
                  },
                  (_, value) =>
                    value instanceof Float64Array ? Array.from(value) : value,
                ),
              ),
            );
            db.close();
          };
        };
      }),
  );
}
async function chooseNetwork(page: Page) {
  const option = page.locator("#tr-final-model option[value^='network:']");
  await expect(option).toHaveCount(1, { timeout: 1000 });
  await page
    .locator("#tr-final-model")
    .selectOption((await option.getAttribute("value"))!);
}
test("only an in-session comparison can choose a network; the locked real model runs once without caching test features", async ({
  page,
}) => {
  test.setTimeout(180000);
  await trained(page);
  const download = page.waitForEvent("download");
  await page.getByTestId("tr-network-export").click();
  const file = await download,
    buffer = await readFile((await file.path())!),
    exported = JSON.parse(buffer.toString());
  await page.reload();
  await expect(page.getByTestId("tr-network-file")).toBeEnabled();
  await page.getByTestId("tr-network-file").setInputFiles({
    name: "model.json",
    mimeType: "application/json",
    buffer,
  });
  await expect(page.locator("#tr-baseline-status")).toContainText(
    "Network file checked",
  );
  await expect(
    page.locator("#tr-final-model option[value^='network:']"),
  ).toHaveCount(0);
  await page.getByTestId("tr-methods-run").click();
  await expect(page.locator("#tr-baseline-status")).toContainText(
    "Training-method comparison completed",
  );
  const before = await state(page);
  await chooseNetwork(page);
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("neural network");
    await dialog.accept();
  });
  await page.getByTestId("tr-final-run").click();
  await expect(page.locator("#tr-final-status")).toContainText(
    "Final check recorded",
    { timeout: 90000 },
  );
  const after = await state(page),
    record = after.checks[0];
  expect(after.checks).toHaveLength(1);
  expect(record.networkChoice.algorithm).toBe("tanh8-sgd-f64-l2/v1");
  for (const key of ["input", "hiddenBias", "output", "outputBias"])
    expect(record.networkChoice.network[key]).toEqual(exported.network[key]);
  expect(record.result.predicted.length).toBe(record.test.length);
  expect(Number.isFinite(record.result.loss)).toBe(true);
  expect(after.cachedTests).toBe(0);
  expect(after.models).toEqual(before.models);
  await expect(page.locator("#tr-final")).toContainText("neural network");
  await expect(page.getByTestId("tr-final-run")).toHaveCount(0);
  await page.reload();
  await expect(page.locator("#tr-final-status")).toContainText(
    "Final check recorded",
  );
  expect((await state(page)).checks).toEqual(after.checks);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("a cancelled neural choice reloads with identical durable weights and retries without retraining", async ({
  page,
}) => {
  test.setTimeout(180000);
  await trained(page);
  await chooseNetwork(page);
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  await page.route("**/models/mobilenet_v3_small.tflite", async (route) => {
    await gate;
    await route.continue().catch(() => {});
  });
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByTestId("tr-final-run").click();
  await expect
    .poll(async () => (await state(page)).checks[0]?.status)
    .toBe("locked");
  await page.getByTestId("tr-final-cancel").click();
  await expect(page.getByTestId("tr-final-run")).toBeEnabled();
  const locked = (await state(page)).checks[0];
  expect(locked.result).toBeUndefined();
  await page.reload();
  await expect(page.getByTestId("tr-final-run")).toBeEnabled();
  await expect(page.locator("#tr-final")).toContainText("neural network");
  expect((await state(page)).checks[0]).toEqual(locked);
  release();
  await page.unroute("**/models/mobilenet_v3_small.tflite");
  await page.getByTestId("tr-final-run").click();
  await expect(page.locator("#tr-final-status")).toContainText(
    "Final check recorded",
    { timeout: 90000 },
  );
  const after = await state(page);
  expect(after.checks[0].id).toBe(locked.id);
  expect(after.checks[0].modelFingerprint).toBe(locked.modelFingerprint);
  expect(after.checks[0].networkChoice).toEqual(locked.networkChoice);
  expect(after.cachedTests).toBe(0);
});
