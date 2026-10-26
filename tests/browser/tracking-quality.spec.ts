import { test, expect } from "@playwright/test";
test("synthetic benchmark is explicit, cancellable and reports configuration", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#run-benchmark").click();
  await page.locator("#cancel-benchmark").click();
  await expect(page.locator("#benchmark-status")).toContainText(/cancel/i);
  await expect(page.locator("#benchmark-results")).toHaveText("");
  await page.locator("#run-benchmark").click();
  await expect(page.locator("#benchmark-status")).toHaveText(
    "Completed labelled synthetic benchmark.",
  );
  await expect(page.locator("#benchmark-results")).toContainText("not run");
  console.log(
    "SYNTHETIC_OUTCOMES",
    JSON.stringify(
      JSON.parse(await page.locator("#benchmark-results").innerText()).map(
        ({
          fixtureId,
          misses,
          idChanges,
          fragments,
          recovered,
          recoveryEligible,
        }: any) => ({
          fixtureId,
          misses,
          idChanges,
          fragments,
          recovered,
          recoveryEligible,
        }),
      ),
    ),
  );
  await expect(page.locator("#benchmark-results")).toContainText(
    "recoveryRate",
  );
});
test("100 live tracks × 50 detections profile includes returned and explicit snapshot copies", async ({
  page,
}) => {
  await page.goto("/");
  const report = await page.evaluate(async () => {
    const { Tracker } = await import("/src/tracking/tracker.ts");
    const tracker = new Tracker();
    tracker.startSession(1);
    let seq = 0;
    const feed = (x: number) =>
      tracker.update({
        sessionId: 1,
        segment: 1,
        geometry: 1,
        sequence: ++seq,
        sampledAtMs: seq * 5,
        completedAtMs: seq * 5,
        width: 100,
        height: 100,
        detections: Array.from({ length: 50 }, (_, sourceIndex) => ({
          sourceIndex,
          label: "cup",
          score: 0.8,
          box: { x, y: 0.2, width: 0.1, height: 0.1 },
        })),
      });
    feed(0.05);
    feed(0.05);
    feed(0.75);
    feed(0.75);
    for (let i = 0; i < 180; i++) {
      feed(0.75);
      if (i % 10 === 9) await new Promise((r) => setTimeout(r, 0));
    }
    await new Promise((r) => setTimeout(r, 0));
    const update: number[] = [],
      copy: number[] = [],
      total: number[] = [],
      longTasks: number[] = [];
    const observer =
      typeof PerformanceObserver !== "undefined" &&
      PerformanceObserver.supportedEntryTypes.includes("longtask")
        ? new PerformanceObserver((list) =>
            longTasks.push(...list.getEntries().map((e) => e.duration)),
          )
        : null;
    observer?.observe({ type: "longtask", buffered: false });
    for (let i = 0; i < 50; i++) {
      const start = performance.now();
      feed(0.75);
      const middle = performance.now();
      tracker.snapshot();
      const end = performance.now();
      update.push(middle - start);
      copy.push(end - middle);
      total.push(end - start);
      await new Promise((r) => setTimeout(r, 0));
    }
    await new Promise((r) => setTimeout(r, 0));
    observer?.disconnect();
    const summarize = (a: number[]) => {
      a.sort((a, b) => a - b);
      return {
        p50: a[Math.floor(a.length * 0.5)],
        p95: a[Math.floor(a.length * 0.95)],
        max: a.at(-1),
      };
    };
    return {
      browser: navigator.userAgent,
      hardwareConcurrency: navigator.hardwareConcurrency,
      samples: 50,
      live: tracker.snapshot().tracks.filter((t) => t.state !== "ended").length,
      updateIncludingReturnCopy: summarize(update),
      explicitSnapshotCopy: summarize(copy),
      combined: summarize(total),
      longTasks: observer ? longTasks : "Not supported",
      budgetMs: 8,
    };
  });
  expect(report.live).toBe(100);
  expect(report.samples).toBe(50);
  console.log("TRACKING_PROFILE", JSON.stringify(report));
});

test("Start cancels an in-flight benchmark before permission/loading begins", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: () => new Promise(() => {}),
    }),
  );
  await page.goto("/");
  await page.evaluate(() => {
    (document.querySelector("#run-benchmark") as HTMLButtonElement).click();
    (document.querySelector("#start") as HTMLButtonElement).click();
  });
  await expect(page.locator("#benchmark-status")).toContainText(/Cancel/);
  await expect(page.locator("#benchmark-results")).toHaveText("");
  await expect(page.getByTestId("lab-state")).toHaveText("Loading");
  await page.locator("#stop").click();
});
