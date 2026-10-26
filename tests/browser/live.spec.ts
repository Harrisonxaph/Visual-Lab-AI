import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
for (const diagnosticQuery of ["", "?diag=1"]) {
  test(`complete UI → actual worker → Lite0 → overlay uses local requests only ${diagnosticQuery || "normal"}`, async ({
    page,
  }) => {
    const requests: { url: string; method: string }[] = [];
    page.on("request", (r) =>
      requests.push({ url: r.url(), method: r.method() }),
    );
    await page.addInitScript(
      (bytes) => {
        Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
          writable: true,
          value: async () => {
            const img = await createImageBitmap(
              new Blob([new Uint8Array(bytes)], { type: "image/jpeg" }),
            );
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(img, 0, 0);
            img.close();
            const stream = canvas.captureStream(10);
            const timer = setInterval(() => {
              ctx.drawImage(canvas, 0, 0);
            }, 100);
            stream
              .getTracks()[0]
              .addEventListener("ended", () => clearInterval(timer));
            return stream;
          },
        });
      },
      Array.from(readFileSync("tests/fixtures/cat-and-dog.jpg")),
    );
    await page.goto("/" + diagnosticQuery);
    if (diagnosticQuery) {
      await expect(page.locator("#camera-diagnostics-log")).toContainText(
        '"event": "installed"',
      );
    }
    await page
      .getByRole("button", { name: "Start camera", exact: true })
      .click();
    await expect(page.getByTestId("lab-state")).toHaveText("Running", {
      timeout: 60000,
    });
    await expect(page.getByTestId("detections")).toContainText("cat", {
      timeout: 30000,
    });
    await expect(page.getByTestId("detections")).toContainText("dog");
    if (diagnosticQuery) {
      const log = page.locator("#camera-diagnostics-log");
      await expect(log).toContainText('"event": "camera-request"');
      await expect(log).toContainText('"outcome": "resolved"');
      await expect(log).not.toContainText('"event": "unavailable"');
    }
    await expect(page.locator("#inference-time")).not.toContainText("—");
    await expect(page.locator("#processing-fps")).not.toContainText("—");
    await expect(page.locator("#track-list")).toContainText("#1");
    await expect(page.locator("#run-benchmark")).toBeDisabled();
    await page.getByRole("button", { name: /Select track 1,/ }).click();
    await expect(page.locator("#inspector-content")).toContainText("Track #1");
    await expect(page.locator("#confidence-summary")).toContainText(
      "Raw confidence",
    );
    await expect(page.locator("#alternatives")).toContainText("not supplied");
    const overlay = await page
      .locator(".video-stage canvas")
      .evaluate((c: HTMLCanvasElement) => ({
        width: c.width,
        height: c.height,
        hasDrawing: c
          .getContext("2d")!
          .getImageData(0, 0, c.width, c.height)
          .data.some((v) => v !== 0),
      }));
    expect(overlay.width).toBeGreaterThan(0);
    expect(overlay.hasDrawing).toBe(true);
    await page.getByRole("slider", { name: "Confidence threshold" }).fill("1");
    await expect(page.getByTestId("detection-count")).toHaveText("0");
    await page
      .getByRole("button", { name: "Stop camera", exact: true })
      .click();
    expect(
      requests.every(
        (r) =>
          new URL(r.url).origin === "http://localhost:5173" &&
          r.method === "GET",
      ),
    ).toBe(true);
    console.log(
      "LIVE_CONFIGURATION",
      JSON.stringify({
        browser: await page.evaluate(() => navigator.userAgent),
        overlay,
        requests: requests.length,
      }),
    );
  });
}
