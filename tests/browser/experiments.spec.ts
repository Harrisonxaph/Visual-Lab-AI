import { test, expect, type Page } from "@playwright/test";

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
}

async function trainAndSave(page: Page) {
  await page.getByTestId("tr-train").click();
  await expect(page.getByTestId("tr-summary")).toBeVisible({ timeout: 90000 });
  await page.getByTestId("tr-save").click();
  await expect(page.locator("#tr-status")).toContainText("Model saved");
}

async function records(page: Page) {
  return page.evaluate(
    () =>
      new Promise<any[]>((resolve, reject) => {
        const open = indexedDB.open("visual-labs-datasets");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const request = db
            .transaction("models")
            .objectStore("models")
            .getAll();
          request.onsuccess = () => {
            db.close();
            resolve(
              request.result.map((m) => ({
                ...m,
                weights: Array.from(m.weights),
                bias: Array.from(m.bias),
              })),
            );
          };
        };
      }),
  );
}

test("restoring an exact run reproduces weights and compares saved validation results", async ({
  page,
}) => {
  test.setTimeout(180000);
  await setup(page);
  await page.locator("#tr-seed").fill("42");
  await page.locator("#tr-epochs").fill("3");
  await trainAndSave(page);
  const [first] = await records(page);
  expect(first.experiment.train.length).toBe(first.trainCount);
  expect(first.experiment.validation.length).toBe(first.validationCount);

  await page.locator("#tr-seed").fill("99");
  await page.locator("#tr-lr").fill("0.1");
  await page.locator("#tr-epochs").fill("1");
  await page.getByTestId("tr-restore").click();
  await expect(page.locator("#tr-status")).toContainText(
    "Run settings restored",
  );
  await expect(page.locator("#tr-seed")).toHaveValue("42");
  await expect(page.locator("#tr-lr")).toHaveValue("0.5");
  await expect(page.locator("#tr-epochs")).toHaveValue("3");
  await trainAndSave(page);
  const saved = await records(page);
  expect(saved).toHaveLength(2);
  expect(saved[1].weights).toEqual(first.weights);
  expect(saved[1].bias).toEqual(first.bias);
  expect(saved[1].history).toEqual(first.history);
  await expect(page.locator("#tr-run-comparison-status")).toContainText(
    "Same recorded training and validation examples",
  );
  await expect(page.locator("#tr-run-comparison")).toContainText(
    "settings match",
  );
  await expect(page.locator("#tr-run-comparison")).toContainText(
    "Test photos remain sealed",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await page.reload();
  await expect(page.locator("#tr-run-comparison-status")).toContainText(
    "Same recorded",
  );
  await page.locator("#tab-datasets").click();
  await page.getByTestId("ds-delete-image").first().click();
  await expect(page.locator("#ds-status")).toContainText("Photo deleted");
  await page.locator("#tab-training").click();
  await page.getByTestId("tr-restore").first().click();
  await expect(page.locator("#tr-status")).toContainText("dataset changed");
});

test("invalid seeds are refused before encoding and changed snapshots are not comparable", async ({
  page,
}) => {
  test.setTimeout(180000);
  await setup(page);
  await page.locator("#tr-seed").fill("1.5");
  await page.getByTestId("tr-train").click();
  await expect(page.locator("#tr-status")).toContainText(
    "Seed must be a whole number",
  );
  await expect(page.getByTestId("tr-summary")).toHaveCount(0);
  await page.locator("#tr-seed").fill("0");
  await page.locator("#tr-epochs").fill("1");
  await trainAndSave(page);
  await page.locator("#tab-datasets").click();
  await page.getByTestId("ds-delete-image").first().click();
  await expect(page.locator("#ds-status")).toContainText("Photo deleted");
  await page.locator("#tab-training").click();
  await trainAndSave(page);
  await expect(page.locator("#tr-run-comparison-status")).toContainText(
    "Not comparable",
  );
  await expect(page.locator("#tr-run-comparison-status")).toContainText(
    "versions differ",
  );
  await expect(
    page.getByRole("region", { name: "Recorded run comparison" }),
  ).toHaveCount(0);
});
