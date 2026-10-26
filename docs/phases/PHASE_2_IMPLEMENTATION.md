# Phase 2 implementation — awaiting review and physical acceptance

Branch `phase-2/tracking`, draft [PR #11](https://github.com/Harrisonxaph/Visual-Lab-AI/pull/11).
Approved design/plan baseline: `559bd645aa5c9be636169435e02b74df5a6374df`.
Task 3 checkpoint `a73014743bc10b1a187474ffbc0ebb147a27d9f7` was approved; the user
separately authorized Tasks 4–6 on 2026-10-26 UTC. Exact final source SHA and remote CI are
recorded in the PR. This document does not close Phase 2 or authorize merge/deployment/Phase 3.

## Implemented scope

Task 4 adds a selectable inspector with current association evidence and bounded event history,
a raw-confidence chart with null gaps and numeric text equivalent, actual returned near-threshold
boxes, explicit unavailable alternatives, searchable pinned 80-label catalog, observed-label
filter and Off/2/5/10-second trails. Short stage taps respect contain-fit geometry; scroll/pinch
are not suppressed. Phone-width views stack video/list and inspector/chart; wider views pair
only at the reviewed content minima. DOM/chart updates are limited to 4 Hz except controls.

Diagnostic Copy log takes the complete bounded JSON snapshot on click. Clipboard success is
reported only after completion; denied/unavailable clipboard uses selectable read-only text.
Clear removes fallback/status as well as records and invalidates pending UI callbacks. An already
initiated clipboard operation cannot be revoked; clipboard/sync are outside page memory.

Task 5 stores user-reported missed/incorrect/unstable notes as validated metadata, never footage.
The canonical RAM store and saved envelope both enforce 100 entries / 256 KiB UTF-8. Guarded
localStorage uses `visual-labs.phase2.failure-notes.v1`. Reading saved notes does not enable
writes. Per-page opt-in enables saving. Failed deletion retains visible records and an error;
corrupt saved data is preserved until explicit reset. Tracking clear and note deletion are separate.
Free text is rendered as text and may contain personal information users enter. No training or
model correction happens from a note.

Task 6 adds a separate, cancellable labelled numeric benchmark, at most 120 frames / 10 objects
per fixture, yielding every 10 frames. It runs only with inference inactive (including paused
preview, which stays on). Start/Resume and background/page exit cancel it. Late or partial
reports never become completed reports. It records fixture/version, config, sample count,
processing and elapsed time, browser-reported environment and build ID (Unknown unless supplied).
The detector is not run. This is not the Phase 3 experiment/dataset/import/export system.

Lab alone detects the >2-second analysis gap. The duplicate controller gap detector was removed;
controller tests now supply the actual boundary contract. Live tracker state remains independent
of display threshold, search and benchmark state.

## Automated evidence

Local Linux Chromium 154 (hardwareConcurrency reported 3), Node 24.19.0:

- **69 unit tests pass**, including all Phase 1 regressions; projection/gap/boundary tests,
  noise counters, defensive snapshot/evidence isolation, storage integrity, independent evaluator
  outcomes, recovery windows, global matching and stable ties, limits and cancellation.
- **42 development browser tests pass**: real worker probe, control/lifecycle regressions,
  phone/wide layouts, stale last-observed labels, synthetic pagehide/pageshow restoration, note consent/reload/deletion/denial and safe text, diagnostic copy/fallback/
  Clear races, benchmark cancellation, startup cancellation and stress profiling.
- **12 production browser tests pass** under the existing CSP with GPU disabled: actual Lite0
  worker→tracker→selectable inspector/chart, threshold and Stop in normal and diagnostic modes;
  diagnostics/CSP/header probes remain intact.
- Type check, formatting, production build, relative documentation links and diff checks pass.
  Remote exact-head CI is separate evidence, linked in PR #11 after it finishes.

Mocks/fixtures do not establish real Safari camera, storage, tracking or battery behavior.
Existing Phase 1 physical observations and accepted limits are preserved, not expanded by this run.
No new physical observations, preview, production deployment or deployed-header inspection occurred.

## Profiling and investigation

Developer test: 100 live slots (50 active / 50 lost), 50 returned detections, roughly 10,100 retained
samples after warmup; 50 measured updates at synthetic 5 ms spacing. This is stress logic timing,
not camera FPS. Update includes its returned defensive snapshot. Explicit copy simulates a further
read; the live UI now avoids redundant per-frame copies and projects inspection at 4 Hz.

| Local Chromium run | Update p50 / p95 / max ms | Extra snapshot p50 / p95 / max ms | Combined p50 / p95 / max ms | Observed profiling long tasks |
| --- | --- | --- | --- | --- |
| Initial structuredClone | 15 / 17.5 / 18.7 | 11 / 12.4 / 13.4 | 26.2 / 29.9 / 30.4 | Initial 1696 ms included unyielded setup; not a per-update measure |
| Final optimized A | 4.2 / 4.7 / 5.4 | 0.5 / 0.8 / 1.1 | 4.7 / 5.5 / 6.4 | None in measured interval |
| Final optimized B | 5.1 / 8.5 / 9.2 | 0.6 / 1.9 / 2.9 | 5.9 / 9.8 / 11.5 | None in measured interval |
| Final full-suite run | 4.3 / 5.0 / 5.2 | 0.5 / 0.6 / 0.7 | 4.8 / 5.5 / 5.7 | None in measured interval |

Investigation replaced generic snapshot cloning with defensive typed copies, computed prediction
once per track rather than per pair, and removed redundant render-time copies. Tests ensure callers
cannot mutate retained boxes, samples or event evidence. Warmup now yields; setup is excluded from
measured-interval long-task observations. No threshold, model or cadence was silently changed.

The proposed **8 ms p95 investigation budget is not consistently met** in this shared Linux
environment (final A 4.7 ms, B 8.5 ms). The cause of each run's variation is not established.
These measurements do not prove mobile speed, thermal behavior or a universal budget pass.
Physical profiling remains Pending and this residual performance risk needs review.

## Evaluation semantics and limits

Visible truth and current confirmed observed tracks match one-to-one at IoU ≥0.50, maximizing
match count, then total IoU, then stable truth-ID/prediction birth order. A bounded bitmask DP
makes this tie objective explicit; sorting a live Hungarian solver alone was insufficient.
Tiny binary64 sum differences within 10 machine epsilons are treated as numerical ties.
Initial confirmation misses count. Occluded frames are excluded from visible-miss denominators.
Fragments and ID changes follow the fixture definitions, not standard MOT metrics.

Recovery uses the last matched pre-occlusion identity and the first matched ID in the first
post-occlusion visible interval, bounded by next occlusion, sequence end or 1000 ms. A wrong
first ID fails even if the original returns later. Missing recovery stays in the eligible
denominator; unscorable cases are excluded and reported. No denominator displays Not measured.
Reports preserve actual outcomes, including long-expiry ID changes. The bundled crossing fixture
yielded zero ID changes; this does not prove stability for other crossings.

## Pending physical checks and accepted limits

All Phase 2 iPhone/iPad checks in [the device plan](PHASE_2_TESTING_PLAN.md) remain **Pending**.
A separately approved preview and device session are needed; none is authorized here. In particular:

- Track ID stability through motion/crossings/brief occlusion; inspect association/loss explanations.
- Trail settings, sample gaps, near-threshold/alternative explanations, category filtering.
- Portrait/wide layout, touch/stage selection, zoom, orientation and resumed segment notices.
- Normal note opt-in/reload/delete; actual Safari storage refusal is still untested.
- Diagnostic copy/fallback/clear on Safari, with clipboard/sync scope understood.
- Benchmark pause/Start/background cancellation; sustained responsiveness and matching/copy timings.

Every accepted Phase 1 limitation remains: physical loading/permission interruption gaps,
external interruption untested, actual Safari storage-denial gap, uninspected authenticated
headers/HTML/network traffic, diagnostic context/log-provenance limits and unexplained S1/S2.
A tested local CSP still permits same-origin connections and does not alone establish absence
of uploads. Production diagnostics inclusion must be decided before first production deployment.

## Delivery and next decision

A separate read-only Codex review identified evaluator ties, diagnostic Clear/copy races,
current association display and numeric chart accessibility; regressions were added and fixed.
This is not a Claude verdict. Implementation is ready for final code review, with performance
variation and physical-device acceptance explicitly outstanding. No new dependency was added.
Do not merge, deploy or begin Phase 3 without separate approval.

The pagehide handler cancels work, stops camera tracks and clears tracking state without removing
static controls that must survive back/forward-cache restoration. A synthetic lifecycle-event
regression covers this; it does not establish physical Safari back/forward-cache behavior.
