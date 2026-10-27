import { test, expect } from "@playwright/test";

// Built app under the production Content-Security-Policy: the Dataset lab must work without
// loosening the policy (thumbnails are drawn on canvases, not loaded as blob: images).
test("built Dataset lab loads the example dataset with no CSP violations", async ({
  page,
}) => {
  const violations: string[] = [];
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) =>
      console.error(`CSP-VIOLATION ${e.violatedDirective} ${e.blockedURI}`),
    );
  });
  page.on("console", (m) => {
    if (m.text().startsWith("CSP-VIOLATION")) violations.push(m.text());
  });
  page.on("dialog", (d) => d.accept());
  const response = await page.goto("/#datasets");
  expect(response?.headers()["content-security-policy"]).toContain(
    "img-src 'self'",
  );
  await page.getByTestId("ds-example").click();
  await expect(page.locator("#ds-status")).toContainText(
    "Example dataset ready",
    { timeout: 60000 },
  );
  await expect(page.getByTestId("ds-stat-line")).toContainText("61 photos");
  await expect
    .poll(() =>
      page
        .locator("#ds-grid canvas")
        .first()
        .evaluate((c: HTMLCanvasElement) =>
          c
            .getContext("2d")!
            .getImageData(0, 0, 96, 96)
            .data.some((v) => v),
        ),
    )
    .toBe(true);
  await page.getByTestId("ds-delete-all").click();
  await expect(page.locator("#ds-status")).toContainText(
    "All dataset data was deleted",
  );
  expect(violations).toEqual([]);
});

// The Training lab's encoder worker, its WASM runtime and its model file must load from this
// site under the same policy, with no new exceptions.
test("built Training lab trains on the example dataset with no CSP violations", async ({
  page,
}) => {
  test.setTimeout(180000);
  const violations: string[] = [];
  const requests: string[] = [];
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) =>
      console.error(`CSP-VIOLATION ${e.violatedDirective} ${e.blockedURI}`),
    );
  });
  page.on("console", (m) => {
    if (m.text().startsWith("CSP-VIOLATION")) violations.push(m.text());
  });
  page.on("request", (r) => requests.push(r.url()));
  page.on("dialog", (d) => d.accept());
  await page.goto("/#datasets");
  await page.getByTestId("ds-example").click();
  await expect(page.locator("#ds-status")).toContainText(
    "Example dataset ready",
    { timeout: 60000 },
  );
  await page.locator("#tab-training").click();
  await page.locator("#tr-epochs").fill("30");
  await page.getByTestId("tr-train").click();
  const summary = page.getByTestId("tr-summary");
  await expect(summary).toBeVisible({ timeout: 90000 });
  expect(
    Number(await summary.getAttribute("data-validation-after")),
  ).toBeGreaterThanOrEqual(0.9);
  expect(
    requests.some((u) => u.endsWith("/models/mobilenet_v3_small.tflite")),
  ).toBe(true);
  const origin = new URL(page.url()).origin;
  expect(
    requests.filter(
      (u) =>
        !u.startsWith(origin) &&
        !u.startsWith("blob:") &&
        !u.startsWith("data:"),
    ),
  ).toEqual([]);
  expect(violations).toEqual([]);
});
