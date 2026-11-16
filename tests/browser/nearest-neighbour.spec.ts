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
  await page.locator("#tr-epochs").fill("2");
  await page.getByTestId("tr-train").click();
  await expect(page.getByTestId("tr-summary")).toBeVisible({ timeout: 90000 });
  await page.getByTestId("tr-save").click();
  await expect(page.locator("#tr-status")).toContainText("Model saved");
  await expect(page.getByTestId("tr-baseline-run")).toBeVisible();
}
async function state(page: Page) {
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
            finals = tx.objectStore("finalChecks").count();
          tx.oncomplete = () => {
            const testIds = new Set(
              images.result.filter((i) => i.split === "test").map((i) => i.id),
            );
            resolve({
              models: models.result.map((m) => ({
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

test("same-embedding baseline compares measured validation results without changing weights or opening tests", async ({
  page,
}) => {
  test.setTimeout(180000);
  await setup(page);
  const before = await state(page),
    source = before.models[0];
  // Current controls must not replace the saved model's original training subset.
  await page.locator("#tr-cap").fill("9");
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.getByTestId("tr-baseline-run").click();
  await expect(page.locator("#tr-baseline-status")).toContainText(
    "Comparison completed",
    { timeout: 90000 },
  );
  await expect(
    page.locator("#tr-baseline-classifier").getByTestId("metric-total"),
  ).toHaveText(String(source.validationCount));
  await expect(
    page.locator("#tr-baseline-neighbour").getByTestId("metric-total"),
  ).toHaveText(String(source.validationCount));
  await expect(page.locator("#tr-baseline-result")).toHaveAttribute(
    "data-training-count",
    "6",
  );
  await expect(page.locator("#tr-baseline-result")).toContainText(
    "Distance is not confidence or accuracy",
  );
  expect(await state(page)).toEqual(before);
  expect(requests).toEqual([]);
  const prediction = await page
    .locator("#tr-baseline-result")
    .getAttribute("data-neighbour-predictions");
  await page.getByTestId("tr-baseline-run").click();
  await expect(page.locator("#tr-baseline-status")).toContainText(
    "Comparison completed",
  );
  await expect(page.locator("#tr-baseline-result")).toHaveAttribute(
    "data-neighbour-predictions",
    prediction!,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  page.once("dialog", (d) => d.accept());
  await page.locator("#tab-datasets").click();
  await page.getByTestId("ds-delete-image").first().click();
  await expect(page.locator("#ds-status")).toContainText("Photo deleted");
  await page.locator("#tab-training").click();
  await expect(page.locator("#tr-baseline-result")).toHaveCount(0);
  await page.getByTestId("tr-baseline-run").click();
  await expect(page.locator("#tr-baseline-status")).toContainText(
    "dataset changed",
  );
});

test("cancel and leaving stop pending baseline encoding without partial results; explicit retry recovers", async ({
  page,
}) => {
  test.setTimeout(180000);
  await setup(page);
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("visual-labs-datasets");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result,
            tx = db.transaction("embeddings", "readwrite");
          tx.objectStore("embeddings").clear();
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
        };
      }),
  );
  let release!: () => void, entered!: () => void;
  const gate = new Promise<void>((r) => {
      release = r;
    }),
    requested = new Promise<void>((r) => {
      entered = r;
    });
  await page.route("**/models/mobilenet_v3_small.tflite", async (route) => {
    entered();
    await gate;
    await route.continue().catch(() => {});
  });
  await page.getByTestId("tr-baseline-run").click();
  await requested;
  await expect(page.getByTestId("tr-train")).toBeDisabled();
  await expect(page.getByTestId("lesson-run")).toBeDisabled();
  await page.getByTestId("tr-baseline-cancel").click();
  await expect(page.getByTestId("tr-baseline-run")).toBeEnabled();
  await expect(page.locator("#tr-baseline-result")).toHaveCount(0);
  await page.getByTestId("tr-baseline-run").click();
  await expect(page.getByTestId("tr-baseline-cancel")).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByTestId("tr-baseline-run")).toBeEnabled();
  await page.evaluate(() =>
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    }),
  );
  await page.getByTestId("tr-baseline-run").click();
  await expect(page.getByTestId("tr-baseline-cancel")).toBeVisible();
  await page.locator("#tab-detection").click();
  await page.locator("#tab-training").click();
  await expect(page.getByTestId("tr-baseline-run")).toBeEnabled();
  await expect(page.locator("#tr-baseline-result")).toHaveCount(0);
  release();
  await page.unroute("**/models/mobilenet_v3_small.tflite");
  await page.getByTestId("tr-baseline-run").click();
  await expect(page.locator("#tr-baseline-status")).toContainText(
    "Comparison completed",
    { timeout: 90000 },
  );
  const after = await state(page);
  expect(after.testCached).toBe(0);
  expect(after.finals).toBe(0);
});

test("immediate startup cancellation has no unhandled rejection or late results", async ({
  page,
}) => {
  test.setTimeout(180000);
  await setup(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.evaluate(() => {
    document
      .querySelector<HTMLButtonElement>('[data-testid="tr-baseline-run"]')!
      .click();
    document
      .querySelector<HTMLButtonElement>('[data-testid="tr-baseline-cancel"]')!
      .click();
  });
  await expect(page.getByTestId("tr-baseline-run")).toBeEnabled();
  await expect(page.locator("#tr-baseline-status")).toContainText("cancelled");
  await expect(page.locator("#tr-baseline-result")).toHaveCount(0);
  expect(errors).toEqual([]);
});
