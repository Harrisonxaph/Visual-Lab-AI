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
  await expect(
    panel.locator("tbody").first().locator("tr").nth(1),
  ).toContainText("Not measured (0 denominator)");
  await expect(
    panel.locator("tbody").first().locator("tr").nth(1),
  ).toContainText("0 / 1 (0.0%)");
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
