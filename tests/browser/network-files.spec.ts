import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
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
async function snapshot(page: Page) {
  return page.evaluate(
    () =>
      new Promise<any>((resolve) => {
        const r = indexedDB.open("visual-labs-datasets");
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction([
              "models",
              "embeddings",
              "images",
              "finalChecks",
            ]),
            models = tx.objectStore("models").getAll(),
            e = tx.objectStore("embeddings").getAllKeys(),
            images = tx.objectStore("images").getAll(),
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
              cached: e.result,
              testCached: e.result.filter((id) => tests.has(id)),
              finals: finals.result,
            });
            db.close();
          };
        };
      }),
  );
}
async function download(page: Page) {
  await expect(page.getByTestId("tr-network-export")).toBeVisible({
    timeout: 1000,
  });
  const pending = page.waitForEvent("download");
  await page.getByTestId("tr-network-export").click();
  const saved = await pending;
  return {
    name: saved.suggestedFilename(),
    mimeType: "application/json",
    buffer: await readFile((await saved.path())!),
  };
}
test("neural file export/reload preserves measured validation, source storage and sealed test data", async ({
  page,
}) => {
  test.setTimeout(120000);
  await setup(page);
  const before = await snapshot(page),
    tables = await page.locator("#tr-methods-network table").allTextContents();
  const file = await download(page),
    parsed = JSON.parse(file.buffer.toString());
  expect(parsed.schema).toBe("visual-labs.network-model/v1");
  expect(parsed.classes.every((c) => c.name === undefined)).toBe(true);
  expect(parsed.network.input).toHaveLength(8192);
  expect(parsed).not.toHaveProperty("images");
  await page.getByTestId("tr-network-export-names").check();
  const named = JSON.parse((await download(page)).buffer.toString());
  expect(named.classes.every((c) => typeof c.name === "string")).toBe(true);
  await page.reload();
  await expect(page.getByTestId("tr-network-file")).toBeEnabled();
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.url().startsWith("http")) requests.push(r.url());
  });
  await page.getByTestId("tr-network-file").setInputFiles(file);
  await expect(page.locator("#tr-baseline-status")).toContainText(
    "Network file checked",
    { timeout: 90000 },
  );
  expect(
    await page.locator("#tr-network-metrics table").allTextContents(),
  ).toEqual(tables);
  await expect(page.locator("#tr-network-loaded")).toContainText(
    "not independently verified",
  );
  expect(requests).toEqual([]);
  expect(await snapshot(page)).toEqual(before);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
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
        };
      }),
  );
  await page.reload();
  await expect(page.getByTestId("tr-network-file")).toBeEnabled();
  await page.getByTestId("tr-network-file").setInputFiles(file);
  await expect(page.locator("#tr-baseline-status")).toContainText(
    "Network file checked",
  );
  await expect(page.locator("#tr-network-loaded")).toContainText(
    "dataset has changed",
  );
  await expect(page.locator("#tr-network-loaded")).toBeVisible();
  await page.getByTestId("tr-network-clear").click();
  await expect(page.locator("#tr-network-loaded")).toHaveCount(0);
});
test("invalid and incompatible files fail before encoding; cancelled file reads publish nothing", async ({
  page,
}) => {
  test.setTimeout(120000);
  await setup(page);
  const file = await download(page),
    before = await snapshot(page),
    bad = JSON.parse(file.buffer.toString());
  bad.encoderKey = "different encoder";
  const requests: string[] = [];
  page.on("request", (r) => {
    if (/\.tflite|worker/.test(r.url())) requests.push(r.url());
  });
  for (const [buffer, word] of [
    [Buffer.from("{}"), "valid"],
    [Buffer.from(JSON.stringify(bad)), "encoder"],
    [Buffer.alloc(1024 * 1024 + 1, 32), "large"],
  ] as const) {
    await page.getByTestId("tr-network-file").setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer,
    });
    await expect(page.locator("#tr-baseline-status")).toContainText(word);
    await expect(page.getByTestId("tr-network-file")).toBeEnabled();
    await expect(page.locator("#tr-network-loaded")).toHaveCount(0);
  }
  await page.evaluate(() => {
    const original = File.prototype.text;
    File.prototype.text = function () {
      return new Promise<string>((resolve) => {
        (window as any).releaseNetworkText = async () =>
          resolve(await original.call(this));
      });
    };
  });
  await page.getByTestId("tr-network-file").setInputFiles(file);
  await page.getByTestId("tr-baseline-cancel").click();
  await page.evaluate(() => (window as any).releaseNetworkText());
  await expect(page.locator("#tr-baseline-status")).toContainText("cancelled");
  await expect(page.getByTestId("tr-network-file")).toBeEnabled();
  await expect(page.locator("#tr-network-loaded")).toHaveCount(0);
  await page.getByTestId("tr-network-file").setInputFiles(file);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.evaluate(() => (window as any).releaseNetworkText());
  await expect(page.locator("#tr-baseline-status")).toContainText("cancelled");
  await expect(page.locator("#tr-network-loaded")).toHaveCount(0);
  expect(requests).toEqual([]);
  expect(await snapshot(page)).toEqual(before);
});
