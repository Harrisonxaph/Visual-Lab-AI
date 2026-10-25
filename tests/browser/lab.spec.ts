import { test, expect, type Page } from "@playwright/test";
async function camera(page: Page, denied = false) {
  await page.addInitScript((deny) => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => {
        if (deny) throw new DOMException("Denied", "NotAllowedError");
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 480;
        Object.assign(window, { __labCameraTest: canvas });
        const context = canvas.getContext("2d")!;
        const draw = () => {
          context.fillStyle = "#243b36";
          context.fillRect(0, 0, 640, 480);
          context.fillStyle = "#b8ef7a";
          context.fillRect(100 + (Date.now() % 50), 100, 100, 100);
        };
        draw();
        setInterval(draw, 50);
        const stream = canvas.captureStream(10);
        Object.assign(window, { __labStreamTest: stream });
        return stream;
      },
    });
  }, denied);
}
async function model(page: Page, empty = false, failure = false) {
  await page.route("**/src/inference/detector.worker.ts*", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `
    self.onmessage=({data})=>{
      if(data.type==='init') postMessage(${failure ? "{type:'error',message:'Model loading failed'}" : "{type:'ready'}"});
      else { data.bitmap.close();postMessage({type:'result',id:data.id,inferenceMs:25,detections:${empty ? "[]" : "[{label:'cup',score:0.8,box:{x:100,y:100,width:100,height:100}},{label:'bottle',score:0.5,box:{x:300,y:100,width:80,height:200}}]"}}); }
    };`,
    }),
  );
}
test("lab starts, filters results immediately, pauses, resumes and releases camera", async ({
  page,
}) => {
  await camera(page);
  await model(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Start camera", exact: true }).click();
  await expect(page.getByTestId("lab-state")).toHaveText("Running");
  await expect(page.getByTestId("detection-count")).toHaveText("2");
  await page.getByRole("slider", { name: "Confidence threshold" }).fill("0.8");
  await expect(page.getByTestId("detection-count")).toHaveText("1");
  await expect(page.getByTestId("detections")).toContainText("cup");
  await expect(page.getByTestId("detections")).not.toContainText("bottle");
  await page
    .getByRole("button", { name: "Pause inference", exact: true })
    .click();
  await expect(page.getByTestId("lab-state")).toHaveText("Paused");
  await expect(page.getByTestId("detections")).toContainText(
    "Resume inference",
  );
  await page
    .getByRole("button", { name: "Resume inference", exact: true })
    .click();
  await expect(page.getByTestId("detection-count")).toHaveText("1");
  const ratio = await page.locator(".video-stage").evaluate((el) => {
    const v = el.querySelector("video")!;
    const c = el.querySelector("canvas")!;
    const vr = v.getBoundingClientRect(),
      cr = c.getBoundingClientRect();
    return {
      delta: Math.abs(vr.width - cr.width) + Math.abs(vr.height - cr.height),
      ratio: c.width / c.height,
    };
  });
  expect(ratio.delta).toBeLessThan(1);
  expect(ratio.ratio).toBeCloseTo(4 / 3);
  await page.getByRole("button", { name: "Stop camera", exact: true }).click();
  await expect(page.getByTestId("lab-state")).toHaveText("Stopped");
  expect(
    await page.locator("video").evaluate((v: HTMLVideoElement) => v.srcObject),
  ).toBeNull();
});
test("permission rejection explains how to recover", async ({ page }) => {
  await camera(page, true);
  await page.goto("/");
  await page.getByRole("button", { name: "Start camera", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Camera access was denied",
  );
  await expect(
    page.getByRole("button", { name: "Start camera", exact: true }),
  ).toBeEnabled();
});
test("model failure releases camera and allows retry", async ({ page }) => {
  await camera(page);
  await model(page, false, true);
  await page.goto("/");
  await page.getByRole("button", { name: "Start camera", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Model loading failed");
  expect(
    await page.locator("video").evaluate((v: HTMLVideoElement) => v.srcObject),
  ).toBeNull();
  await page.unroute("**/src/inference/detector.worker.ts*");
  await model(page);
  await page.getByRole("button", { name: "Start camera", exact: true }).click();
  await expect(page.getByTestId("lab-state")).toHaveText("Running");
});
test("empty output is an observation, not a fabricated detection", async ({
  page,
}) => {
  await camera(page);
  await model(page, true);
  await page.goto("/");
  await page.getByRole("button", { name: "Start camera", exact: true }).click();
  await expect(page.getByTestId("lab-state")).toHaveText("Running");
  await expect(page.getByTestId("detections")).toContainText(
    "No objects above this threshold",
  );
});
test("unsupported worker fails gracefully before requesting a camera", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "Worker", { value: undefined });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Start camera", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("worker");
});
for (const width of [390, 768, 1440])
  test(`responsive layout and touch controls at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const name of ["Start camera", "Pause inference", "Stop camera"]) {
      const box = await page
        .getByRole("button", { name, exact: true })
        .boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    await page.screenshot({
      path: `test-results/lab-${width}.png`,
      fullPage: true,
    });
  });
test("blocked storage does not prevent startup", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("Storage blocked");
    };
    Storage.prototype.setItem = () => {
      throw new Error("Storage blocked");
    };
  });
  await camera(page);
  await model(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Start camera", exact: true }).click();
  await expect(page.getByTestId("lab-state")).toHaveText("Running");
});

test("backgrounding pauses inference without automatically resuming", async ({
  page,
}) => {
  await camera(page);
  await model(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Start camera", exact: true }).click();
  await expect(page.getByTestId("lab-state")).toHaveText("Running");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      value: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByTestId("lab-state")).toHaveText("Paused");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      value: false,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByTestId("lab-state")).toHaveText("Paused");
});
test("camera track ending externally stops the session", async ({ page }) => {
  await camera(page);
  await model(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Start camera", exact: true }).click();
  await expect(page.getByTestId("lab-state")).toHaveText("Running");
  await page.locator("video").evaluate((v: HTMLVideoElement) => {
    const stream = v.srcObject as MediaStream;
    stream.getTracks()[0].dispatchEvent(new Event("ended"));
  });
  await expect(page.getByTestId("lab-state")).toHaveText("Stopped");
  await expect(page.locator("#session-message")).toContainText(
    "Camera connection ended",
  );
});

test("an actual model asset download failure gives initialization guidance and explicit retry releases camera", async ({
  page,
}) => {
  await camera(page);
  await page.route("**/models/efficientdet_lite0.tflite", (route) =>
    route.abort("failed"),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Start camera", exact: true }).click();
  await expect(page.getByTestId("lab-state")).toHaveText("Error", {
    timeout: 30000,
  });
  await expect(page.getByRole("alert")).toContainText("Check your connection");
  expect(
    await page.locator("video").evaluate((v: HTMLVideoElement) => v.srcObject),
  ).toBeNull();
  expect(
    await page.evaluate(() =>
      (window as any).__labStreamTest
        .getTracks()
        .every((track: MediaStreamTrack) => track.readyState === "ended"),
    ),
  ).toBe(true);
  await page.unroute("**/models/efficientdet_lite0.tflite");
  await expect(page.getByTestId("lab-state")).toHaveText("Error");
  await page.getByRole("button", { name: "Start camera", exact: true }).click();
  await expect(page.getByTestId("lab-state")).toHaveText("Running", {
    timeout: 30000,
  });
  await page.getByRole("button", { name: "Stop camera", exact: true }).click();
});

test("offline worker initialization gives connection/retry guidance and recovers only after Start", async ({
  page,
  context,
}) => {
  await camera(page);
  await page.goto("/");
  await context.setOffline(true);
  await page.getByRole("button", { name: "Start camera", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Check your connection");
  await expect(page.getByRole("alert")).not.toContainText(
    "browser may not support",
  );
  expect(
    await page.locator("video").evaluate((v: HTMLVideoElement) => v.srcObject),
  ).toBeNull();
  expect(
    await page.evaluate(() =>
      (window as any).__labStreamTest
        .getTracks()
        .every((track: MediaStreamTrack) => track.readyState === "ended"),
    ),
  ).toBe(true);
  await context.setOffline(false);
  await expect(page.getByTestId("lab-state")).toHaveText("Error");
  await page.getByRole("button", { name: "Start camera", exact: true }).click();
  await expect(page.getByTestId("lab-state")).toHaveText("Running", {
    timeout: 30000,
  });
  await page.getByRole("button", { name: "Stop camera", exact: true }).click();
});

test("worker crashes during inference remain generic runtime errors with explicit retry", async ({
  page,
}) => {
  await camera(page);
  await page.route("**/src/inference/detector.worker.ts*", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: "self.onmessage=({data})=>{if(data.type==='init')postMessage({type:'ready'});else{data.bitmap.close();throw new Error('Test inference crash')}};",
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Start camera", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "inference worker stopped unexpectedly",
  );
  await expect(page.getByRole("alert")).not.toContainText(
    "Check your connection",
  );
  expect(
    await page.locator("video").evaluate((v: HTMLVideoElement) => v.srcObject),
  ).toBeNull();
  expect(
    await page.evaluate(() =>
      (window as any).__labStreamTest
        .getTracks()
        .every((track: MediaStreamTrack) => track.readyState === "ended"),
    ),
  ).toBe(true);
  await page.unroute("**/src/inference/detector.worker.ts*");
  await model(page);
  await page.getByRole("button", { name: "Start camera", exact: true }).click();
  await expect(page.getByTestId("lab-state")).toHaveText("Running");
  await expect(page.getByTestId("detection-count")).toHaveText("2");
  await page.getByRole("button", { name: "Stop camera", exact: true }).click();
});

test("camera aspect change clears old boxes while the next result is pending", async ({
  page,
}) => {
  await camera(page);
  await page.route("**/src/inference/detector.worker.ts*", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `
    let sent=false; self.onmessage=({data})=>{
      if(data.type==='init') postMessage({type:'ready'});
      else {data.bitmap.close();if(!sent){sent=true;postMessage({type:'result',id:data.id,inferenceMs:20,detections:[{label:'cup',score:0.8,box:{x:100,y:100,width:100,height:100}}]});}}
    };`,
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Start camera", exact: true }).click();
  await expect(page.getByTestId("detection-count")).toHaveText("1");
  await page.evaluate(() => {
    const c = (window as unknown as { __labCameraTest: HTMLCanvasElement })
      .__labCameraTest;
    c.width = 320;
    c.height = 640;
  });
  await expect
    .poll(() =>
      page
        .locator("video")
        .evaluate((v: HTMLVideoElement) => v.videoWidth / v.videoHeight),
    )
    .toBe(0.5);
  await expect(page.getByTestId("detection-count")).toHaveText("0");
  expect(
    await page.locator("canvas").evaluate((c: HTMLCanvasElement) =>
      c
        .getContext("2d")!
        .getImageData(0, 0, c.width, c.height)
        .data.some((v) => v !== 0),
    ),
  ).toBe(false);
  const ratio = await page
    .locator(".video-stage")
    .evaluate(
      (el) =>
        el.getBoundingClientRect().width / el.getBoundingClientRect().height,
    );
  expect(ratio).toBeCloseTo(0.5);
  await page.getByRole("button", { name: "Stop camera", exact: true }).click();
});

test("result count and displayed scores match drawable boxes without claiming certainty", async ({
  page,
}) => {
  await camera(page);
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.fillText;
    Object.assign(window, { __labScoreText: [] as string[] });
    CanvasRenderingContext2D.prototype.fillText = function (
      ...args: Parameters<typeof original>
    ) {
      (window as unknown as { __labScoreText: string[] }).__labScoreText.push(
        args[0],
      );
      return original.apply(this, args);
    };
  });
  await page.route("**/src/inference/detector.worker.ts*", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `
    self.onmessage=({data})=>{
      if(data.type==='init') postMessage({type:'ready'});
      else {data.bitmap.close();postMessage({type:'result',id:data.id,inferenceMs:20,detections:[
        {label:'cup',score:0.995,box:{x:100,y:100,width:100,height:100}},
        {label:'outside',score:0.9,box:{x:900,y:10,width:10,height:10}}]});}
    };`,
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Start camera", exact: true }).click();
  await expect(page.getByTestId("detection-count")).toHaveText("1");
  await expect(page.getByTestId("detections")).toContainText("99%");
  await expect(page.getByTestId("detections")).not.toContainText("outside");
  expect(
    await page.evaluate(
      () => (window as unknown as { __labScoreText: string[] }).__labScoreText,
    ),
  ).toContain("cup  99%");
  await page.getByRole("button", { name: "Stop camera", exact: true }).click();
});

test("the model panel and stage label use the supplied model configuration", async ({
  page,
}) => {
  const { MODEL } = await import("../../src/inference/types");
  const config = {
    ...MODEL,
    name: "Different detector",
    version: "test / v9",
    runtime: "Test Runtime 1.2.3",
    modelPath: "models/another.tflite",
    bytes: 2097152,
    categories: 4,
    floor: 0.07,
    maxResults: 7,
    source: "Test publisher",
    compatibility: "A test compatibility statement",
  };
  await page.route("**/src/inference/types.ts*", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `export const MODEL=${JSON.stringify(config)};`,
    }),
  );
  await page.goto("/");
  await expect(page.locator("#stage-model")).toHaveText(
    "Different detector · CPU",
  );
  await expect(page.locator("#model-version")).toHaveText("test / v9");
  await expect(page.locator("#model-runtime")).toHaveText(
    "Test Runtime 1.2.3 · CPU/WASM",
  );
  await expect(page.locator("#model-size")).toHaveText("2.0 MiB");
  await expect(page.locator("#model-coverage")).toHaveText("4 COCO categories");
  await expect(
    page.getByRole("slider", { name: "Confidence threshold" }),
  ).toHaveAttribute("min", "0.07");
  await page.getByText("Model & compatibility notes", { exact: true }).click();
  await expect(page.locator("#model-source")).toHaveText("Test publisher");
  await expect(page.locator("#model-compatibility")).toHaveText(
    "A test compatibility statement",
  );
  await expect(page.locator("#model-output-notes")).toContainText(
    "Output floor: 7%; at most 7 results",
  );
  await expect(page.locator(".range-ends")).toContainText("7% · More results");
});

test("camera acquisition stays inactive until an explicit Start click", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.assign(window, { __cameraAcquisitions: 0 });
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => {
        (window as unknown as { __cameraAcquisitions: number })
          .__cameraAcquisitions++;
        throw new DOMException(
          "Intentional denial for acquisition-gate test",
          "NotAllowedError",
        );
      },
    });
  });
  await page.goto("/");
  await expect(page.getByTestId("lab-state")).toHaveText("Idle");
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __cameraAcquisitions: number })
          .__cameraAcquisitions,
    ),
  ).toBe(0);
  expect(
    await page.locator("video").evaluate((v: HTMLVideoElement) => v.srcObject),
  ).toBeNull();
  await page.getByRole("button", { name: "Start camera", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Camera access was denied",
  );
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __cameraAcquisitions: number })
          .__cameraAcquisitions,
    ),
  ).toBe(1);
});
