import { test, expect, type Page } from "@playwright/test";

// Controlled camera and worker isolate UI/overlay behaviour. This is not real-camera inference.
test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  hasTouch: true,
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const workers: Worker[] = [];
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        workers.push(this);
      }
    };
    Object.assign(window, {
      m1Mode: (mode: string) =>
        workers.forEach((w) => w.postMessage({ type: "fixtureMode", mode })),
    });
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => {
        const input = document.createElement("canvas");
        input.width = 640;
        input.height = 480;
        const context = input.getContext("2d")!;
        let n = 0;
        const paint = () => {
          context.fillStyle = ++n % 2 ? "#102030" : "#112030";
          context.fillRect(0, 0, input.width, input.height);
        };
        paint();
        const timer = setInterval(paint, 50);
        const stream = input.captureStream(10);
        Object.assign(window, { m1Input: input, m1Stream: stream });
        stream
          .getTracks()[0]
          .addEventListener("ended", () => clearInterval(timer));
        return stream;
      },
    });
  });
  await page.route("**/src/inference/detector.worker.ts*", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `let mode='visible'; self.onmessage=({data})=>{
      if(data.type==='fixtureMode'){mode=data.mode;return;}
      if(data.type==='init'){postMessage({type:'ready'});return;}
      const {width,height}=data.bitmap; data.bitmap.close();
      const detections=mode==='empty'?[]:Array.from({length:6},(_,i)=>({
        label:'cup',score:.8,box:{x:width*(.05+.3*(i%3)),y:height*(.15+.45*Math.floor(i/3)),width:width*.2,height:height*.2}
      }));
      postMessage({type:'result',id:data.id,inferenceMs:20,detections});
    };`,
    }),
  );
});

async function open(page: Page) {
  await page.goto("/");
  await page.locator("#start").click();
  await expect(page.getByTestId("detection-count")).toHaveText("6");
  await expect(page.locator("#track-list button")).toHaveCount(6);
}

async function ink(page: Page) {
  return page
    .locator(".video-stage canvas")
    .evaluate((c: HTMLCanvasElement) => {
      const context = c.getContext("2d");
      return context
        ? context
            .getImageData(0, 0, c.width, c.height)
            .data.some((v) => v !== 0)
        : false;
    });
}

async function compositedBorders(page: Page) {
  const png = await page.locator(".video-stage").screenshot();
  return page.evaluate(async (bytes) => {
    const image = await createImageBitmap(
      new Blob([new Uint8Array(bytes)], { type: "image/png" }),
    );
    const c = document.createElement("canvas");
    c.width = image.width;
    c.height = image.height;
    const context = c.getContext("2d")!;
    context.drawImage(image, 0, 0);
    image.close();
    // Each known box's left border, away from labels/corners and outside any UI decorations.
    return Array.from({ length: 6 }, (_, i) => {
      const x = Math.round(c.width * (0.05 + 0.3 * (i % 3)));
      const y = Math.round(c.height * (0.25 + 0.45 * Math.floor(i / 3)));
      const p = context.getImageData(
        Math.max(0, x - 4),
        Math.max(0, y - 4),
        9,
        9,
      ).data;
      for (let j = 0; j < p.length; j += 4) {
        const normal =
          p[j] > 160 &&
          p[j] < 230 &&
          p[j + 1] > 210 &&
          p[j + 2] > 80 &&
          p[j + 2] < 190;
        const selected = p[j] > 235 && p[j + 1] > 235 && p[j + 2] > 235;
        if (normal || selected) return true;
      }
      return false;
    });
  }, Array.from(png));
}

test("six current detections remain painted after selection, trails, scrolling and geometry/lifecycle changes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  await page.getByRole("button", { name: /Select track 1,/ }).click();
  await expect(page.locator("#inspector-content")).toContainText("Track #1");
  await expect(page.locator("#confidence-summary")).toContainText(
    "Raw confidence",
  );
  // Observe time-window pruning without assuming the FPS cap is an attained cadence.
  const firstTime = async () =>
    Number(
      /([\d.]+) ms:/.exec(
        await page.locator("#confidence-summary").innerText(),
      )?.[1],
    );
  const initialTime = await firstTime();
  expect(Number.isFinite(initialTime)).toBe(true);
  await expect.poll(firstTime, { timeout: 35000 }).toBeGreaterThan(initialTime);
  const samples = (await page.locator("#confidence-summary").innerText()).split(
    "; ",
  ).length;
  expect(samples).toBeGreaterThan(1);
  expect(samples).toBeLessThanOrEqual(200);
  for (const duration of ["0", "2", "5", "10"]) {
    await page.locator("#trails").selectOption(duration);
    await page.locator("#synthetic-benchmark").scrollIntoViewIfNeeded();
    await page.locator(".video-stage").scrollIntoViewIfNeeded();
    expect(await ink(page)).toBe(true);
    expect(await compositedBorders(page)).toEqual(Array(6).fill(true));
  }
  const stage = await page.locator(".video-stage").boundingBox();
  await page
    .locator(".video-stage")
    .tap({ position: { x: stage!.width * 0.15, y: stage!.height * 0.25 } });
  await expect(page.locator("#inspector-content")).toContainText("Track #1");
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.getByTestId("detection-count")).toHaveText("6");
  expect(await compositedBorders(page)).toEqual(Array(6).fill(true));
  await page.evaluate(() => {
    const c = (window as any).m1Input;
    c.width = 360;
    c.height = 640;
  });
  await expect
    .poll(() =>
      page.locator("video").evaluate((v: HTMLVideoElement) => v.videoWidth),
    )
    .toBe(360);
  await expect(page.getByTestId("detection-count")).toHaveText("6");
  await expect(page.locator("#segment-chip")).toContainText("Segment 2");
  expect(await compositedBorders(page)).toEqual(Array(6).fill(true));
  await page.locator("#pause").click();
  expect(await ink(page)).toBe(false);
  await page.locator("#pause").click();
  await expect(page.getByTestId("detection-count")).toHaveText("6");
  expect(await compositedBorders(page)).toEqual(Array(6).fill(true));
  await page.locator("#stop").click();
  expect(await ink(page)).toBe(false);
  expect(errors).toEqual([]);
});

test("six retained tracks coexist with LIVE INPUT and zero visible boxes during loss or display filtering", async ({
  page,
}) => {
  await open(page);
  const first = page.getByRole("button", { name: /Select track 1,/ });
  await page.evaluate(() => (window as any).m1Mode("empty"));
  await expect(page.getByTestId("detection-count")).toHaveText("0");
  expect(await ink(page)).toBe(false);
  await page.evaluate(() => (window as any).m1Mode("visible"));
  await expect(first).toContainText("active");
  await expect(page.locator("#track-list button")).toHaveCount(6);
  await page.evaluate(() => (window as any).m1Mode("empty"));
  await expect(first).toContainText("ended", { timeout: 6000 });
  await expect(page.locator("#frame-label")).toContainText("LIVE INPUT");
  await expect(page.getByTestId("detection-count")).toHaveText("0");
  await expect(page.locator("#track-list button")).toHaveCount(6);
  expect(await ink(page)).toBe(false);
  await page.evaluate(() => (window as any).m1Mode("visible"));
  await expect(
    page.getByRole("button", { name: /Select track 7,/ }),
  ).toContainText("active");
  await expect(page.getByTestId("detection-count")).toHaveText("6");
  expect(await compositedBorders(page)).toEqual(Array(6).fill(true));
  await page.locator("#threshold").fill("1");
  await expect(page.getByTestId("detection-count")).toHaveText("0");
  await expect(page.locator("#frame-label")).toContainText("LIVE INPUT");
  expect(await ink(page)).toBe(false);
  await page.locator("#threshold").fill("0.05");
  await expect(page.getByTestId("detection-count")).toHaveText("6");
  await expect(
    page.getByRole("button", { name: /Select track 7,/ }),
  ).toContainText("active");
  expect(await compositedBorders(page)).toEqual(Array(6).fill(true));
  await page.locator("#stop").click();
});

// Diagnostic lookalike only; this is not a requirement to preserve silent failure handling.
test("forced overlay-context unavailability can mimic positive count without painted boxes; not a device reproduction", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args: any[]) {
      if (this.getAttribute("aria-label") === "Object detection bounding boxes")
        return null;
      return (original as any).apply(this, args);
    } as typeof original;
  });
  await open(page);
  await expect(page.getByTestId("lab-state")).toHaveText("Running");
  await expect(page.locator("#frame-label")).toContainText("LIVE INPUT");
  expect(await ink(page)).toBe(false);
  expect(await compositedBorders(page)).toEqual(Array(6).fill(false));
  await page.locator("#stop").click();
});
