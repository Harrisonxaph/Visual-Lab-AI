import { runSyntheticBenchmark } from "../tracking/benchmark";
import { runStressProfile } from "../tracking/stress-profile";
import { SYNTHETIC_FIXTURES } from "../tracking/fixtures";
import type { TrackerConfig } from "../tracking/types";
import type { LabState } from "../lab";
export function mountBenchmark(
  container: HTMLElement,
  configuration: () => TrackerConfig,
) {
  container.insertAdjacentHTML(
    "beforeend",
    `<p>Labelled synthetic numeric sequences evaluate association, not detector accuracy. Detector inference is not run. Fixture-defined ID changes/fragments are not standard MOT scores. The small benchmark allows paused inference (preview remains on). The stress profile requires the camera to be stopped and uses no camera, model or saved notes.</p><button id="run-benchmark" type="button">Run synthetic benchmark</button><button id="run-stress-profile" type="button">Stress profile (synthetic, no camera)</button><button id="cancel-benchmark" type="button" disabled>Cancel benchmark/profile</button><p id="benchmark-status" role="status">Not run.</p><div id="stress-profile-summary"></div><pre id="benchmark-results"></pre>`,
  );
  const run = container.querySelector<HTMLButtonElement>("#run-benchmark")!,
    stress = container.querySelector<HTMLButtonElement>("#run-stress-profile")!,
    cancel = container.querySelector<HTMLButtonElement>("#cancel-benchmark")!,
    status = container.querySelector<HTMLElement>("#benchmark-status")!,
    summary = container.querySelector<HTMLElement>("#stress-profile-summary")!,
    output = container.querySelector<HTMLElement>("#benchmark-results")!;
  let controller: AbortController | null = null,
    token = 0,
    state: LabState = "idle",
    kind: "benchmark" | "stress" | null = null;
  const allowed = () => ["idle", "stopped", "paused", "error"].includes(state),
    stressAllowed = () => ["idle", "stopped", "error"].includes(state);
  const buttons = () => {
    run.disabled = !allowed() || !!controller;
    stress.disabled = !stressAllowed() || !!controller;
    cancel.disabled = !controller;
  };
  const clear = () => {
    output.textContent = "";
    summary.replaceChildren();
  };
  const stop = (reason = "Cancelled synthetic benchmark/profile.") => {
    if (!controller) return;
    token++;
    controller.abort();
    controller = null;
    kind = null;
    clear();
    status.textContent = reason;
    buttons();
  };
  cancel.addEventListener("click", () => stop());
  const launch = async (mode: "benchmark" | "stress") => {
    if (controller || !(mode === "stress" ? stressAllowed() : allowed()))
      return;
    const current = ++token,
      abort = new AbortController();
    controller = abort;
    kind = mode;
    clear();
    status.textContent =
      mode === "stress"
        ? "Warming synthetic tracker…"
        : "Running synthetic benchmark…";
    buttons();
    try {
      if (mode === "stress") {
        const report = await runStressProfile(abort.signal, {
          config: configuration(),
          onProgress: (phase, completed, total) => {
            if (current === token && !abort.signal.aborted)
              status.textContent = `Synthetic stress ${phase}: ${completed} / ${total}`;
          },
        });
        if (current !== token || abort.signal.aborted) return;
        output.textContent = JSON.stringify(report, null, 2);
        const intro = document.createElement("p"),
          table = document.createElement("table"),
          caption = document.createElement("caption");
        caption.textContent = "Synthetic tracker timings (milliseconds)";
        table.append(caption);
        const header = document.createElement("tr");
        for (const label of ["Measured work", "p50", "p95", "Max"]) {
          const cell = document.createElement("th");
          cell.scope = "col";
          cell.textContent = label;
          header.append(cell);
        }
        table.append(header);
        for (const [name, metrics] of [
          [
            "Tracker.update, including returned copy",
            report.updateIncludingReturnCopy,
          ],
          ["Extra Tracker.snapshot copy", report.explicitSnapshotCopy],
          ["Combined", report.combined],
        ] as const) {
          const row = document.createElement("tr");
          const label = document.createElement("th");
          label.scope = "row";
          label.textContent = name;
          row.append(label);
          for (const n of [metrics.p50, metrics.p95, metrics.max]) {
            const td = document.createElement("td");
            td.textContent = n.toFixed(2);
            row.append(td);
          }
          table.append(row);
        }
        intro.textContent = `${report.samples} measured updates after ${report.warmupFrames} warmup frames: ${report.liveTracks} live tracks (${report.activeTracks} active / ${report.lostTracks} lost), ${report.detectionsPerFrame} detections, ${report.retainedSamples} retained samples including gap markers. ${report.budgetExceeded ? "8 ms update p95 investigation budget exceeded." : "Within the 8 ms update p95 investigation budget in this run."} This fixed fixture is not every possible worst case or a camera/accuracy benchmark. ${report.observedLongTasks.supported ? `${report.observedLongTasks.entries.length} recorded main-thread long tasks overlapping the measurement interval (whole-task durations; not attributable solely to tracking). ${report.observedLongTasks.dropped ? `${report.observedLongTasks.dropped} observation entries were dropped; the record is incomplete.` : ""}` : "Long-task observation unavailable in this browser; absence of long tasks is not established."}`;
        summary.append(intro, table);
        status.textContent = "Completed synthetic stress profile.";
      } else {
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
      }
    } catch (e) {
      if (current === token)
        status.textContent =
          e instanceof Error ? e.message : "Synthetic work failed.";
    } finally {
      if (current === token) {
        controller = null;
        kind = null;
        buttons();
      }
    }
  };
  run.addEventListener("click", () => void launch("benchmark"));
  stress.addEventListener("click", () => void launch("stress"));
  return {
    setState(next: LabState) {
      state = next;
      if (controller && !(kind === "stress" ? stressAllowed() : allowed()))
        stop("Cancelled before camera/inference startup.");
      buttons();
    },
    cancel: () => stop(),
    destroy() {
      stop();
      container.replaceChildren();
    },
  };
}
