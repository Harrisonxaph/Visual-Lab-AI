import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test("the numeric lesson really trains without camera, encoder, or saved user data", async ({
  page,
}) => {
  const requests: string[] = [];
  await page.addInitScript(() => {
    const observed = window as Window & { lessonCameraRequests: number };
    observed.lessonCameraRequests = 0;
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => {
        observed.lessonCameraRequests++;
        throw new Error("The lesson must not request a camera");
      },
    });
  });
  page.on("request", (r) => {
    if (/\.tflite|embedder\.worker/.test(r.url())) requests.push(r.url());
  });
  await page.goto("/#training");
  await expect(page.locator("#tr-data")).toBeVisible();
  await page.locator("#lesson-scenario").selectOption("overfitting");
  await page.getByTestId("lesson-run").click();
  const result = page.getByTestId("lesson-summary");
  await expect(result).toContainText("Completed", { timeout: 15000 });
  expect(
    Number(await result.getAttribute("data-train-accuracy")),
  ).toBeGreaterThanOrEqual(0.95);
  expect(
    Number(await result.getAttribute("data-validation-accuracy")),
  ).toBeLessThan(0.6);
  await expect(page.locator("#tr-lessons")).toContainText(
    "Synthetic numeric features",
  );
  await expect(page.locator("#lesson-loss-chart")).toHaveAttribute(
    "aria-label",
    /150 epochs/,
  );
  expect(requests).toEqual([]);
  expect(
    await page.evaluate(
      () =>
        (window as Window & { lessonCameraRequests: number })
          .lessonCameraRequests,
    ),
  ).toBe(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const stored = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const r = indexedDB.open("visual-labs-datasets");
        r.onsuccess = () => {
          const db = r.result;
          const q = db.transaction("models").objectStore("models").count();
          q.onsuccess = () => {
            db.close();
            resolve(q.result);
          };
        };
      }),
  );
  expect(stored).toBe(0);
});

test("cancel and leaving the lab stop a lesson without late completed results", async ({
  page,
}) => {
  await page.goto("/#training");
  await expect(page.locator("#tr-data")).toBeVisible();
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:00:01Z"));
  await page.locator("#lesson-scenario").selectOption("overfitting");
  await page.getByTestId("lesson-run").click();
  await page.clock.runFor(4);
  await page.getByTestId("lesson-cancel").click();
  await page.clock.runFor(1);
  await expect(page.getByTestId("lesson-summary")).toContainText(
    "Stopped early",
  );
  await expect(page.getByTestId("lesson-summary")).toHaveAttribute(
    "data-stopped-early",
    "true",
  );
  await page.getByTestId("lesson-run").click();
  await page.clock.runFor(1);
  await page.locator("#tab-detection").click();
  await page.clock.runFor(5);
  await page.locator("#tab-training").click();
  await expect(page.locator("#lesson-status")).toContainText(
    "Stopped when leaving",
  );
  await expect(page.getByTestId("lesson-summary")).toBeEmpty();
  await expect(page.getByTestId("lesson-run")).toBeEnabled();
});

test("photo jobs and lessons cannot run together, and hidden lessons discard pending results", async ({
  page,
}) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/#datasets");
  await page.getByTestId("ds-example").click();
  await expect(page.locator("#ds-status")).toContainText(
    "Example dataset ready",
    { timeout: 60000 },
  );
  await page.locator("#tab-training").click();
  await expect(page.getByTestId("tr-train")).toBeEnabled();
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:00:01Z"));
  await page.getByTestId("lesson-run").click();
  await expect(page.getByTestId("tr-train")).toBeDisabled();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(5);
  await expect(page.getByTestId("lesson-summary")).toBeEmpty();
  await expect(page.locator("#lesson-status")).toContainText(
    "Stopped when leaving",
  );
  await expect(page.getByTestId("tr-train")).toBeEnabled();
  await page.evaluate(() =>
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    }),
  );
  await page.getByTestId("tr-train").click();
  await expect(page.getByTestId("lesson-run")).toBeDisabled();
  await page.getByTestId("tr-cancel").click();
  await page.clock.runFor(5);
  await expect(page.getByTestId("lesson-run")).toBeEnabled({ timeout: 30000 });
});
