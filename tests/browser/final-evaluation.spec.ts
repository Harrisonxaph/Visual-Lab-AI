import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

async function trained(
  page: import("@playwright/test").Page,
  twoLabels = false,
) {
  await page.goto("/#datasets");
  await page.getByTestId("ds-example").click();
  await expect(page.locator("#ds-status")).toContainText(
    "Example dataset ready",
    { timeout: 60000 },
  );
  await page.locator("#tab-training").click();
  await expect(page.getByTestId("tr-train")).toBeEnabled();
  if (twoLabels)
    await page.locator("#tr-labels input[type=checkbox]").last().uncheck();
  await page.locator("#tr-epochs").fill("2");
  await page.getByTestId("tr-train").click();
  await expect(page.getByTestId("tr-summary")).toBeVisible({ timeout: 90000 });
  await page.getByTestId("tr-save").click();
  await expect(page.locator("#tr-status")).toContainText("Model saved");
  await expect(page.locator("#tr-final-model")).toBeVisible();
  const id = await page
    .locator("#tr-final-model option")
    .nth(1)
    .getAttribute("value");
  await page.locator("#tr-final-model").selectOption(id!);
}

async function stored(page: import("@playwright/test").Page) {
  return page.evaluate(
    () =>
      new Promise<any>((resolve, reject) => {
        const open = indexedDB.open("visual-labs-datasets");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result,
            tx = db.transaction(["finalChecks", "images", "embeddings"]);
          const checks = tx.objectStore("finalChecks").getAll(),
            images = tx.objectStore("images").getAll(),
            embeddings = tx.objectStore("embeddings").getAllKeys();
          tx.oncomplete = () => {
            const tests = new Set(
              images.result.filter((i) => i.split === "test").map((i) => i.id),
            );
            resolve({
              checks: checks.result,
              tests: checks.result[0]
                ? images.result.filter(
                    (i) =>
                      i.split === "test" &&
                      checks.result[0].labelIds.includes(i.labelId),
                  ).length
                : tests.size,
              cachedTests: embeddings.result.filter((id) => tests.has(id))
                .length,
            });
            db.close();
          };
        };
      }),
  );
}

test("final evaluation requires consent, saves one complete result, never caches test embeddings and survives reload", async ({
  page,
}) => {
  test.setTimeout(180000);
  await trained(page, true);
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByTestId("tr-final-run").click();
  expect((await stored(page)).checks).toHaveLength(0);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByTestId("tr-final-run").click();
  await expect(page.locator("#tr-final-status")).toContainText(
    "Final check recorded",
    { timeout: 90000 },
  );
  const state = await stored(page);
  expect(state.checks).toHaveLength(1);
  expect(state.checks[0].status).toBe("complete");
  expect(state.checks[0].result.truth).toHaveLength(state.tests);
  expect(state.checks[0].result.predicted).toHaveLength(state.tests);
  expect(Number.isFinite(state.checks[0].result.loss)).toBe(true);
  expect(state.cachedTests).toBe(0);
  await expect(page.locator("#tr-labels tr").last()).toContainText("sealed");
  await expect(
    page.locator("#tr-final-metrics").getByTestId("metric-total"),
  ).toHaveText(String(state.tests));
  await expect(page.getByTestId("tr-final-run")).toHaveCount(0);
  await page.reload();
  await expect(page.locator("#tr-final-status")).toContainText(
    "Final check recorded",
  );
  expect((await stored(page)).checks[0]).toEqual(state.checks[0]);
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#tab-datasets").click();
  await page.getByTestId("ds-delete-image").first().click();
  await expect(page.locator("#ds-status")).toContainText("Photo deleted");
  await page.locator("#tab-training").click();
  await expect(page.locator("#tr-labels tr").nth(1)).toContainText(
    "historical check",
  );
  await expect(page.locator("#tr-labels tr").last()).toContainText("sealed");
  expect((await stored(page)).checks[0]).toEqual(state.checks[0]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("cancel, background and leaving publish no partial results; retries keep the original choice", async ({
  page,
}) => {
  test.setTimeout(180000);
  await trained(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/models/mobilenet_v3_small.tflite", async (route) => {
    await gate;
    await route.continue().catch(() => {});
  });
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByTestId("tr-final-run").click();
  await expect
    .poll(async () => (await stored(page)).checks[0]?.status)
    .toBe("locked");
  await page.getByTestId("tr-final-cancel").click();
  await expect(page.getByTestId("tr-final-run")).toBeEnabled();
  await page.getByTestId("tr-final-run").click();
  await expect(page.getByTestId("tr-final-cancel")).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByTestId("tr-final-run")).toBeEnabled();
  await page.evaluate(() =>
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    }),
  );
  await page.getByTestId("tr-final-run").click();
  await expect(page.getByTestId("tr-final-cancel")).toBeVisible();
  await page.locator("#tab-detection").click();
  await page.locator("#tab-training").click();
  await expect(page.getByTestId("tr-final-run")).toBeEnabled();
  const before = (await stored(page)).checks[0];
  expect(before.result).toBeUndefined();
  release();
  await page.unroute("**/models/mobilenet_v3_small.tflite");
  await page.getByTestId("tr-final-run").click();
  await expect(page.locator("#tr-final-status")).toContainText(
    "Final check recorded",
    { timeout: 90000 },
  );
  const after = (await stored(page)).checks[0];
  expect(after.id).toBe(before.id);
  expect(after.modelId).toBe(before.modelId);
  expect(after.modelFingerprint).toBe(before.modelFingerprint);
  expect((await stored(page)).cachedTests).toBe(0);
});
