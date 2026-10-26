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
test("100 live tracks × 50 detections use the same production stress profiler", async ({
  page,
}) => {
  await page.goto("/");
  const report = await page.evaluate(async () => {
    const { runStressProfile } = await import(
      "/src/tracking/stress-profile.ts"
    );
    return runStressProfile(new AbortController().signal);
  });
  expect(report.liveTracks).toBe(100);
  expect(report.samples).toBe(50);
  expect(report.retainedSamples).toBe(10150);
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

test("on-device stress button reports copy-inclusive metrics without camera requests and cancels cleanly", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).cameraCalls = 0;
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: () => {
        (window as any).cameraCalls++;
        return new Promise(() => {});
      },
    });
  });
  await page.goto("/");
  await page.locator("#run-stress-profile").click();
  await expect(page.locator("#benchmark-status")).toHaveText(
    "Completed synthetic stress profile.",
    { timeout: 30000 },
  );
  const report = JSON.parse(
    await page.locator("#benchmark-results").innerText(),
  );
  expect(report).toMatchObject({
    liveTracks: 100,
    samples: 50,
    detectionsPerFrame: 50,
  });
  for (const field of [
    "updateIncludingReturnCopy",
    "explicitSnapshotCopy",
    "combined",
  ])
    for (const metric of ["p50", "p95", "max"])
      expect(Number.isFinite(report[field][metric])).toBe(true);
  expect(await page.evaluate(() => (window as any).cameraCalls)).toBe(0);
  await page.evaluate(() => {
    (
      document.querySelector("#run-stress-profile") as HTMLButtonElement
    ).click();
    (document.querySelector("#cancel-benchmark") as HTMLButtonElement).click();
  });
  await expect(page.locator("#benchmark-status")).toContainText(/cancel/i);
  await expect(page.locator("#benchmark-results")).toHaveText("");
  await page.evaluate(() => {
    (
      document.querySelector("#run-stress-profile") as HTMLButtonElement
    ).click();
    (document.querySelector("#start") as HTMLButtonElement).click();
  });
  await expect(page.locator("#benchmark-status")).toContainText(/cancel/i);
  await expect(page.locator("#run-stress-profile")).toBeDisabled();
  await page.locator("#stop").click();
  await expect(page.locator("#run-stress-profile")).toBeEnabled();
});
