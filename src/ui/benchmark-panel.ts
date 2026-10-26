import { runSyntheticBenchmark } from "../tracking/benchmark";
import { SYNTHETIC_FIXTURES } from "../tracking/fixtures";
import type { LabState } from "../lab";
export function mountBenchmark(container: HTMLElement) {
  container.insertAdjacentHTML(
    "beforeend",
    `<p>Labelled synthetic numeric sequences evaluate association, not detector accuracy. Detector inference is not run. Fixture-defined ID changes/fragments are not standard MOT scores. Stop or pause inference before running (paused preview remains on). No image/video data is used.</p><button id="run-benchmark" type="button">Run synthetic benchmark</button><button id="cancel-benchmark" type="button" disabled>Cancel benchmark</button><p id="benchmark-status" role="status">Not run.</p><pre id="benchmark-results"></pre>`,
  );
  const run = container.querySelector<HTMLButtonElement>("#run-benchmark")!,
    cancel = container.querySelector<HTMLButtonElement>("#cancel-benchmark")!,
    status = container.querySelector<HTMLElement>("#benchmark-status")!,
    output = container.querySelector<HTMLElement>("#benchmark-results")!;
  let controller: AbortController | null = null,
    token = 0,
    state: LabState = "idle";
  const allowed = () => ["idle", "stopped", "paused", "error"].includes(state);
  const buttons = () => {
    run.disabled = !allowed() || !!controller;
    cancel.disabled = !controller;
  };
  const stop = (reason = "Cancelled synthetic benchmark.") => {
    if (!controller) return;
    token++;
    controller.abort();
    controller = null;
    output.textContent = "";
    status.textContent = reason;
    buttons();
  };
  cancel.addEventListener("click", () => stop());
  run.addEventListener("click", async () => {
    if (!allowed() || controller) return;
    const current = ++token,
      abort = new AbortController();
    controller = abort;
    output.textContent = "";
    status.textContent = "Running synthetic benchmark…";
    buttons();
    try {
      const reports = await runSyntheticBenchmark(
        SYNTHETIC_FIXTURES,
        abort.signal,
        () => new Promise((r) => setTimeout(r, 10)),
      );
      if (current !== token || abort.signal.aborted) return;
      output.textContent = JSON.stringify(
        reports,
        (key, value) =>
          key === "recoveryRate" && value === null ? "Not measured" : value,
        2,
      );
      status.textContent = "Completed labelled synthetic benchmark.";
    } catch (e) {
      if (current === token)
        status.textContent =
          e instanceof Error ? e.message : "Benchmark failed.";
    } finally {
      if (current === token) {
        controller = null;
        buttons();
      }
    }
  });
  return {
    setState(next: LabState) {
      state = next;
      if (!allowed()) stop("Cancelled before camera/inference startup.");
      buttons();
    },
    cancel: () => stop(),
    destroy() {
      stop();
      container.replaceChildren();
    },
  };
}
