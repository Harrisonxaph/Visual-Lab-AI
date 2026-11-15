import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test("metric tables explain zero denominators and render labels safely", async ({
  page,
}) => {
  await page.goto("/#training");
  await page.evaluate(async () => {
    const { classificationMetricsPanel } =
      await import("/src/ui/classification-metrics.ts");
    document.querySelector("#training-view")!.append(
      classificationMetricsPanel(
        ["<img src=x onerror=alert(1)>", "plant", "absent"],
        [0, 1],
        [0, 0],
        { id: "fixture-metrics", title: "Validation fixture" },
      ),
    );
  });
  const panel = page.locator("#fixture-metrics");
  await expect(panel.getByTestId("metric-total")).toHaveText("2");
  const plant = panel.locator("tbody").first().locator("tr").nth(1);
  await expect(plant).toContainText("Not measured (0 denominator)");
  await expect(plant).toContainText("0 / 1 (0.0%)");
  await expect(panel.locator("img")).toHaveCount(0);
  await expect(panel).toContainText("<img src=x onerror=alert(1)>");
  const cells = await panel
    .getByTestId("confusion-matrix")
    .locator("tbody td")
    .allTextContents();
  expect(cells.map(Number)).toEqual([1, 0, 0, 1, 0, 0, 0, 0, 0]);
});

test("an empty check is not reported as zero or perfect accuracy", async ({
  page,
}) => {
  await page.goto("/#training");
  await page.evaluate(async () => {
    const { classificationMetricsPanel } =
      await import("/src/ui/classification-metrics.ts");
    document.querySelector("#training-view")!.append(
      classificationMetricsPanel(["a", "b"], [], [], {
        id: "empty-metrics",
        title: "Empty validation",
      }),
    );
  });
  const panel = page.locator("#empty-metrics");
  await expect(panel.getByTestId("metric-total")).toHaveText("0");
  await expect(panel).toContainText("Accuracy: Not measured");
  await expect(panel).not.toContainText("NaN");
  await expect(panel).not.toContainText("Infinity");
});

test("ten long class names scroll inside their tables on a phone viewport", async ({
  page,
}) => {
  await page.goto("/#training");
  await page.evaluate(async () => {
    const { classificationMetricsPanel } =
      await import("/src/ui/classification-metrics.ts");
    const labels = Array.from(
      { length: 10 },
      (_, i) => `label-${i}-${"x".repeat(30)}`,
    );
    const host = document.createElement("section");
    host.className = "panel ds-panel";
    host.append(
      classificationMetricsPanel(labels, [0, 1], [0, 1], {
        id: "wide-metrics",
        title: "Wide validation",
      }),
    );
    document.querySelector("#tr-results")!.append(host);
  });
  const region = page.locator("#wide-metrics").getByRole("region", {
    name: "Confusion matrix",
  });
  await expect(region).toHaveAttribute("tabindex", "0");
  expect(await region.evaluate((e) => e.scrollWidth > e.clientWidth)).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
