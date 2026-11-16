import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
async function open(page: import("@playwright/test").Page) {
  await page.goto("/#datasets");
  await page.getByTestId("ds-example").click();
  await expect(page.locator("#ds-status")).toContainText(
    "Example dataset ready",
    { timeout: 60000 },
  );
  await page.locator("#tab-training").click();
  await expect(page.getByTestId("tr-acquisition-run")).toBeEnabled();
}
test("generated real-encoder acquisition compares equal budgets without reading private blobs or changing storage", async ({
  page,
}) => {
  test.setTimeout(120000);
  const violations: string[] = [],
    offsite: string[] = [];
  await page.addInitScript(() => {
    Object.assign(window, { acquisitionCsp: [], acquisitionCameraCalls: 0 });
    document.addEventListener("securitypolicyviolation", (e) =>
      (window as any).acquisitionCsp.push(e.violatedDirective),
    );
    navigator.mediaDevices.getUserMedia = async () => {
      (window as any).acquisitionCameraCalls++;
      throw Error("camera must not be used");
    };
  });
  page.on("request", (r) => {
    if (
      !r.url().startsWith("http://localhost:5173") &&
      !r.url().startsWith("blob:")
    )
      offsite.push(r.url());
  });
  await open(page);
  const storedHashes = await page.evaluate(
    () =>
      new Promise<string[]>((resolve) => {
        const r = indexedDB.open("visual-labs-datasets");
        r.onsuccess = () => {
          const db = r.result,
            q = db.transaction("images").objectStore("images").getAll();
          q.onsuccess = () => {
            const hashes = q.result.map((i) => i.sha256);
            db.close();
            resolve(hashes);
          };
        };
      }),
  );
  await page.evaluate(() => {
    const get = IDBObjectStore.prototype.get;
    IDBObjectStore.prototype.get = function (...args: Parameters<typeof get>) {
      if (this.name === "blobs") throw Error("private blob access forbidden");
      return get.apply(this, args);
    };
    IDBObjectStore.prototype.put = function () {
      throw Error("experiment must not write storage");
    };
    IDBObjectStore.prototype.delete = function () {
      throw Error("experiment must not delete storage");
    };
    IDBObjectStore.prototype.add = function () {
      throw Error("experiment must not add storage");
    };
    IDBObjectStore.prototype.clear = function () {
      throw Error("experiment must not clear storage");
    };
    const all = IDBObjectStore.prototype.getAll;
    IDBObjectStore.prototype.getAll = function (
      ...args: Parameters<typeof all>
    ) {
      if (this.name === "blobs")
        throw Error("private blob enumeration forbidden");
      return all.apply(this, args);
    };
    const cursor = IDBObjectStore.prototype.openCursor;
    IDBObjectStore.prototype.openCursor = function (
      ...args: Parameters<typeof cursor>
    ) {
      if (this.name === "blobs") throw Error("private blob cursor forbidden");
      return cursor.apply(this, args);
    };
  });
  await page.getByTestId("tr-acquisition-run").click();
  await expect(page.getByTestId("tr-acquisition-result")).toBeVisible({
    timeout: 90000,
  });
  const result = page.getByTestId("tr-acquisition-result");
  expect(
    Number(await result.getAttribute("data-uncertainty-accuracy")),
  ).toBeGreaterThanOrEqual(0);
  expect(
    Number(await result.getAttribute("data-random-accuracy")),
  ).toBeLessThanOrEqual(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const file = page.waitForEvent("download");
  await page.getByTestId("tr-acquisition-export").click();
  const download = await file,
    report = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(report.schema).toBe("visual-labs.generated-acquisition/v1");
  expect(report.experiment.budget).toBe(6);
  expect(report.experiment.uncertainty.selected).toHaveLength(6);
  expect(report.experiment.random.selected).toHaveLength(6);
  expect(report.experiment.uncertainty.trainingOrder).toHaveLength(12);
  expect(report.experiment.random.trainingOrder).toHaveLength(12);
  expect(report.experiment.validation).toHaveLength(12);
  expect(
    [
      ...report.experiment.validation,
      ...report.experiment.pool,
      ...report.experiment.initialExamples,
    ].some((r) => storedHashes.includes(r.sha256)),
  ).toBe(false);
  console.log(
    "GENERATED_ACQUISITION",
    JSON.stringify({
      before: report.experiment.before,
      uncertainty: report.experiment.uncertainty,
      random: report.experiment.random,
      overlap: report.experiment.overlap,
      pool: report.experiment.pool.length,
      excluded: report.experiment.excluded,
    }),
  );
  expect(JSON.stringify(report)).not.toMatch(
    /"weights"|"bias"|"image"|"vector"/,
  );
  expect(await page.evaluate(() => (window as any).acquisitionCsp)).toEqual(
    violations,
  );
  expect(offsite).toEqual([]);
  expect(
    await page.evaluate(() => (window as any).acquisitionCameraCalls),
  ).toBe(0);
  await page.reload();
  await expect(page.getByTestId("tr-acquisition-result")).toHaveCount(0);
});
test("cancel and background stop generated encoding without publishing a partial report", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/#training");
  await expect(page.getByTestId("tr-acquisition-run")).toBeEnabled();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/models/mobilenet_v3_small.tflite", async (route) => {
    await gate;
    await route.continue().catch(() => {});
  });
  await page.getByTestId("tr-acquisition-run").click();
  await page.getByTestId("tr-acquisition-cancel").click();
  await expect(page.locator("#tr-acquisition-status")).toContainText(
    "cancelled",
  );
  await page.getByTestId("tr-acquisition-run").click();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator("#tr-acquisition-status")).toContainText(
    "cancelled",
  );
  release();
  await expect(page.getByTestId("tr-acquisition-result")).toHaveCount(0);
});
