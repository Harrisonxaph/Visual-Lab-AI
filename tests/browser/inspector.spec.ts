import { test, expect } from "@playwright/test";
for (const width of [390, 768, 1440])
  test(`inspector controls, safe alternatives, chart and layout at ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(page.locator("#alternatives")).toContainText("not supplied");
    await page.locator("#category-search").fill("HAIR");
    await expect(page.locator("#category-list")).toContainText("hair drier");
    await expect(page.locator("#category-list")).not.toContainText("person");
    await page.locator("#trails").selectOption("0");
    await expect(page.locator("#trails")).toHaveValue("0");
    const a = await page.locator("#object-inspector").boundingBox(),
      b = await page.locator("#confidence-panel").boundingBox(),
      pair = await page.locator(".inspection-pair").boundingBox();
    if (width === 390) expect(b!.y).toBeGreaterThanOrEqual(a!.y + a!.height);
    else if (pair!.width >= 616) expect(b!.x).toBeGreaterThan(a!.x);
    const camera = await page.locator(".camera-panel").boundingBox(),
      video = await page.locator(".stage-shell").boundingBox(),
      list = await page.locator(".track-panel").boundingBox();
    if (width === 390)
      expect(list!.y).toBeGreaterThanOrEqual(video!.y + video!.height);
    else if (camera!.width >= 618) expect(list!.x).toBeGreaterThan(video!.x);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });

test("pagehide/pageshow keeps restored controls usable while camera stays stopped", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.dispatchEvent(
      new PageTransitionEvent("pagehide", { persisted: true }),
    );
    window.dispatchEvent(
      new PageTransitionEvent("pageshow", { persisted: true }),
    );
  });
  await expect(page.locator("#category-search")).toBeVisible();
  await page.locator("#category-search").fill("cup");
  await expect(page.locator("#category-list")).toContainText("cup");
  await expect(page.locator("#failure-text")).toBeVisible();
  await expect(page.locator("#run-benchmark")).toBeEnabled();
  await expect(page.getByTestId("lab-state")).toHaveText("Stopped");
  expect(
    await page.locator("video").evaluate((v: HTMLVideoElement) => v.srcObject),
  ).toBeNull();
});
