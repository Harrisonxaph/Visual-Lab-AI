import { test, expect } from "@playwright/test";

test("diagnostics are absent by default and do not replace camera API", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.assign(window, {
      originalCamera: navigator.mediaDevices.getUserMedia,
    });
  });
  await page.goto("/");
  await expect(page.locator("#camera-diagnostics")).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        navigator.mediaDevices.getUserMedia === (window as any).originalCamera,
    ),
  ).toBe(true);
});

test("diagnostics install before app with no camera call until trusted Start", async ({
  page,
}) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(new DOMException("test", "NotAllowedError"));
  });
  await page.goto("/?diag=1");
  const log = page.locator("#camera-diagnostics-log");
  await expect(log).toContainText('"event": "installed"');
  await expect(log).not.toContainText('"event": "camera-request"');
  await page.getByRole("button", { name: "Start camera", exact: true }).click();
  await expect(log).toContainText('"event": "start-click"');
  await expect(log).toContainText('"trusted": true');
  await expect(log).toContainText('"event": "camera-request"');
  await expect(log).toContainText('"active": true');
  await expect(log).toContainText('"stack":');
  await expect(log).toContainText('"outcome": "NotAllowedError"');
  await expect(page.getByRole("alert")).toContainText(
    "Camera access was denied",
  );
  await page.getByRole("button", { name: "Clear diagnostic log" }).click();
  await expect(log).toHaveText("[]");
  await page.reload();
  await expect(log).toContainText('"event": "installed"');
  await expect(log).not.toContainText('"event": "camera-request"');
});

test("diagnostics observe early non-app calls, preserve pending promise and sanitize stacks", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const pending = new Promise<MediaStream>(() => {});
    Object.assign(window, { pendingCamera: pending });
    navigator.mediaDevices.getUserMedia = function () {
      Object.assign(window, { cameraReceiver: this });
      return pending;
    };
  });
  await page.route(
    (url) => /^\/(src\/main\.ts|assets\/index-[^/]+\.js)$/.test(url.pathname),
    (route) =>
      route.fulfill({
        contentType: "text/javascript",
        body: `window.samePromise = navigator.mediaDevices.getUserMedia({video:true}) === window.pendingCamera;`,
      }),
  );
  await page.goto("/?diag=1&private=secret");
  const log = page.locator("#camera-diagnostics-log");
  await expect(log).toContainText('"event": "camera-request"');
  await expect(log).not.toContainText("private=secret");
  expect(await page.evaluate(() => (window as any).samePromise)).toBe(true);
  expect(
    await page.evaluate(
      () => (window as any).cameraReceiver === navigator.mediaDevices,
    ),
  ).toBe(true);
  await expect(log).toContainText('"sinceStartMs": null');
  await expect(log).not.toContainText('"event": "camera-settled"');
});

test("diagnostic logs are bounded and synthetic Start is identified", async ({
  page,
}) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(new DOMException("test", "NotAllowedError"));
  });
  await page.goto("/?diag=1");
  await page
    .locator("#start")
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.locator("#camera-diagnostics-log")).toContainText(
    '"trusted": false',
  );
  await page.evaluate(async () => {
    for (let i = 0; i < 110; i++) {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
      } catch {}
    }
  });
  const events = JSON.parse(
    await page.locator("#camera-diagnostics-log").innerText(),
  );
  expect(events).toHaveLength(100);
  expect(
    events.every(
      (event: any) =>
        typeof event.elapsedMs === "number" && typeof event.at === "string",
    ),
  ).toBe(true);
});
