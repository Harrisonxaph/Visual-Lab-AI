# Phase 2 device stress profile follow-up

Baseline: merged PR #11 at `efdb1d98825d4960e91882156f08b3f1067abe91`,
2026-10-26 10:59:06 UTC. Merge CI [40311618092](https://github.com/Harrisonxaph/Visual-Lab-AI/actions/runs/40311618092)
passed. This follow-up adds measurement capability; it does not close the performance risk or
supply physical-device evidence. No deployment, merge, new dependency or Phase 3 is authorized.

## Changes

- The benchmark panel has **Stress profile (synthetic, no camera)**. Like the small benchmark, it runs only while idle, stopped, paused or in error; it is disabled
  during loading/running and while either synthetic job is busy. In paused state, the existing
  camera preview remains on, but the profile reads no frames. Choose Stop for a camera-off run.
  The two synthetic workloads cannot run together.
- A separate tracker executes fixed numeric fixture v1: 184 warmup updates, then 50 measured
  updates; 100 live tracks (50 active / 50 lost), 50 detections/frame and 10,150 retained samples
  including 50 null gap markers. Synthetic time advances 5 ms/frame; elapsed wall time is unrelated.
  All 50 detections share a single box. The 50 lost tracks lie outside matching gates, so
  half of the matching table cannot match. This is one fixed dense-copy fixture, not all possible
  worst-case association layouts.
- Reported milliseconds separate `Tracker.update` (validation, association, history and its returned
  defensive snapshot), an **extra** `Tracker.snapshot()` copy and combined work. Frame construction
  is outside these timing stamps. p50 is the median (average middle two for even counts); p95 uses
  nearest rank; max is the largest observed sample. Full raw JSON accompanies the phone-friendly table.
- It yields after every warmup/measured update. Cancel, Start/Resume, background and page exit
  cancel pending work; stale callbacks cannot publish a completed partial result. One synchronous
  tracker call cannot be interrupted midway. No camera request, model inference, footage or storage
  write is made by the profile. Results remain in page memory until replaced or navigation/reload.
- Config comes from the live tracker's defensive configuration read. Fixture version, score,
  counts, browser-reported environment, measurement interval and build ID (Unknown unless supplied)
  accompany results. The 8 ms update p95 threshold is an investigation flag, not an accuracy score
  or a universal performance guarantee.
- Optional long-task observation records whole tasks **overlapping** the measurement interval,
  including tasks that started slightly earlier. These may contain non-tracker work. Unsupported
  observation is explicit, not zero proven long tasks. The report caps entries at 100 and discloses
  drops; observation availability and browser clock resolution limit these measurements.
- Incorrect/unstable notes without selection now say **Select a confirmed track first (list or video tap).** Text input has native
  `maxlength=500`, a live `n / 500` count and a separate over-limit message. The native UI count
  follows textarea UTF-16 length; visible help explains that emoji can count as more than one
  character. Stored schema validation remains unchanged and limits Unicode code points.
- Notes now read model/tracking floors from actual tracker configuration; the form no longer
  recomputes the tracking floor from a default. Existing saved notes are not rewritten.

## Automated evidence and current limits

Merged PR #12 evidence: 75 unit, 47 development-browser and 13 production tests passed
locally on Linux Chromium 154.
Production includes the actual built profile UI under the existing CSP. Tests cover no camera
request/storage write, unsupported long-task API, 390 px layout, loading/running gates, paused-mode availability and Resume cancellation,
cancellation, non-default configuration provenance, native text limit/count, full sample counts,
separate timing intervals, median and overlapping-task handling. Phase 1/2 regressions stay green.
Type, format, build, documentation-link and diff checks passed for that work.
PR #12 merged on 2026-10-26 UTC as `4813abead5b674bc5cdcb0ada7f58a7ff1a1e8fc`,
with final head `3be00120f8720e527624cba08606f9fd9efdfa84` and successful merge CI
[40319920634](https://github.com/Harrisonxaph/Visual-Lab-AI/actions/runs/40319920634).
The merge occurred before the designated review.

A separate read-only Codex review found the start-only long-task filter could omit a long first
update; an independent Chromium injection reproduced that before the overlap fix. The committed
controlled-observer regression first failed, then passed. This is not a Claude review.

Example local run (50 measured updates; Chromium 154, reported hardwareConcurrency 3):

| Work | p50 ms | p95 ms | max ms |
| --- | --- | --- | --- |
| Update including returned copy | 5.15 | 8.20 | 10.10 |
| Extra snapshot copy | 0.65 | 1.80 | 2.10 |
| Combined | 5.80 | 10.00 | 11.10 |

No overlapping long tasks were recorded in that interval; unsupported APIs and unobserved events
must not be interpreted as absence. This run exceeded the 8 ms update p95 investigation budget.
Old developer-only measurements in EXPERIMENTS.md remain historical; the new profiler changes
warmup scheduling and excludes numeric-frame preparation from timed work, so it is not a controlled
before/after comparison against that older driver.

All new real-device results remain **Pending**. Every accepted Phase 1 limitation remains,
including uninspected authenticated network/headers/HTML, actual Safari storage refusal, diagnostic
context/log provenance and unexplained S1/S2. A profile result is not real-scene tracking accuracy,
physical camera performance, battery/thermal validation or evidence about uploads.

## Device procedure after a separately approved preview deployment

1. Record the preview URL and exact deployed commit. Confirm device model, OS/Safari version,
   charging/Low Power Mode, battery, current warmth and other visible workload. Close this lab's
   camera with Stop; verify its indicator is off. Do not infer another tab/app's camera state.
2. Scroll to Synthetic tracking benchmark; tap **Stress profile (synthetic, no camera)**. Confirm
   the camera stays off and progress/control interaction remains usable. Allow warmup to finish.
3. Record the observed clock step (or unavailable), budget verdict, all p50/p95/max values,
   config, fixture version, sample/live/result/retained counts,
   elapsed time and long-task supported/unsupported/drop fields. Copy/select the raw JSON manually
   if useful. Keep this report distinct from live inference ms/FPS and user-observed tracking quality.
4. Record battery/heat observations without treating one run as an energy benchmark. One run can
   vary; repeat under declared comparable conditions if an over-budget result needs investigation.
5. Run again and Cancel during warmup and measurement where practical; no completed partial report
   should appear. Start the camera during a pending profile; it must cancel before startup. Confirm
   the button remains disabled during loading/running. While paused it may run; the preview stays
   on. Resume cancels it. Stop allows a camera-off run.
6. Log results separately for iPhone and iPad. Do not mark these steps Pass based on Chromium tests.

This document does not authorize a preview; merge and any later preview require separate approval.

## Timer precision follow-up

PR #13 merged on 2026-10-26 UTC as `e984edd68463345ed61a757c11c8c78ca0da5c17`,
with final head `ee8f3d6c09b5eb8eedb6831f988a71143f291c39` and successful merge CI
[40329286959](https://github.com/Harrisonxaph/Visual-Lab-AI/actions/runs/40329286959).
It merged before the designated review.

The corrected probe reads until two positive clock changes, with a cap of 1,048,576 comparisons
(plus one initial read). It records the smallest positive delta (`clockStepMs`), or null if none
is observed. The cap bounds work if the clock never advances. The probe precedes warmup and
measured intervals. In the worst case it performs the full comparison cap synchronously on the
main thread without yielding. This can briefly block controls/progress before warmup starts.
There is no wall-clock timeout or guaranteed maximum delay in milliseconds; device speed and
clock-call cost determine it, and the physical-device delay has not been measured. Normal runs
stop early after two changes. The probe delay is outside reported update/copy timings and
`elapsedMs` (which starts after probe/setup), so those fields cannot establish startup responsiveness.
This is an estimate, not guaranteed resolution or accuracy; scheduling and
jitter can affect it. No Safari-specific resolution is assumed.
Table timings use whole milliseconds when the observed step is at least 1 ms or unavailable.
The budget uncertainty window is the observed step, or an explicit **1 ms fallback assumption**
when no step is observed. The report records `budgetWindowMs` and `budgetWindowSource`; the UI
also discloses the window. The fallback is not a proven timer bound. Verdicts are inconclusive
within that window of 8 ms (both boundaries included), otherwise within/exceeded for this run.
Thus an unavailable step no longer makes a 20 ms update p95 inconclusive. The conservative
inclusive edge rule is unchanged; unknown/coarser-than-assumed clocks still limit interpretation.
Record the step and verdict with device results; rounding does not add precision.
All physical-device checks remain Pending. Accepted Phase 1 limitations are unchanged.

Historical PR #13 timer follow-up automated evidence (Linux Chromium, 2026-10-26 UTC): **77 unit,
48 development-browser and 14 production tests passed**, alongside type, formatting, build and
diff checks. New regressions cover bounded probes (including an unchanged clock), both inclusive
budget boundaries, a whole-millisecond injected clock reporting 8 ms as inconclusive, and the
built UI's integer timing cells/verdict with an injected coarse clock under the current CSP.
These injected clocks are automated evidence, not Safari measurements. The note counter is unchanged.

Clock-probe correction evidence (Linux Chromium 154, 2026-10-26 UTC): **79 unit,
48 development-browser and 14 production tests passed**, with type, format, build and diff checks.
In the delayed-clock regression, the injected clock holds the same value for 8,192 reads
per tick. The probe waits for two positive changes before returning. A separate full-profile regression observes no probe step, then 20 ms timings;
it records the 1 ms fallback assumption and an exceeded verdict. These are injected clocks,
not physical-device evidence. All Phase 2 device checks remain Pending.


PR #14 merged on 2026-10-26 UTC as `37ff7d4be571d56c21c1f74bae834c3fe16c7952`,
with final head `f7bc39fcacc5b1a644a727dac908ad225ceb7848`. The separately authorized temporary
preview and physical-device session are recorded in the
[Phase 2 device ledger](../validation/PHASE_2_DEVICES_2026-10-26.md).
Approval is limited to one preview of that exact merge after CI run `40334009325` succeeds;
this documentation branch does not authorize an additional deployment.
