import { test, expect } from "@playwright/test";
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test("same-data nonlinear comparison learns both layers without camera, encoder or model writes", async ({
  page,
}) => {
  const requests: string[] = [];
  await page.addInitScript(() => {
    (window as any).numericWrites = 0;
    (window as any).numericCameraRequests = 0;
    (window as any).numericViolations = [];
    document.addEventListener("securitypolicyviolation", (event) =>
      (window as any).numericViolations.push(event.effectiveDirective),
    );
    const add = IDBObjectStore.prototype.add,
      put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.add = function (...args) {
      (window as any).numericWrites++;
      return add.apply(this, args);
    };
    IDBObjectStore.prototype.put = function (...args) {
      (window as any).numericWrites++;
      return put.apply(this, args);
    };
    navigator.mediaDevices.getUserMedia = async () => {
      (window as any).numericCameraRequests++;
      throw new Error("Numeric lessons must not request camera");
    };
  });
  page.on("request", (request) => {
    if (/\.tflite|worker/.test(request.url())) requests.push(request.url());
  });
  await page.goto("/#training");
  await page.getByTestId("capacity-run").click();
  const result = page.getByTestId("capacity-result");
  await expect(result).toContainText("Completed", { timeout: 15000 });
  expect(
    Number(await result.getAttribute("data-network-accuracy")),
  ).toBeGreaterThanOrEqual(0.95);
  expect(
    Number(await result.getAttribute("data-linear-accuracy")),
  ).toBeLessThan(0.8);
  await expect(page.locator("#capacity-lesson")).toContainText("42");
  await expect(page.locator("#capacity-lesson")).toContainText(
    "Equal epochs are not equal compute",
  );
  const first = await result.textContent();
  await page.getByTestId("capacity-run").click();
  await expect(result).toContainText("Completed", { timeout: 15000 });
  expect(await result.textContent()).toBe(first);
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => (window as any).numericCameraRequests)).toBe(
    0,
  );
  expect(await page.evaluate(() => (window as any).numericViolations)).toEqual(
    [],
  );
  expect(await page.evaluate(() => (window as any).numericWrites)).toBe(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("cancel and leaving discard incomplete comparisons; lesson controls exclude concurrent runs", async ({
  page,
}) => {
  await page.goto("/#training");
  await expect(page.getByTestId("capacity-run")).toBeVisible();
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:00:01Z"));
  await page.getByTestId("capacity-run").click();
  await expect(page.getByTestId("lesson-run")).toBeDisabled();
  await page.getByTestId("capacity-cancel").click();
  await page.clock.runFor(10);
  await expect(page.locator("#capacity-status")).toContainText("Cancelled");
  await expect(page.getByTestId("capacity-result")).toBeEmpty();
  await page.getByTestId("capacity-run").click();
  await page.locator("#tab-detection").click();
  await page.clock.runFor(10);
  await page.locator("#tab-training").click();
  await expect(page.getByTestId("capacity-result")).toBeEmpty();
  await expect(page.locator("#capacity-status")).toContainText("leaving");
  await page.getByTestId("capacity-run").click();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(10);
  await expect(page.getByTestId("capacity-result")).toBeEmpty();
  await expect(page.locator("#capacity-status")).toContainText("leaving");
  await page.evaluate(() =>
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    }),
  );
  await page.getByTestId("lesson-run").click();
  await expect(page.getByTestId("capacity-run")).toBeDisabled();
  await page.getByTestId("lesson-cancel").click();
  await page.clock.runFor(10);
});
