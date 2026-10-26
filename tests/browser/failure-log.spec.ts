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

test("note form asks for a selected track and enforces its visible character limit", async ({
  page,
}) => {
  await page.goto("/");
  for (const type of ["incorrect", "unstable"]) {
    await page.locator("#failure-type").selectOption(type);
    await page.locator("#add-failure").click();
    await expect(page.locator("#failure-status")).toHaveText(
      "Select a confirmed track first (list or video tap).",
    );
    await expect(page.locator("#failure-list li")).toHaveCount(0);
  }
  await expect(page.locator("#failure-text")).toHaveAttribute(
    "maxlength",
    "500",
  );
  await page.locator("#failure-text").fill("hello");
  await expect(page.locator("#failure-character-count")).toHaveText("5 / 500");
  await page.locator("#failure-type").selectOption("missed");
  await page.locator("#save-failures").check();
  await page.locator("#add-failure").click();
  const note = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)!).entries[0],
    key,
  );
  expect(note.thresholds.tracking).toBe(0.25);
});

test("failure notes use the supplied active tracker configuration rather than a default floor", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const { mountFailureLog } = await import("/src/ui/failure-log-panel.ts");
    const { MODEL } = await import("/src/inference/types.ts");
    const panel = document.createElement("section");
    panel.id = "configured-notes";
    panel.className = "lab-section panel";
    document.querySelector("main")!.append(panel);
    mountFailureLog(panel, MODEL, () => ({
      sessionId: 0,
      segment: 0,
      selected: null,
      threshold: 0.5,
      trackerConfig: { modelFloor: 0.05, trackingFloor: 0.63 },
    }));
  });
  const panel = page.locator("#configured-notes");
  await panel.locator("#save-failures").check();
  await panel.locator("#failure-text").fill("configured floor");
  await panel.locator("#add-failure").click();
  const note = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)!).entries[0],
    key,
  );
  expect(note.thresholds.tracking).toBe(0.63);
});

test("native note limit and counter explain emoji units and reject programmatic excess", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#failure-text").fill("🧪");
  await expect(page.locator("#failure-character-count")).toHaveText("2 / 500");
  await expect(page.locator("#failure-character-help")).toContainText("emoji");
  await page.locator("#failure-text").fill("a".repeat(600));
  expect((await page.locator("#failure-text").inputValue()).length).toBe(500);
  await expect(page.locator("#failure-character-count")).toHaveText(
    "500 / 500",
  );
  await page.locator("#failure-text").evaluate((t: HTMLTextAreaElement) => {
    t.value = "a".repeat(501);
    t.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.locator("#add-failure").click();
  await expect(page.locator("#failure-status")).toHaveText(
    "Keep the note within 500 characters.",
  );
  await expect(page.locator("#failure-list li")).toHaveCount(0);
});
