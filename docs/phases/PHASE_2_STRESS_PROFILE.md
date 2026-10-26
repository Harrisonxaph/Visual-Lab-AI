# Phase 2 device stress profile follow-up

Baseline: merged PR #11 at `efdb1d98825d4960e91882156f08b3f1067abe91`,
2026-10-26 10:59:06 UTC. Merge CI [40311618092](https://github.com/Harrisonxaph/Visual-Lab-AI/actions/runs/40311618092)
passed. This follow-up adds measurement capability; it does not close the performance risk or
supply physical-device evidence. No deployment, merge, new dependency or Phase 3 is authorized.

## Changes

- The benchmark panel has **Stress profile (synthetic, no camera)**. It requires this lab's camera
  to be stopped; it is disabled during loading, running and paused preview. The existing small
  labelled benchmark still permits paused inference. The two workloads cannot run together.
- A separate tracker executes fixed numeric fixture v1: 184 warmup updates, then 50 measured
  updates; 100 live tracks (50 active / 50 lost), 50 detections/frame and 10,150 retained samples
  including 50 null gap markers. Synthetic time advances 5 ms/frame; elapsed wall time is unrelated.
  This is one fixed dense-copy fixture, not all possible worst-case association layouts.
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
- Incorrect/unstable notes without selection now say **Select a track first.** Text input has native
  `maxlength=500`, a live `n / 500` count and a separate over-limit message. The native UI count
  follows textarea UTF-16 length; stored schema validation remains backward-compatible.
- Notes now read model/tracking floors from actual tracker configuration; the form no longer
  recomputes the tracking floor from a default. Existing saved notes are not rewritten.

## Automated evidence and current limits

75 unit, 46 development-browser and 13 production tests pass locally on Linux Chromium 154.
Production includes the actual built profile UI under the existing CSP. Tests cover no camera
request/storage write, unsupported long-task API, 390 px layout, loading/paused/running gates,
cancellation, non-default configuration provenance, native text limit/count, full sample counts,
separate timing intervals, median and overlapping-task handling. Phase 1/2 regressions stay green.
Type, format, build, documentation-link and diff checks pass. Exact final commit/CI is in the PR.

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
3. Record all p50/p95/max values, config, fixture version, sample/live/result/retained counts,
   elapsed time and long-task supported/unsupported/drop fields. Copy/select the raw JSON manually
   if useful. Keep this report distinct from live inference ms/FPS and user-observed tracking quality.
4. Record battery/heat observations without treating one run as an energy benchmark. One run can
   vary; repeat under declared comparable conditions if an over-budget result needs investigation.
5. Run again and Cancel during warmup and measurement where practical; no completed partial report
   should appear. Start the camera during a pending profile; it must cancel before startup. Confirm
   the button remains disabled during loading/running/paused preview, and returns after Stop.
6. Log results separately for iPhone and iPad. Do not mark these steps Pass based on Chromium tests.

This document does not authorize a preview; merge and any later preview require separate approval.
