import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => {
        const c = document.createElement("canvas");
        c.width = 640;
        c.height = 480;
        const ctx = c.getContext("2d")!;
        setInterval(() => {
          ctx.fillStyle = "green";
          ctx.fillRect(0, 0, 640, 480);
        }, 50);
        const stream = c.captureStream(10);
        Object.assign(window, { testStream: stream });
        return stream;
      },
    });
  });
  await page.route("**/src/inference/detector.worker.ts*", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `self.onmessage=({data})=>{if(data.type==='init')postMessage({type:'ready'});else{data.bitmap.close();postMessage({type:'result',id:data.id,inferenceMs:20,detections:[{label:'cup',score:.8,box:{x:100,y:100,width:100,height:100}}]});}};`,
    }),
  );
});
test("confirmed tracks select, thresholds preserve IDs, Resume explains new segment and Stop clears live output", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator("#start").click();
  await expect(page.locator("#track-list")).toContainText("#1");
  await page.locator("#pause").click();
  await expect(page.locator("#track-list")).toContainText("ended");
  const first = await page.locator("#track-list").textContent();
  await page.locator("#threshold").fill("1");
  await page.locator("#threshold").fill("0.05");
  expect(await page.locator("#track-list").textContent()).toBe(first);
  await page.locator("#pause").click();
  await expect(page.locator("#segment-notice")).toContainText("Resume");
  await expect(page.locator("#track-list")).toContainText("#2");
  await page.getByRole("button", { name: /Select track 2/ }).click();
  await expect(
    page.getByRole("button", { name: /Select track 2/ }),
  ).toHaveAttribute("aria-pressed", "true");
  const video = await page.locator(".stage-shell").boundingBox(),
    list = await page.locator(".track-panel").boundingBox();
  expect(list!.y).toBeGreaterThanOrEqual(video!.y + video!.height);
  expect(video!.width).toBeGreaterThan(300);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator("#clear-tracking").click();
  await expect(page.locator("#track-list")).toContainText(
    "No confirmed tracks",
  );
  expect(
    await page.evaluate(() =>
      (window as any).testStream
        .getTracks()
        .every((t: MediaStreamTrack) => t.readyState === "ended"),
    ),
  ).toBe(true);
});

test("brief loss retains ID; expiry confirms a new ID; lost boxes are not drawn", async ({
  page,
}) => {
  await page.route("**/src/inference/detector.worker.ts*", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `let n=0;self.onmessage=({data})=>{if(data.type==='init')postMessage({type:'ready'});else{n++;data.bitmap.close();const visible=n<=2||(n>=6&&n<=8)||n>=28;postMessage({type:'result',id:data.id,inferenceMs:20,detections:visible?[{label:'cup',score:.8,box:{x:100,y:100,width:100,height:100}}]:[]});}};`,
    }),
  );
  await page.goto("/");
  await page.locator("#start").click();
  await expect(page.locator("#track-list")).toContainText("#1");
  await expect(page.locator("#track-list")).toContainText("lost");
  await expect(page.locator("#track-list")).toContainText("active");
  await expect(page.locator("#track-list")).toContainText("#2");
  await page.locator("#stop").click();
  await expect(page.locator("#video-segment-notice")).toBeHidden();
  await expect(page.locator("#track-list")).not.toContainText("active");
});
