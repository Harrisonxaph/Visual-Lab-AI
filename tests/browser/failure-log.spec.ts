import { test, expect } from "@playwright/test";
const key = "visual-labs.phase2.failure-notes.v1";
test("failure notes require opt-in, survive saved reload, render safely and delete with saving off", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.method() !== "GET") requests.push(r.method());
  });
  await page.goto("/");
  await page
    .locator("#failure-text")
    .fill('<img src=x onerror="window.hacked=1">');
  await page.locator("#add-failure").click();
  await expect(page.locator("#failure-list")).toContainText("<img");
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBeNull();
  expect(await page.locator("#failure-list img").count()).toBe(0);
  await page.locator("#save-failures").check();
  await page.reload();
  await expect(page.locator("#failure-list")).toContainText("<img");
  await expect(page.locator("#save-failures")).not.toBeChecked();
  await page.getByRole("button", { name: /Delete note/ }).click();
  await expect(page.locator("#failure-list")).not.toContainText("<img");
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBeNull();
  expect(requests).toEqual([]);
});
test("denied storage falls back to memory with an honest unsaved status", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("denied");
      },
    });
  });
  await page.goto("/");
  await page.locator("#failure-text").fill("missed cup");
  await page.locator("#add-failure").click();
  await page.locator("#save-failures").check();
  await expect(page.locator("#failure-status")).toContainText(/Unsaved/i);
  await expect(page.locator("#failure-list")).toContainText("missed cup");
});
