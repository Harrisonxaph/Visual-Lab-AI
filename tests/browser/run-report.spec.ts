import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test("explicit report downloads preserve run evidence and disclose optional class names without extra inference", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.addInitScript(() => {
    const state = window as Window & { reportPolicyViolations: string[] };
    state.reportPolicyViolations = [];
    document.addEventListener("securitypolicyviolation", (event) =>
      state.reportPolicyViolations.push(event.effectiveDirective),
    );
  });
  page.on("dialog", (d) => d.accept());
  await page.goto("/#datasets");
  await page.getByTestId("ds-example").click();
  await expect(page.locator("#ds-status")).toContainText(
    "Example dataset ready",
    { timeout: 60000 },
  );
  await page.locator("#tab-training").click();
  await expect(page.getByTestId("tr-train")).toBeEnabled();
  await page.locator("#tr-epochs").fill("2");
  await page.getByTestId("tr-train").click();
  await expect(page.getByTestId("tr-summary")).toBeVisible({ timeout: 90000 });
  await page.getByTestId("tr-save").click();
  await expect(page.locator("#tr-status")).toContainText("Model saved");
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await expect(page.getByTestId("tr-report-names")).not.toBeChecked();
  await expect(page.locator("#tr-report-disclosure")).toContainText(
    "not anonymous",
  );
  expect(
    await page
      .locator("#tr-report-disclosure")
      .evaluate((node) =>
        Boolean(
          node.compareDocumentPosition(
            document.querySelector('[data-testid="tr-report"]')!,
          ) & Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      ),
  ).toBe(true);
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("tr-report").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("visual-labs-run-report.json");
  const report = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(report.schema).toBe("visual-labs.run-report/v1");
  expect(report.settings.epochs).toBe(2);
  expect(report.completedEpochs).toBe(2);
  expect(report.classes.every((c: object) => !("name" in c))).toBe(true);
  expect(report.manifest.train).toHaveLength(report.trainCount);
  expect(report.manifest.validation).toHaveLength(report.validationCount);
  expect(report.history).toHaveLength(3);
  expect(report.testResultsIncluded).toBe(false);
  expect(report.weights).toBeUndefined();
  const counts = await page.evaluate(
    () =>
      new Promise<{ models: number; testEmbedded: number }>(
        (resolve, reject) => {
          const open = indexedDB.open("visual-labs-datasets");
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const db = open.result;
            const t = db.transaction(["models", "images", "embeddings"]);
            const models = t.objectStore("models").count();
            const images = t.objectStore("images").getAll();
            const embeddings = t.objectStore("embeddings").getAllKeys();
            t.oncomplete = () => {
              const tests = new Set(
                images.result
                  .filter((i) => i.split === "test")
                  .map((i) => i.id),
              );
              resolve({
                models: models.result,
                testEmbedded: embeddings.result.filter((id) => tests.has(id))
                  .length,
              });
              db.close();
            };
          };
        },
      ),
  );
  expect(counts).toEqual({ models: 1, testEmbedded: 0 });
  await page.getByTestId("tr-report-names").check();
  const namedPromise = page.waitForEvent("download");
  await page.getByTestId("tr-report").click();
  const named = JSON.parse(
    await readFile((await (await namedPromise).path())!, "utf8"),
  );
  expect(
    named.classes.every((c: { name?: string }) => typeof c.name === "string"),
  ).toBe(true);
  expect(named.history).toEqual(report.history);
  expect(requests).toEqual([]);
  expect(
    await page.evaluate(
      () =>
        (window as Window & { reportPolicyViolations: string[] })
          .reportPolicyViolations,
    ),
  ).toEqual([]);
  // A download failure must not claim success, leave an anchor, or leak its temporary URL.
  await page.clock.install();
  await page.evaluate(() => {
    const state = window as Window & {
      reportCreatedUrl: string;
      reportRevokedUrls: string[];
    };
    state.reportRevokedUrls = [];
    const create = URL.createObjectURL.bind(URL),
      revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (blob) => (state.reportCreatedUrl = create(blob));
    URL.revokeObjectURL = (url) => {
      state.reportRevokedUrls.push(url);
      revoke(url);
    };
    HTMLAnchorElement.prototype.click = () => {
      throw new Error("Simulated blocked download");
    };
  });
  await page.getByTestId("tr-report").click();
  await expect(page.locator("#tr-status")).toContainText(
    "could not prepare the report download",
  );
  await expect(
    page.locator('a[download="visual-labs-run-report.json"]'),
  ).toHaveCount(0);
  await page.clock.runFor(30_001);
  expect(
    await page.evaluate(() => {
      const state = window as Window & {
        reportCreatedUrl: string;
        reportRevokedUrls: string[];
      };
      return state.reportRevokedUrls.includes(state.reportCreatedUrl);
    }),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
