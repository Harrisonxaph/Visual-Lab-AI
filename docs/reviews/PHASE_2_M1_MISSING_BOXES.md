# Phase 2 M1 — missing-box investigation

Date: 2026-10-26 UTC. **M1 remains blocked; D12–D14 is unresolved.** No production-runtime fix
was made because the reported device failure has not been reproduced without fault injection.
No device acceptance session is started by this report.

## Exact sources and CI

- Latest main inspected: `21bbabf7cd0743d17337ee6cdd627c272abbf49c`, PR #15 merge,
  2026-10-26 16:11:49 UTC (Git commit time).
- Its merge CI [40356764338](https://github.com/Harrisonxaph/Visual-Lab-AI/actions/runs/40356764338)
  completed successfully on that exact SHA.
- Existing preview source: `37ff7d4be571d56c21c1f74bae834c3fe16c7952`,
  https://visual-lab-l8m3xumpt-harrisonjbailey-3896.vercel.app.
- Both source commits have the same `src` tree: `a57ecd74198ce77e8032e9f3a7f073a12b7359f8`.
  The Git diff between them contains no runtime, test, dependency or Vercel configuration changes.
  This is source equivalence evidence, not a new deployed-browser observation.
- The investigation branch adds browser investigation coverage and documentation only. It is not
  deployed. No sharing/bypass URL or production/protection/project/Git-automation change occurred.

## Physical report and uncertainty

The [original ledger](../validation/PHASE_2_DEVICES_2026-10-26.md) retains D12–D14 verbatim:
no boxes, reportedly Running with moving video and LIVE INPUT, and “6 objects” below. The last
report did not identify the explicitly labelled **Visible detections** metric versus retained
Tracks or another list. No threshold, current output, drawing-context state or composited-pixel
capture was supplied. D9–D11 earlier passes remain historical observations, not proof of current
health. Do not infer re-identification, an overlay defect, a worker stall, or resolution.

## Detection-to-screen trace

| Boundary | Code and consequence |
| --- | --- |
| Camera/capture | `camera.ts` acquires a stream after Start; `capture.ts` bounds bitmap waits and closes late captures. Live video motion by itself does not establish completed inference. |
| Worker output | `inference/detector.worker.ts` maps real detector categories/boxes into pixel-coordinate detections; it never invents alternatives. `client.ts` matches result IDs, times out stalled requests, closes frames/workers and reports fatal errors. |
| Lifecycle/commit | `lab.ts` accepts results only in the current running generation. Camera size changes close a geometry segment; captured size changes advance geometry even before a video resize event. Pause, Stop and stale generations cannot commit old results. |
| Tracking | `inspection/controller.ts` normalizes/clips boxes for tracking. Public IDs/history can remain after temporary loss or expiry. The track list explicitly labels lost/ended entries as last observed; a list entry is not a current visible detection. |
| Visibility/count | `main.ts` uses `visibleDetections` to apply the display threshold and clipping, with aspect-ratio and stale-analysis guards. The Visible detections metric and Detected objects list use this current projected array. Category filtering changes the track list, not this box array. |
| Overlay | The same projected array reaches `overlay.ts`, using intrinsic frame pixels and a shared contain-fit video/canvas container. Trails use normalized history and break at missing samples. A missing 2D context returns without drawing; this code path is possible but is not evidence that it happened on the iPhone. |
| Presentation | A positive current count proves projected data reached that render, not successful canvas painting or browser composition. Reading canvas pixels alone is also insufficient to prove the video did not obscure it, so the new probes sample a composited stage screenshot as well. |

## Automated reproduction attempts

New tests: `tests/browser/overlay-investigation.spec.ts`. Tests use a generated dark canvas video,
a real video/capture/worker transport and an explicitly mocked six-detection worker. They exercise
actual application UI/controller/tracker/overlay code. They do **not** run detector inference or
use a physical camera. Existing production tests separately exercise the actual Lite0 runtime.

Environment: Linux Chromium 154, Playwright 1.56.1, 390×844 CSS px, DPR 3 and touch emulation;
a landscape-sized viewport and a changed synthetic video size are also exercised. This is not
iOS Safari and does not measure physical camera rotation, battery or thermal conditions.

| Attempt | Observed result and limit |
| --- | --- |
| Six current detections, selection by list and stage tap, confidence history, Off/2/5/10 s trails, scroll away/back | All six known box-border regions paint in the overlay bitmap and composited screenshot. No unforced disappearance in this scenario. |
| Retained history under live processing | Wait until the first retained sample time advances (20-second time-window pruning), without assuming the 10 FPS cap is attained. Then repeat drawing/control assertions. This is not a multi-minute or mobile soak test. |
| Brief loss then return | Current count becomes zero and the canvas clears; the same confirmed IDs return before expiry. No unforced mismatch observed. |
| Longer loss/expiry | LIVE INPUT continues, Visible detections is zero, six ended/last-observed tracks remain listed, and the canvas is clear. Return confirms new IDs and redraws six boxes. This expected state is consistent with one interpretation of “six objects below”; it does not explain which state the iPhone actually had. |
| Display threshold 100% then 5% | Count/boxes disappear and return while retained/active tracking remains. This is another expected distinction between tracking history and visible boxes, not a diagnosis of D12. |
| CSS viewport resize and synthetic camera geometry change | Current boxes remain painted; actual synthetic video size change produces a new segment. No observed size-change stall in this scenario. |
| Pause/Resume/Stop | Pause and Stop clear overlay ink; Resume restores current detections. No unforced mismatch observed. |
| Controlled fault: make only the overlay canvas return no 2D context | Running/LIVE INPUT and six current detections remain, but no border pixels paint. This **forced context-unavailability probe** establishes a lookalike, not a naturally reproduced defect or evidence of Safari context loss. No speculative recovery patch was added. |

During test development, a green-only screenshot predicate initially missed the intentionally
white selected-track border; it was corrected to recognize both normal and selected borders.
A separate test assumption expected at least 195 retained samples at a capped 10 FPS and timed
out with 186. The history also expires by time, so the test now observes actual first-sample
pruning instead of demanding a frame rate. These were investigation-test assumptions, not
production failures or fixes to the device report.

## Browser-engine availability

- Chromium: system executable `/usr/bin/chromium`, version 154; automated execution available.
- Automated WebKit: Playwright's existing WebKit 26.0 runtime/build 2215 downloaded to a temporary
  directory, but launch failed before any app test because host libraries are missing:
  `libgtk-4.so.1`, `libgraphene-1.0.so.0`, `libwoff2dec.so.1.0.2`, `libharfbuzz-icu.so.0`,
  `libhyphen.so.0`, `libmanette-0.2.so.0`, `libGLESv2.so.2`. No system or project dependencies
  were added. Automated WebKit app coverage is **Pending/unavailable**, not a pass.
- Physical Safari: only the existing user-reported ledger evidence; no new observation requested
  or inferred from Chromium. Even a successful Linux WebKit run would not certify iPhone Safari.

## Verification

Local verification completed: **79 unit, 51 development-browser and 14 production tests passed**,
plus TypeScript, Prettier, build, local Markdown-link and diff checks. Production tests include
actual CPU/WASM Lite0 with a synthetic image stream under the existing CSP, with/without diagnostics.
The 51-test development run includes the three new controlled probes. Exact investigation commit
and remote CI are recorded on its draft PR; the source merge CI above is separate evidence.
Do not confuse these counts with physical-device results. No production runtime/configuration,
package manifest, lockfile or CI workflow changed.


## Subsequent screenshot — working view, not incident resolution

Ledger D16 records a user-supplied screenshot with Running/LIVE INPUT, Segment 1 and visible
#2 tv 71% / #1 keyboard 71% boxes. The image appears to show a browser panel over ChatGPT;
device, OS and browser/container attribution is unconfirmed. The Visible detections metric
is not shown, so this is not an answer to the earlier six-current-versus-history ambiguity.
The raw screenshot/footage was not added to the repository. This working still view does not
explain the earlier failure, prove automatic recovery or pass physical iPhone/iPad testing.
Only a source-context clarification is requested; no new routine device test is started.

## M1 decision and smallest necessary device evidence

Unforced positive-current-count/empty-overlay behaviour was **not reproduced in the completed
normal probes**. This does not close D12–D14. The tests demonstrate that both retained-history
and forced-unavailable-canvas scenarios can resemble the report; automation cannot identify
which was present on the user's device.

One focused clarification is justified at a recurrence, without restarting the whole acceptance
walkthrough. On the existing preview, read the metric literally labelled **Visible detections**
(next to Inference time and Processing speed), not the Tracks list. Fixed choices:

- A — Current Visible detections is above zero while the live video has no boxes.
- B — Current Visible detections is zero; objects are listed in Tracks/history.
- C — The problem is not currently reproducible.
- D — Unable/not checked.

A would narrow investigation toward the paint/presentation path; B would narrow it toward actual
current output/filtering or expected loss, still requiring the threshold/current scene to
interpret. Neither choice alone proves a historical root cause. C/D leave it unresolved. Do not
request raw footage or claim this question is a full device round. A new diagnostic deployment
would require separate approval; the existing deployment authorization is consumed.

The [two consolidated M2 worksheets](../validation/PHASE_2_M2_ACCEPTANCE_WORKSHEETS.md) are prepared
for later readiness review only. They are **not active** and must not be run until M1 readiness is
established. Existing unaffected evidence and all accepted Phase 1 limitations remain.
