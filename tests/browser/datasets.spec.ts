import { test, expect, type Page } from "@playwright/test";

// Real IndexedDB, real image decoding and the real Dataset lab UI in Chromium.
// Photos come from generated canvases, not a phone library (that stays a device check).

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

async function openLab(page: Page) {
  page.on("dialog", (d) => d.accept());
  await page.goto("/#datasets");
  await expect(page.locator("#dataset-view")).toBeVisible();
  await expect(page.locator("#ds-datasets")).toBeVisible();
}

/** PNG files drawn in the page, returned as Playwright file payloads. */
async function makePngs(page: Page, count: number, offset = 0) {
  const files = await page.evaluate(
    async ({ count, offset }) => {
      const out: { name: string; data: number[] }[] = [];
      for (let i = 0; i < count; i++) {
        const c = new OffscreenCanvas(300, 200);
        const g = c.getContext("2d")!;
        const k = i + offset;
        for (let x = 0; x < 300; x += 10)
          for (let y = 0; y < 200; y += 10) {
            g.fillStyle = `hsl(${(x * 7 + y * 3 + k * 53) % 360},60%,${30 + ((x * y + k * 97) % 50)}%)`;
            g.fillRect(x, y, 10, 10);
          }
        const blob = await c.convertToBlob({ type: "image/png" });
        out.push({
          name: `photo-${k}.png`,
          data: Array.from(new Uint8Array(await blob.arrayBuffer())),
        });
      }
      return out;
    },
    { count, offset },
  );
  return files.map((f) => ({
    name: f.name,
    mimeType: "image/png",
    buffer: Buffer.from(f.data),
  }));
}

/** Reads stored records straight from IndexedDB, bypassing the UI. */
async function storedImages(page: Page) {
  return page.evaluate(
    () =>
      new Promise<
        {
          id: string;
          labelId: string | null;
          split: string | null;
          dhash: string;
          sha256: string;
        }[]
      >((resolve, reject) => {
        const open = indexedDB.open("visual-labs-datasets");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const r = open.result
            .transaction("images")
            .objectStore("images")
            .getAll();
          r.onsuccess = () => {
            open.result.close();
            resolve(r.result);
          };
        };
      }),
  );
}

async function createDataset(page: Page, name: string, labels: string[]) {
  await page.locator("#ds-new-name").fill(name);
  await page.getByTestId("ds-create").click();
  for (const l of labels) {
    await page.locator("#ds-new-label").fill(l);
    await page.getByTestId("ds-add-label").click();
    await expect(page.locator("#ds-labels li input").last()).toHaveValue(l);
  }
}

test("example dataset: 60 shapes, exact duplicate skipped, near-copy grouped in one split, every label in every split", async ({
  page,
}) => {
  const violations: string[] = [];
  page.on("console", (m) => {
    if (/Content Security Policy/i.test(m.text())) violations.push(m.text());
  });
  await openLab(page);
  await page.getByTestId("ds-example").click();
  await expect(page.locator("#ds-status")).toContainText(
    "Example dataset ready",
    { timeout: 60000 },
  );
  const line = page.getByTestId("ds-stat-line");
  await expect(line).toContainText("61 photos");
  await expect(line).toContainText("1 exact duplicate skipped");
  await expect(line).toContainText("1 related group (2 photos)");
  const rows = page.locator("#ds-stats tr");
  for (const label of ["circle", "square", "triangle"]) {
    const cells = await rows
      .filter({ hasText: label })
      .locator("td")
      .allTextContents();
    const [train, validation, test] = cells.map(Number);
    expect(validation).toBeGreaterThanOrEqual(2);
    expect(test).toBeGreaterThanOrEqual(2);
    expect(train).toBeGreaterThanOrEqual(12);
  }
  const images = await storedImages(page);
  expect(images).toHaveLength(61);
  const groups = await page.evaluate(async (imgs) => {
    const { relatedGroups } = await import("/src/datasets/splits.ts");
    return relatedGroups(imgs);
  }, images);
  for (const g of groups) {
    const splits = new Set(
      g.map((id: string) => images.find((i) => i.id === id)!.split),
    );
    expect(splits.size).toBe(1);
  }
  // Thumbnails are painted on canvases (no CSP change for blob images).
  await expect
    .poll(() =>
      page
        .locator("#ds-grid canvas")
        .first()
        .evaluate((c: HTMLCanvasElement) =>
          c
            .getContext("2d")!
            .getImageData(0, 0, 96, 96)
            .data.some((v) => v !== 0),
        ),
    )
    .toBe(true);
  // Loading the example again reopens it instead of duplicating.
  await page.getByTestId("ds-example").click();
  await expect(page.locator("#ds-status")).toContainText(
    "Opened the existing example dataset",
  );
  expect(await storedImages(page)).toHaveLength(61);
  expect(violations).toEqual([]);
});

test("import, duplicate skip, bad file, relabel, reload, deletions", async ({
  page,
}) => {
  await openLab(page);
  await createDataset(page, "Kitchen", ["mug", "plant"]);
  const files = await makePngs(page, 6);
  await page.locator("#ds-import-label").selectOption({ label: "mug" });
  await page.locator("#ds-file").setInputFiles([
    ...files,
    {
      name: "broken.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("not an image"),
    },
  ]);
  await expect(page.locator("#ds-status")).toContainText("Added 6 photos.");
  await expect(page.locator("#ds-summary")).toContainText(
    "broken.jpg: This file could not be read as an image",
  );
  // The same file again is an exact duplicate.
  await page.locator("#ds-file").setInputFiles([files[0]]);
  await expect(page.locator("#ds-status")).toContainText(
    "Skipped 1 exact duplicate",
  );
  await expect(page.getByTestId("ds-stat-line")).toContainText("6 photos");

  let images = await storedImages(page);
  expect(images.every((i) => i.split)).toBe(true);
  const beforeSplits = new Map(images.map((i) => [i.id, i.split]));

  // More photos for another label never move existing ones.
  await page.locator("#ds-import-label").selectOption({ label: "plant" });
  await page.locator("#ds-file").setInputFiles(await makePngs(page, 5, 100));
  await expect(page.locator("#ds-status")).toContainText("Added 5 photos.");
  images = await storedImages(page);
  for (const [id, split] of beforeSplits)
    expect(images.find((i) => i.id === id)!.split).toBe(split);

  // Relabel one photo to "No label": it leaves its split.
  const firstCard = page.getByTestId("ds-card").first();
  await firstCard.locator("select").selectOption("");
  await expect(page.getByTestId("ds-stat-line")).toContainText("1 unlabelled");
  images = await storedImages(page);
  expect(images.filter((i) => i.split === null)).toHaveLength(1);

  // Data survives a reload.
  await page.reload();
  await expect(page.getByTestId("ds-stat-line")).toContainText("11 photos");
  await expect(page.locator("#ds-select")).toHaveValue(/.+/);

  // Delete one photo.
  await page.getByTestId("ds-delete-image").first().click();
  await expect(page.getByTestId("ds-stat-line")).toContainText("10 photos");

  // Delete label "plant" but keep its photos unlabelled.
  await page
    .locator("#ds-labels li")
    .filter({ has: page.getByLabel("Name of label plant") })
    .getByRole("button", { name: "Delete (keep photos unlabelled)" })
    .click();
  await expect(page.getByTestId("ds-stat-line")).toContainText("5 unlabelled");
  // Delete label "mug" together with its photos.
  await page
    .locator("#ds-labels li")
    .filter({ has: page.getByLabel("Name of label mug") })
    .getByRole("button", { name: "Delete with photos" })
    .click();
  await expect(page.getByTestId("ds-stat-line")).toContainText("5 photos");
  expect(await storedImages(page)).toHaveLength(5);

  // Delete all dataset data.
  await page.getByTestId("ds-delete-all").click();
  await expect(page.locator("#ds-status")).toContainText(
    "All dataset data was deleted",
  );
  await expect(page.locator("#ds-select")).toHaveCount(0);
  expect(await storedImages(page)).toHaveLength(0);
});

test("limits and validation: label names, duplicate labels, dataset count and file count", async ({
  page,
}) => {
  await openLab(page);
  await createDataset(page, "Limits", ["cat"]);
  await page.locator("#ds-new-label").fill(" CAT ");
  await page.getByTestId("ds-add-label").click();
  await expect(page.locator("#ds-status")).toContainText("already exists");
  // The text box itself stops at 40 characters.
  await page.locator("#ds-new-label").fill("x".repeat(41));
  await expect(page.locator("#ds-new-label")).toHaveValue("x".repeat(40));
  const many = Array.from({ length: 51 }, (_, i) => ({
    name: `f${i}.png`,
    mimeType: "image/png",
    buffer: Buffer.from([i]),
  }));
  await page.locator("#ds-file").setInputFiles(many);
  await expect(page.locator("#ds-status")).toContainText(
    "at most 50 files at a time",
  );
  for (let i = 0; i < 4; i++) {
    await page.locator("#ds-new-name").fill(`Extra ${i}`);
    await page.getByTestId("ds-create").click();
    // Wait for this creation to finish: the list grows by one each time.
    await expect(page.locator("#ds-select option")).toHaveCount(i + 2);
  }
  await page.locator("#ds-new-name").fill("One too many");
  await page.getByTestId("ds-create").click();
  await expect(page.locator("#ds-status")).toContainText("at most 5 datasets");
});

test("too little free storage is refused before importing", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.storage, "estimate", {
      value: async () => ({ quota: 1000, usage: 900 }),
    });
  });
  await openLab(page);
  await createDataset(page, "Tiny", ["a"]);
  await page.locator("#ds-file").setInputFiles(await makePngs(page, 1));
  await expect(page.locator("#ds-status")).toContainText(
    "Not enough free browser storage",
  );
  expect(await storedImages(page)).toHaveLength(0);
});

test("unavailable storage is explained and the Detection lab still works", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", {
      get() {
        throw new DOMException("blocked", "SecurityError");
      },
    });
  });
  await page.goto("/#datasets");
  await expect(page.locator("#ds-status")).toContainText(
    "The Detection lab still works",
  );
  await page.locator("#tab-detection").click();
  await expect(page.locator("#detection-view")).toBeVisible();
  await expect(page.locator("#start")).toBeEnabled();
});

test("switching to the Dataset lab pauses running detection", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => {
        const c = document.createElement("canvas");
        c.width = 640;
        c.height = 480;
        const g = c.getContext("2d")!;
        setInterval(() => {
          g.fillStyle = `hsl(${Date.now() % 360},50%,50%)`;
          g.fillRect(0, 0, 640, 480);
        }, 50);
        return c.captureStream(10);
      },
    });
  });
  await page.route("**/src/inference/detector.worker.ts*", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `self.onmessage=({data})=>{if(data.type==='init')postMessage({type:'ready'});else{data.bitmap.close();postMessage({type:'result',id:data.id,inferenceMs:5,detections:[]});}};`,
    }),
  );
  await page.goto("/");
  await page.locator("#start").click();
  await expect(page.getByTestId("lab-state")).toHaveText("Running");
  await page.locator("#tab-datasets").click();
  await expect(page.locator("#dataset-view")).toBeVisible();
  await expect(page.locator("#detection-view")).toBeHidden();
  await page.locator("#tab-detection").click();
  await expect(page.getByTestId("lab-state")).toHaveText("Paused");
  await page.locator("#stop").click();
});

test("acceptance checklist records Pass / Fail / Skip into one summary", async ({
  page,
}) => {
  await openLab(page);
  await page.locator("#ds-checklist summary").click();
  const items = page.locator("#ds-checklist li");
  await items.nth(0).getByRole("button", { name: "Pass" }).click();
  await items.nth(1).getByRole("button", { name: "Skip" }).click();
  const summary = page.getByRole("textbox", { name: "Checklist summary" });
  await expect(summary).toHaveValue(/1\. PASS/);
  await expect(summary).toHaveValue(/2\. SKIP/);
  await expect(summary).toHaveValue(/3\. NOT DONE/);
});

test("cancelling an import keeps photos already added and leaves nothing half-saved", async ({
  page,
}) => {
  // Pause decoding of the third picked file until the test releases it, so Cancel always lands
  // mid-import regardless of machine speed.
  await page.addInitScript(() => {
    const original = window.createImageBitmap;
    let files = 0;
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    Object.assign(window, { __releaseDecode: () => release() });
    window.createImageBitmap = (async (
      ...args: Parameters<typeof original>
    ) => {
      if (args[0] instanceof File && ++files === 3) await gate;
      return original(...args);
    }) as typeof original;
  });
  await openLab(page);
  await createDataset(page, "Cancel", ["a"]);
  const files = await makePngs(page, 10);
  await page.locator("#ds-file").setInputFiles(files);
  await expect(page.locator("#ds-status")).toContainText(
    "Adding photos: 2 / 10",
  );
  await page.getByTestId("ds-cancel").click();
  await page.evaluate(() => (window as any).__releaseDecode());
  await expect(page.locator("#ds-status")).toContainText("Cancelled");
  await expect(page.locator("#ds-status")).toContainText("Added 3 photos.");
  const images = await storedImages(page);
  expect(images).toHaveLength(3);
  const blobCount = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open("visual-labs-datasets");
        open.onsuccess = () => {
          const r = open.result
            .transaction("blobs")
            .objectStore("blobs")
            .count();
          r.onsuccess = () => {
            open.result.close();
            resolve(r.result);
          };
        };
      }),
  );
  expect(blobCount).toBe(images.length);
  await expect(page.getByTestId("ds-stat-line")).toContainText(
    `${images.length} photos`,
  );
});

test("'Not related' separates a grouped photo and Re-split keeps groups together", async ({
  page,
}) => {
  await openLab(page);
  await page.getByTestId("ds-example").click();
  await expect(page.locator("#ds-status")).toContainText(
    "Example dataset ready",
    { timeout: 60000 },
  );
  const versionOf = async () =>
    Number(
      /version (\d+)/.exec(
        await page.getByTestId("ds-stat-line").innerText(),
      )![1],
    );
  const before = await versionOf();
  await page.getByTestId("ds-resplit").click();
  await expect(page.locator("#ds-status")).toContainText("re-split");
  expect(await versionOf()).toBe(before + 1);
  const images = await storedImages(page);
  const groups = await page.evaluate(async (imgs) => {
    const { relatedGroups } = await import("/src/datasets/splits.ts");
    return relatedGroups(imgs).filter((g) => g.length > 1);
  }, images);
  expect(groups).toHaveLength(1);
  const [a, b] = groups[0].map(
    (id: string) => images.find((i) => i.id === id)!,
  );
  expect(a.split).toBe(b.split);

  await page.locator("#ds-filter").selectOption("related");
  await expect(page.getByTestId("ds-card")).toHaveCount(2);
  await page
    .getByTestId("ds-card")
    .first()
    .getByRole("button", { name: "Not related" })
    .click();
  await expect(page.getByTestId("ds-stat-line")).toContainText(
    "0 related groups",
  );
  await expect(page.getByTestId("ds-card")).toHaveCount(0);
});

test("a storage-full error while saving is reported and nothing is half-saved", async ({
  page,
}) => {
  await openLab(page);
  await createDataset(page, "Full", ["a"]);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (
      ...args: Parameters<typeof original>
    ) {
      if (this.name === "blobs")
        throw new DOMException("full", "QuotaExceededError");
      return original.apply(this, args);
    };
  });
  await page.locator("#ds-file").setInputFiles(await makePngs(page, 2));
  await expect(page.locator("#ds-summary")).toContainText(
    "Not enough storage space",
  );
  expect(await storedImages(page)).toHaveLength(0);
  await expect(page.getByTestId("ds-stat-line")).toContainText("0 photos");
});

test("an asynchronous storage error rolls back the whole save and leaves the screen unchanged", async ({
  page,
}) => {
  await openLab(page);
  await createDataset(page, "Rollback", ["a"]);
  const versionBefore = await page.getByTestId("ds-stat-line").innerText();
  // Make every blob write fail asynchronously (a duplicate-key request error is reported after
  // the request is queued, like a quota error), while the image record write succeeds.
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (
      ...args: Parameters<typeof original>
    ) {
      if (this.name === "blobs") {
        this.add(args[0]);
        return this.add(args[0]);
      }
      return original.apply(this, args);
    };
  });
  await page.locator("#ds-file").setInputFiles(await makePngs(page, 2));
  await expect(page.locator("#ds-summary")).toContainText(
    "could not save dataset changes",
  );
  expect(await storedImages(page)).toHaveLength(0);
  const blobs = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open("visual-labs-datasets");
        open.onsuccess = () => {
          const r = open.result
            .transaction("blobs")
            .objectStore("blobs")
            .count();
          r.onsuccess = () => {
            open.result.close();
            resolve(r.result);
          };
        };
      }),
  );
  expect(blobs).toBe(0);
  await expect(page.getByTestId("ds-stat-line")).toHaveText(versionBefore);
});

test("an incomplete example dataset is reported honestly and replaced on retry", async ({
  page,
}) => {
  await openLab(page);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    Object.assign(window, {
      __restorePut: () => (IDBObjectStore.prototype.put = original),
    });
    IDBObjectStore.prototype.put = function (
      ...args: Parameters<typeof original>
    ) {
      if (this.name === "blobs")
        throw new DOMException("full", "QuotaExceededError");
      return original.apply(this, args);
    };
  });
  await page.getByTestId("ds-example").click();
  await expect(page.locator("#ds-status")).toContainText(
    "Example dataset is incomplete: 0 of 61 images were saved",
    { timeout: 60000 },
  );
  await expect(page.locator("#ds-status")).toContainText("Not enough storage");
  await expect(page.getByTestId("ds-stat-line")).toContainText("0 photos");
  await page.evaluate(() => (window as any).__restorePut());
  await page.getByTestId("ds-example").click();
  await expect(page.locator("#ds-status")).toContainText(
    "Example dataset ready",
    { timeout: 60000 },
  );
  await expect(page.getByTestId("ds-stat-line")).toContainText("61 photos");
  await expect(page.locator("#ds-select option")).toHaveCount(1);
  // A complete example is reopened, not regenerated.
  await page.getByTestId("ds-example").click();
  await expect(page.locator("#ds-status")).toContainText(
    "Opened the existing example dataset",
  );
});

test("delete all while another tab holds storage open: explains the wait, then finishes when it closes", async ({
  page,
}) => {
  test.setTimeout(60000);
  await openLab(page);
  await createDataset(page, "Blocked", ["a"]);
  await page.locator("#ds-file").setInputFiles(await makePngs(page, 1));
  await expect(page.locator("#ds-status")).toContainText("Added 1 photo.");
  // Simulates another tab: an open connection that ignores deletion requests.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const open = indexedDB.open("visual-labs-datasets");
        open.onsuccess = () => {
          Object.assign(window, { __otherTab: open.result });
          resolve();
        };
      }),
  );
  await page.getByTestId("ds-delete-all").click();
  await expect(page.locator("#ds-status")).toContainText(
    "Deletion is waiting because another tab",
    { timeout: 15000 },
  );
  await expect(page.locator("#ds-pending")).toBeVisible();
  // Not claimed as done while the other tab is open.
  await expect(page.locator("#ds-status")).not.toContainText("was deleted");
  await page.evaluate(() => (window as any).__otherTab.close());
  await expect(page.locator("#ds-status")).toContainText(
    "All dataset data was deleted",
  );
  await expect(page.locator("#ds-pending")).toHaveCount(0);
  expect(await storedImages(page)).toHaveLength(0);
  await expect(page.locator("#ds-select")).toHaveCount(0);
});
