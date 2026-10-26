# Phase 2 M2 — consolidated device acceptance worksheets

**Prepared, not started. M1 is blocked by the unresolved missing-box report.** These sheets do
not authorize a session, deployment, merge, risk acceptance, Phase 2 closure or Phase 3. Use after
the [M1 investigation/readiness review](../reviews/PHASE_2_M1_MISSING_BOXES.md), against an exact
stable source whose preview is authorized. No routine sequence of chat questions is required.

Existing preview: https://visual-lab-l8m3xumpt-harrisonjbailey-3896.vercel.app
Source: `37ff7d4be571d56c21c1f74bae834c3fe16c7952`. It does not include future fixes. Source/impact
review determines which earlier evidence is reusable. A necessary changed runtime needs its own
approved preview; no more deployment is authorized now.

For each grouped result choose **A Pass / B Issue / C Partial / D Not tested**. Pass applies only
when all listed checks were observed, or explicitly identifies reused evidence for an unchanged
path. Add exact errors and numerical outputs when requested. Untested subchecks stay Pending;
a partial result is not a blanket pass. Supply one completed report per device. Stop at a
material failure and record the affected group rather than repeating every group.

Keep raw footage private. Copy diagnostics after Stop and exclude the video from screenshots.
No network/privacy inference from a working camera or CSP; no actual storage-denial inference
from Private Browsing. Preserve all [accepted Phase 1 limits](../phases/PHASE_1_CLOSEOUT.md).
Any additional untested item requires an explicit closeout disposition, not an invented reason.

## iPhone worksheet — reuse unaffected evidence

Preview: https://visual-lab-l8m3xumpt-harrisonjbailey-3896.vercel.app
Previously confirmed: iPhone 15 Pro / iOS 27.0.1 / Safari. Reconfirm at the actual session;
record Safari build if accessible. All rows below are Pending, not new tests performed here.

Reusable, subject to change-impact review: D1–D2 device/pre-Start observations; D4 small synthetic
benchmark; D5 exact 100×50 timing report; D6 not charging/Low Power Mode off for that run; D7–D9
manual/Start cancellation and live baseline; D10 continuity; D11 selection/chart/trail controls.
Do not repeat their unaffected checks merely because tests/docs changed. D3's workload ambiguity
and D12–D14's missing-box incident remain as recorded; this reuse does not resolve them.

| Group | Remaining focused observations | Result |
| --- | --- | --- |
| I1 — Current overlay and temporal tracking | After M1 is cleared, perform only the affected overlay regression if warranted. Two-object crossing if available; brief loss/reassociation and longer expiry; inspect loss/reacquisition/exit events and chart/trail gaps. No ground-truth switch-rate claim. | Pending |
| I2 — Thresholds and explorer | With a stable scene, 5% / 50% / 100% then restore; display filtering must not itself reset identity. Check actual returned near-band list, unavailable alternatives and category search. Qualify any loss/ambiguity. | Pending |
| I3 — Mobile and lifecycle | Portrait/landscape/zoom, scroll/tap alignment; geometry-boundary notice and dismissal across updates. Pause keeps preview; background return stays paused; Resume starts a segment; Stop and navigation release camera. Return stays inactive until Start. | Pending |
| I4 — Notes | Missed note without selection; incorrect/unstable requires selection; safe text/count, memory-only default, explicit save/reload/disable/delete one/all. Actual metadata-floor correctness has automated coverage; do not claim physical inspection if not viewed. | Pending |
| I5 — Remaining jobs and diagnostics | Reuse D4–D9 where unchanged. Check feasible remaining Resume/hide/page-exit cancellations and retry; distinguish too-fast-to-interrupt from passed. If running diagnostics, use ?diag=1 on the same preview, Stop before Copy log/fallback/Clear. No forced full stress rerun unless a relevant timing/config change warrants it. | Pending |
| I6 — Sustained use | One five-minute run; record beginning/end inference ms and processing FPS, battery, charging/Low Power Mode, subjective warmth, responsiveness, any warnings. Observe ordinary motion/selection during the run; no energy/thermal causal claim. | Pending |

Response fields: exact preview/source and session time; current device/browser; I1–I6 choices;
subchecks skipped; error wording; five-minute values/conditions; any new stress JSON only if relevant.
Keep offline/cached-failure reproduction, quantified probe delay and other untested checks in the
ledger for explicit disposition; do not silently convert them to Pass or start extra rounds.

## iPad worksheet — first consolidated session

Preview: https://visual-lab-l8m3xumpt-harrisonjbailey-3896.vercel.app
Previously reported: iPad Pro 11-inch (3rd generation) / iPadOS 26.6.2 / Safari; current Phase 2
details/results not confirmed. Phase 1 iPad observations do not pass Phase 2-specific checks.

| Group | Consolidated observations | Result |
| --- | --- | --- |
| P1 — Baseline and timing | Confirm device/browser/conditions; fresh plain page Idle, camera off, no pre-Start prompt. Camera-off 100×50 stress run: paste full JSON once, record responsiveness, clock step/window/source/verdict and conditions; no long-task or clock assumptions. Manual Cancel and Start cancellation where feasible; Start explicitly restores live video, labels/confidence/public IDs. Running/loading gates only if actually observed. | Pending |
| P2 — Tracking and inspection | Thirty-second slow movement; list/tap selection and confidence history; Off/2/5/10 s trails; two-object crossing if available; brief loss and long expiry with events and gaps. Record qualitative ID continuity separately from synthetic evaluation. | Pending |
| P3 — Visibility and layout | Thresholds 5% / 50% / 100% then restore, real near-band outputs, unavailable alternatives and explorer search. Portrait/landscape/zoom, contain-fit selection alignment, responsive stacked/paired layout and scrolling. | Pending |
| P4 — Lifecycle and jobs | Pause/background/Resume/Stop, geometry/segment notices and dismissal, navigation/back inactive until Start. Shared synthetic job cancellation/retry including Resume/hide/page-exit where feasible; no partial results presented as completed. Record benchmark fixture outputs separately from 100×50 stress results. | Pending |
| P5 — Local notes and diagnostics | Memory-only default, selection/text validation, safe display, opt-in persistence/reload/disable/delete one/all. Diagnostic Copy log/fallback/Clear after Stop if enabled with ?diag=1. Keep actual storage refusal and network inspection limits explicit. | Pending |
| P6 — Sustained use | Five-minute run with beginning/end inference ms/FPS/battery, power conditions, subjective warmth, responsiveness and exact warnings/errors. | Pending |

Response fields: exact preview/source/session time; device/OS/browser/build if accessible; P1–P6
choices and skipped subchecks; full stress report; small benchmark output if exercised; exact
errors; five-minute start/end values/conditions. A newly supplied report does not by itself pass
unreported controls, storage, lifecycle or privacy checks.

## Closeout handling

Retest affected behaviour only after a material fix and explain the impact. Proposed reliance on
automation for a new unavailable device check must be explicit and user-accepted; original Phase 1
accepted limitations stay accepted. A device pass or approval of ledger accuracy is not acceptance
of risk or permission to merge, deploy, close Phase 2 or start Phase 3.
