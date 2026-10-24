import { test, expect } from "@playwright/test";
import { readFileSync, readdirSync } from "node:fs";
const config = JSON.parse(readFileSync("vercel.json", "utf8"));

test("production response policy blocks off-origin code, fetch, beacon and workers", async ({
  page,
}) => {
  const response = await page.goto("/");
  const policy = response!.headers()["content-security-policy"];
  expect(policy).toBeTruthy();
  expect(policy).toBe(
    config.headers
      .find((entry: any) => entry.source === "/(.*)")
      .headers.find((entry: any) => entry.key === "Content-Security-Policy")
      .value,
  );
  const reached: string[] = [];
  await page.route("https://privacy-probe.invalid/**", (route) => {
    reached.push(route.request().url());
    return route.fulfill({
      contentType: "text/javascript",
      body: "window.remoteRan=true",
    });
  });
  const result = await page.evaluate(async () => {
    const violations: string[] = [];
    document.addEventListener("securitypolicyviolation", (event) =>
      violations.push(event.effectiveDirective),
    );
    const script = document.createElement("script");
    script.src = "https://privacy-probe.invalid/script.js";
    const loaded = new Promise<boolean>((resolve) => {
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
    });
    document.head.append(script);
    let fetched = false;
    try {
      await fetch("https://privacy-probe.invalid/upload", {
        method: "POST",
        body: "probe",
      });
      fetched = true;
    } catch {}
    navigator.sendBeacon("https://privacy-probe.invalid/beacon", "probe");
    let workerAllowed = true;
    try {
      const worker = new Worker(
        URL.createObjectURL(
          new Blob(["postMessage('probe')"], { type: "text/javascript" }),
        ),
      );
      workerAllowed = await new Promise<boolean>((resolve) => {
        worker.onmessage = () => resolve(true);
        worker.onerror = () => resolve(false);
      });
      worker.terminate();
    } catch {
      workerAllowed = false;
    }
    const inline = document.createElement("script");
    inline.textContent = "window.inlineRan=true";
    document.head.append(inline);
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      loaded: await loaded,
      fetched,
      workerAllowed,
      violations,
      inlineRan: (window as any).inlineRan || false,
    };
  });
  expect(result.loaded).toBe(false);
  expect(result.fetched).toBe(false);
  expect(result.workerAllowed).toBe(false);
  expect(result.inlineRan).toBe(false);
  expect(result.violations).toEqual(
    expect.arrayContaining(["connect-src", "script-src-elem", "worker-src"]),
  );
  expect(reached).toEqual([]);
  // Same-origin connections are deliberately still permitted; this is not upload prevention.
  expect(
    await page.evaluate(
      async () => (await fetch("/models/efficientdet_lite0.tflite")).ok,
    ),
  ).toBe(true);
});

test("same-origin worker response applies CSP to worker-originated connections", async ({
  page,
}) => {
  await page.goto("/");
  const workerFile = readdirSync("dist/assets").find(
    (name) => name.startsWith("detector.worker-") && name.endsWith(".js"),
  )!;
  const response = await page.request.get("/assets/" + workerFile);
  const policy = response.headers()["content-security-policy"];
  expect(policy).toBeTruthy();
  await page.route("https://privacy-probe.invalid/**", (route) =>
    route.fulfill({
      contentType: "text/plain",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: "probe",
    }),
  );
  await page.route("**/privacy-test-worker.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      headers: { "Content-Security-Policy": policy },
      body: `onmessage=async()=>{try{await fetch('https://privacy-probe.invalid/worker');postMessage('allowed')}catch{postMessage('blocked')}}`,
    }),
  );
  const result = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const worker = new Worker("/privacy-test-worker.js");
        worker.onmessage = (event) => {
          resolve(event.data);
          worker.terminate();
        };
        worker.onerror = () => {
          resolve("worker-error");
          worker.terminate();
        };
        worker.postMessage("go");
      }),
  );
  expect(result).toBe("blocked");
});

test("diagnostics record real CSP violations and strip sensitive blocked addresses", async ({
  page,
}) => {
  await page.goto("/?diag=1");
  const log = page.locator("#camera-diagnostics-log");
  await page.evaluate(() => {
    const script = document.createElement("script");
    script.src =
      "https://privacy-probe.invalid/injected.js?token=secret#fragment";
    document.head.append(script);
  });
  await expect(log).toContainText('"event": "csp-violation"');
  await expect(log).toContainText('"directive": "script-src-elem"');
  await expect(log).toContainText("https://privacy-probe.invalid");
  // Browsers can already reduce cross-origin blockedURI to its origin. Exercise our own redaction too.
  await page.evaluate(() => {
    document.dispatchEvent(
      new SecurityPolicyViolationEvent("securitypolicyviolation", {
        effectiveDirective: "connect-src",
        blockedURI:
          "https://user:password@privacy-probe.invalid/upload?private=value#fragment",
        disposition: "enforce",
      }),
    );
    document.dispatchEvent(
      new SecurityPolicyViolationEvent("securitypolicyviolation", {
        effectiveDirective: "script-src-elem",
        blockedURI: "data:text/javascript,secretPayload?private=value",
        disposition: "enforce",
      }),
    );
  });
  await expect(log).toContainText('"directive": "connect-src"');
  await expect(log).toContainText("https://privacy-probe.invalid/upload");
  await expect(log).not.toContainText("secret");
  await expect(log).not.toContainText("private=value");
  await expect(log).not.toContainText("password");
  await expect(log).not.toContainText("fragment");
});

test("policy headers cover document, app assets, worker, WASM loaders and model", async ({
  request,
}) => {
  const assets = readdirSync("dist/assets").map((name) => "/assets/" + name);
  const wasm = readdirSync("dist/wasm")
    .filter((name) => /\.(js|wasm)$/.test(name))
    .map((name) => "/wasm/" + name);
  expect(wasm.filter((name) => name.endsWith(".js")).length).toBeGreaterThan(0);
  expect(wasm.filter((name) => name.endsWith(".wasm")).length).toBeGreaterThan(
    0,
  );
  const policy = config.headers[0].headers.find(
    (header: any) => header.key === "Content-Security-Policy",
  ).value;
  for (const path of [
    "/",
    "/camera-diagnostics.js",
    "/camera-diagnostics.css",
    ...assets,
    ...wasm,
    "/models/efficientdet_lite0.tflite",
  ]) {
    const response = await request.get(path);
    expect(response.ok(), path).toBe(true);
    expect(response.headers()["content-security-policy"], path).toBe(policy);
  }
});
