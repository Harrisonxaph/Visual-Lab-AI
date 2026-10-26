import { test, expect } from "@playwright/test";
test("built UI profiles without camera or writes and explains unavailable long-task observation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).profileCameraCalls = 0;
    (window as any).profileWrites = [];
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: () => {
        (window as any).profileCameraCalls++;
        return Promise.reject(new Error("No camera expected"));
      },
    });
    Object.defineProperty(window, "PerformanceObserver", { value: undefined });
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      (window as any).profileWrites.push(k);
      return set.call(this, k, v);
    };
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("button", {
      name: "Stress profile (synthetic, no camera)",
      exact: true,
    })
    .click();
  await expect(page.locator("#benchmark-status")).toHaveText(
    "Completed synthetic stress profile.",
    { timeout: 30000 },
  );
  await expect(page.locator("#stress-profile-summary")).toContainText(
    "Long-task observation unavailable",
  );
  await expect(page.locator("#stress-profile-summary table")).toContainText(
    "Extra Tracker.snapshot copy",
  );
  const report = JSON.parse(
    await page.locator("#benchmark-results").innerText(),
  );
  expect(report.observedLongTasks.supported).toBe(false);
  expect(report.liveTracks).toBe(100);
  expect(report.samples).toBe(50);
  expect(await page.evaluate(() => (window as any).profileCameraCalls)).toBe(0);
  expect(await page.evaluate(() => (window as any).profileWrites)).toEqual([]);
  expect(
    await page.locator("video").evaluate((v: HTMLVideoElement) => v.srcObject),
  ).toBeNull();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("coarse clock renders whole milliseconds and inconclusive budget verdict", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    let clock = 0;
    Object.defineProperty(performance, "now", { value: () => (clock += 8) });
  });
  await page.locator("#run-stress-profile").click();
  await expect(page.locator("#benchmark-status")).toHaveText(
    "Completed synthetic stress profile.",
    { timeout: 30000 },
  );
  const report = JSON.parse(
    await page.locator("#benchmark-results").innerText(),
  );
  expect(report.clockStepMs).toBe(8);
  expect(report.updateIncludingReturnCopy.p95).toBe(8);
  expect(report.budgetResult).toBe("inconclusive");
  await expect(page.locator("#stress-profile-summary")).toContainText(
    "Inconclusive against the 8 ms",
  );
  const cells = await page
    .locator("#stress-profile-summary td")
    .allTextContents();
  expect(cells).toEqual(["8", "8", "8", "8", "8", "8", "16", "16", "16"]);
});
