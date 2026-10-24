/* Parser-blocking, same-realm camera-call observer. No frames, storage or network writes. */
(() => {
  "use strict";
  if (new URLSearchParams(location.search).get("diag") !== "1") return;
  const started = performance.now();
  const records = [];
  let output;
  let lastStart = null;
  let requestId = 0;
  const cleanStack = (stack) =>
    String(stack || "unavailable")
      .replace(/https?:\/\/[^\s)]+/g, (raw) => {
        try {
          const url = new URL(raw);
          // Omit query, fragment and credentials; keep origin/path and any attached line numbers.
          return url.origin + url.pathname;
        } catch {
          return "[URL omitted]";
        }
      })
      .slice(0, 3000);
  const record = (event, detail = {}) => {
    records.push({
      event,
      at: new Date().toISOString(),
      elapsedMs: Math.round(performance.now() - started),
      ...detail,
    });
    if (records.length > 100) records.shift();
    if (output) output.textContent = JSON.stringify(records, null, 2);
  };
  const cleanAddress = (address) => {
    if (!address || ["inline", "eval", "wasm-eval"].includes(address))
      return address;
    try {
      const url = new URL(address, location.origin);
      return ["http:", "https:"].includes(url.protocol)
        ? (url.origin + url.pathname).slice(0, 1000)
        : url.protocol + "[address omitted]";
    } catch {
      return "[address omitted]";
    }
  };
  document.addEventListener("securitypolicyviolation", (event) => {
    record("csp-violation", {
      directive: (event.effectiveDirective || event.violatedDirective).slice(
        0,
        200,
      ),
      blockedAddress: cleanAddress(event.blockedURI),
      disposition: event.disposition,
      trusted: event.isTrusted,
    });
  });
  const activation = () => ({
    active: navigator.userActivation?.isActive ?? null,
    hasBeenActive: navigator.userActivation?.hasBeenActive ?? null,
  });
  document.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element) || !event.target.closest("#start"))
        return;
      lastStart = performance.now();
      record("start-click", { trusted: event.isTrusted, ...activation() });
    },
    true,
  );
  try {
    const devices = navigator.mediaDevices;
    if (!devices || typeof devices.getUserMedia !== "function") {
      record("unavailable", {
        reason: "getUserMedia is unavailable in this context",
      });
    } else {
      const original = devices.getUserMedia;
      const wrapped = function (...args) {
        const id = ++requestId;
        record("camera-request", {
          id,
          ...activation(),
          sinceStartMs:
            lastStart === null
              ? null
              : Math.round(performance.now() - lastStart),
          stack: cleanStack(new Error().stack),
        });
        try {
          const promise = Reflect.apply(original, this, args);
          // Observe settlement only. Preserve the original promise, stream and rejection for callers.
          promise.then(
            () => record("camera-settled", { id, outcome: "resolved" }),
            (error) =>
              record("camera-settled", {
                id,
                outcome: String(error?.name || "Error").slice(0, 80),
              }),
          );
          return promise;
        } catch (error) {
          record("camera-threw", {
            id,
            outcome: String(error?.name || "Error").slice(0, 80),
          });
          throw error;
        }
      };
      devices.getUserMedia = wrapped;
      if (devices.getUserMedia !== wrapped)
        throw new Error("Cannot wrap camera API");
      record("installed", {
        ...activation(),
        context: window === window.top ? "top-level page" : "this frame only",
      });
    }
  } catch {
    record("unavailable", {
      reason: "Camera API could not be wrapped; requests may not be observed",
    });
  }
  const mount = () => {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "/camera-diagnostics.css";
    document.head.append(stylesheet);
    const panel = document.createElement("section");
    panel.id = "camera-diagnostics";
    panel.setAttribute("aria-labelledby", "camera-diagnostics-title");
    const title = document.createElement("h2");
    title.id = "camera-diagnostics-title";
    title.textContent = "Camera diagnostics — local page memory only";
    const explanation = document.createElement("p");
    explanation.textContent =
      "Observes calls through this page’s wrapped getUserMedia after installation. Other tabs, frames, earlier calls and saved original references are not covered. Activation and nearby Start clicks do not prove user intent. CSP violations observed in this document after installation are also logged; earlier events and worker/frame events are not covered. No footage, device identifiers or constraints are logged. Reload clears records. Screenshots: before Start only, or Stop first and exclude the video area.";
    const clear = document.createElement("button");
    clear.type = "button";
    clear.textContent = "Clear diagnostic log";
    clear.addEventListener("click", () => {
      records.length = 0;
      lastStart = null;
      output.textContent = "[]";
    });
    output = document.createElement("pre");
    output.id = "camera-diagnostics-log";
    output.textContent = JSON.stringify(records, null, 2);
    panel.append(title, explanation, clear, output);
    document.body.append(panel);
  };
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();
})();
