# Phase 2 Tracking and Decision Inspector Implementation Plan

> **For agentic workers:** After explicit implementation approval, use superpowers:executing-plans
> or an explicitly chosen execution workflow. Checkboxes below are **not started**. This PR is
> planning only; do not execute tasks, install new dependencies or add runtime features now.

**Goal:** Add bounded, inspectable temporal association and local failure reporting to the Phase 1 lab.
**Architecture:** A pure normalized-coordinate tracker consumes each Lab-committed frame once;
an inspection controller handles lifecycle/history and separate UI modules. Metadata-only notes
have explicit local-save consent; live quality proxies and labelled synthetic metrics stay separate.
**Tech Stack:** Existing TypeScript/Vite/DOM/canvas, MediaPipe CPU/WASM worker, Vitest and Playwright;
no framework migration, paid API, backend or additional ML model.
**Spec:** [Proposed design](../specs/2026-10-25-phase-2-tracking-design.md).

## Global constraints

- Planning baseline `19fd168bee3c22f8c2723d3be75f43ff8b922d50`; merge CI 40241503562 passed.
- Phase 2 only. No merge/deploy/protection/automatic-deployment change or Phase 3.
- Existing camera consent, cleanup, worker/capture limits and one-frame scheduling remain intact.
- Existing output floor **0.05**, result cap **50**, CPU delegate and score presentation stay honest.
- No footage persistence/upload, fabricated alternatives, re-identification or confidence-as-accuracy.
- Preserve approved [Phase 1 closeout](../../phases/PHASE_1_CLOSEOUT.md); new Phase 2 evidence is separate.
- Proposed tracker constants, state/event meanings, history/storage caps and evaluation definitions
  are exactly those in the design. Changing them requires recorded rationale and relevant tests.

## Review focus

1. Same-class crossings and ties: deterministic output does not prove true identity (Tasks 2, 6).
2. Duplicate/stale/old-geometry frames: no repeated events or history corruption (Tasks 1, 3).
3. Threshold 5%/100%, invalid boxes and unavailable alternatives: no invented evidence (Tasks 1, 4).
4. Pause/hidden/loading gaps and expiry boundaries: no fabricated object exits (Tasks 2, 3).
5. Storage exceptions, corrupt data, capacity overflow and unsafe notes: bounded state, honest save
   status and safe text rendering (Tasks 2, 4, 5).

## Contract and dependency map

Task 1 defines `CommittedFrame`, `NormalizedFrame`, `TrackingBoundary`, `TrackSnapshot`,
`TrackSample`, `TrackEvent`, `TrackingFrame`, `TrackingSnapshot`, `TrackerConfig` and
`DetectorCapabilities` in `src/tracking/types.ts`. Keep existing `Detection`/worker protocol valid.
A frame has session/segment/geometry/sequence, monotonic sampled/completed times, intrinsic size
and returned detections. Samples and events follow the design; boundary events may have null
track ID and apply to the segment. IDs are scoped, never reused within a session.

Task 2 produces `Tracker(config)`, `.startSession(sessionId)`, `.update(frame: NormalizedFrame)`,
`.endSegment(reason, timeMs)` and `.snapshot()`. The controller starts a session explicitly; a
frame from another session or an older/equal sequence cannot silently restart the tracker.
Task 3 produces the Lab observer bridge and `TrackingController`; Tasks 4–6 consume it.
Task 5's store is independent of tracker internals and persists only copied validated metadata.

## Milestones and delivery

These are sequential implementation checkpoints within a future **Phase 2 development branch/PR**,
not separate approvals to merge subsets or start later roadmap phases. The current documentation
planning PR is separate as explicitly requested. At each milestone run its tests and commit the
reviewable result; do not move on with known failures. Claude reviews the plan and final Phase 2 PR.

### Task 1 — Frame/geometry/capability/catalog contracts

**Files:** create `src/tracking/types.ts`, `geometry.ts`, `src/data/coco-labels.ts`;
create `tests/tracking-geometry.test.ts`, `tests/category-catalog.test.ts`;
extend `tests/browser/runtime.spec.ts` only as needed for capability evidence.
**Consumes:** existing `Box`, `Detection`, `DetectorConfiguration`, pinned label documentation.
**Produces:** `normalizeDetections(detections, width, height, floor): NormalizedDetection[]`,
`intersectionOverUnion(a: UnitBox,b: UnitBox): number`,
`containedVideoRect(rect, width, height): ContentRect`,
`hitTestTracks(point, contentRect, tracks): TrackId | null`, and versioned 80-label catalog.

- [ ] Write failing tests: normalize 100×50 box `(10,5,20,10)` to `(0.1,0.1,0.2,0.2)`;
  clip a partly off-frame box; reject scores below configured floor or above 1,
  NaN/Infinity/zero area and invalid frame sizes. Identical IoU
  is 1, disjoint is 0. Reject touches in a contain-fit letterbox; map portrait/landscape/DPR cases
  to the same unit coordinates. Nested hits choose smallest area, then stable birth order.
- [ ] Run `npm test -- tests/tracking-geometry.test.ts tests/category-catalog.test.ts`; observe
  missing-feature failures. Implement pure helpers, then rerun to PASS.
- [ ] Catalog tests: exactly 80 unique named labels, provenance matches the pinned model/label
  document, case-insensitive search includes person/cup/hair drier, no assumption of contiguous IDs. An incompatible injected model must not reuse this catalog.
- [ ] Record a fixed-input inspection of public raw runtime categories using a test-only harness:
  count/name/score semantics for the same box. Do not change production output based on invented
  fixture alternatives. Default capability stays unavailable unless genuine per-box alternatives
  are demonstrated and documented; contract/smoke tests must accompany any validated exposure.
- [ ] Commit the contract/geometry/catalog milestone. No camera/tracking UI is activated yet.

### Task 2 — Assignment, tracker states and bounded histories

**Files:** create `src/tracking/assignment.ts`, `tracker.ts`, `quality.ts`;
create `tests/tracking-assignment.test.ts`, `tracking-lifecycle.test.ts`, `tracking-quality.test.ts`.
**Consumes:** Task 1 types/helpers and proposed defaults in the design.
**Produces:** `minimumCostAssignment(costs, unmatchedCost)` with explicit unmatched rows;
`Tracker` API above; `describeTrackQuality(snapshot)` returning typed descriptive fields.

- [ ] First add tests with expected assignment/identity/event outcomes: global competing matches,
  empty/rectangular matrices, all pairs forbidden, exact ties and one-to-one ownership. Run RED.
- [ ] Implement deterministic bounded minimum-cost assignment and the documented geometry/class
  cost. Verify gates at IoU 0.10, normalized distance 0.15 and area-ratio 0.25/4, including just-outside
  cases. Test class flips can keep a geometrically supported ID and expose the observed label change.
- [ ] Write/run RED state tests: first observation tentative, second consecutive match emits one
  entry; lost after first unmatched committed frame; repeated empty frames do not repeat loss;
  same ID reacquired within retention; at 1500 ms eligible, after 1500 ms expired before matching.
  A new ID after expiry is not re-identification. Tentative miss creates no confirmed exit.
- [ ] Implement these transitions and exact association explanations. Add gaps with null scores,
  never zeros/predicted detections. Test confidence values remain raw and history bounds are real.
- [ ] Test duplicate/decreasing sequence and nonmonotonic timestamps are ignored/rejected with no
  state mutation; invalid frame dimensions/timing are rejected without generating tracks or loss
  events (a valid frame with empty detections does generate loss). Out-of-session and closed/older
  segment input is rejected.
- [ ] Test 100-live-track capacity, 200-sample/20-second history, 100-ended-history and 1000-event
  caps, visible dropped counts, no ID reuse and no retained selected reference bypassing eviction.
  Aggregates remain correct after pruning. Define unobserved gap duration from last matched time
  to reacquisition/segment end, labelled as a gap estimate rather than proven occlusion duration.
- [ ] Live quality tests: span and matched-frame count, loss/reacquisition counts, raw-score SD
  and median center-step/box-diagonal proxy. ID switches/fragmentation are unavailable without truth;
  smooth motion must not become an accuracy claim.
- [ ] Run `npm test -- tests/tracking-assignment.test.ts tests/tracking-lifecycle.test.ts tests/tracking-quality.test.ts`
  to PASS; commit. This milestone is pure logic, not a real-camera benchmark.

### Task 3 — Lab commit hooks, lifecycle integration and tracked overlay

**Files:** modify `src/lab.ts`, `main.ts`, `overlay.ts`, `style.css`;
create `src/inspection/controller.ts`; extend `tests/core.test.ts`,
create `tests/inspection-controller.test.ts`, `tests/browser/tracking.spec.ts`.
**Consumes:** Tasks 1–2; existing camera/capture/client; no model/protocol changes required.
**Produces:** optional `LabObserver` third constructor argument, accepted-frame callbacks and
central lifecycle boundaries; `Lab.geometryChanged(width,height): void`; controller projections.

- [ ] Write/run RED integration tests before modifying Lab: one callback per valid completed result,
  none for stale captures/results or rerenders. Sequence increments only on commit; sample time
  and completion time are distinct. Threshold/search/selection never calls Tracker.update again.
- [ ] Add session/segment/geometry metadata to the observer path. Emit onFrame after generation
  and geometry checks, before the matching UI emit; keep existing raw detection Snapshot behavior.
  Observer callbacks are synchronous bounded work; test thrown observer callbacks release
  camera/bitmap/worker and surface an error without recursive observer invocation.
- [ ] Wire video resize to geometryChanged. It invalidates the prior generation/result, clears
  live overlays and ends the tracking segment without closing the camera/worker; wait for a valid
  new-geometry frame. Initial geometry while loading creates no phantom events. CSS resize alone
  keeps the same intrinsic geometry and IDs. Do not update tracking from render or a chart timer.
- [ ] Test pause/hidden pause while running, pause during permission/model loading, Resume, Stop,
  repeated Start, camera-ended/error and late callbacks. Each boundary finalizes once; control/
  geometry reset is not an object exit. Resume begins a new segment/IDs with an explicit notice.
  The Stop-and-clear tracking action calls Lab.stop before controller.clearSession and clears
  histories/metrics/selection without falsely deleting saved notes. A >2000 ms accepted-frame gap creates analysis-gap; stale results/paused time produce no loss.
  Test sampled versus detected/control event timestamps and unobserved-gap duration stopping at
  expiry deadline/segment closure. A running UI age >2000 ms since last completion hides live-box
  claims without tracker updates; Pause/destroy stops that timer and first-frame wait is explicit.
- [ ] Draw current matched boxes/IDs and confirmed visible trajectories using shared unit geometry.
  Keep Phase 1 raw visible detection count consistent with clipped/filtered boxes, including
  tentative/untracked detections. Do not display lost/predicted boxes as current model output.
- [ ] Browser fixtures cover stable motion, brief loss/reacquisition, expiry, threshold 0.05→1→0.05
  without track resets, rapid selection and portrait/landscape geometry mismatch. Assert camera
  tracks ended after error/Stop and old workers cannot revive trackers.
- [ ] Run the new unit/browser tests plus the entire existing Phase 1 suite. Commit only with PASS.

### Task 4 — Inspector, charts, explorer and honest returned-result view

**Files:** create `src/ui/track-inspector.ts`, `confidence-chart.ts`, `category-explorer.ts`,
`quality-panel.ts`; modify `main.ts`, `overlay.ts`, `style.css`, `model-info.ts`;
create `tests/inspection-projection.test.ts`, `tests/browser/inspector.spec.ts`.
**Consumes:** controller snapshots, capability/catalog, live quality from Tasks 1–3.
**Produces:** `mountTrackInspector(container, actions)` returning `update(view)`/`destroy()`;
`drawConfidenceChart(canvas, samples)`; keyed view updates and accessible numeric summaries.

- [ ] Write failing projection/UI tests: chart null gaps remain gaps, samples use actual time/raw
  score; ended/lost/stale/evicted selections are explicit and do not show stale boxes as live.
  Repeated UI updates add no tracker samples/events. Retention range/dropped counts stay visible.
- [ ] Near-threshold assertions at threshold .50: .40 and .49 returned valid scores appear, .50
  appears in visible results instead, .39 does not; at floor .05 the band is empty. Data below
  the model floor or omitted by cap cannot be invented. Invalid/clipped-away boxes aren't counted.
- [ ] Alternative scores unavailable displays a clear unavailable state with no percentages.
  Only a capability backed by Task 1 runtime evidence may expose actual same-box alternatives.
- [ ] Implement selectable list/stage taps, event timeline/association evidence, configurable
  trails and confidence chart. Stage taps never swallow scroll/pinch; keyboard list is equivalent.
  Inspector says last observed for lost/ended data. Show live proxy/identity-metric limitations.
- [ ] Implement label search/observed-track filtering. No network fetch or arbitrary unsupported
  category is implied. Preserve model information and confidence explanation.
- [ ] Browser tests at 390/768/1440 CSS widths: 44px controls, no horizontal overflow, focus/selection
  preservation, scroll and touch flow, resize/zoom mapping, hidden/destroyed view cleanup. Inspector
  updates ≤4 Hz while controls respond immediately; pause/Stop cancels unnecessary timers.
- [ ] Run `npm test -- tests/inspection-projection.test.ts` and the inspector browser tests, then
  full suite. Commit. No Phase 1 compatibility statement is silently broadened.

### Task 5 — Local failure-note log, consent and robust storage

**Files:** create `src/failures/types.ts`, `store.ts`, `src/ui/failure-log-panel.ts`;
modify `main.ts`/`style.css`; create `tests/failure-store.test.ts`, `tests/browser/failure-log.spec.ts`.
**Consumes:** selected observed sample or an explicit missed-object report; catalog/model metadata.
**Produces:** `FailureLogStore` with `setPersistence(enabled)`, `load`, `add`, `remove`, `clearAll`
and typed result/status; validated schema v1 and an independent memory fallback.

- [ ] Write/run RED tests: missed note without detection, wrong/unstable notes with actual selected
  history, expected-label validation, timestamp/score/unit-box finiteness, text length 500,
  metadata-only provenance and user-report status. Reject invalid input, never modify model output.
- [ ] Test default no storage writes, explicit opt-in saves, disabling prevents new writes without
  claiming prior deletion, reload reads only previously saved data, per-entry deletion and clearAll. Explicit deletion works with saving disabled; failed saved-data
  deletion retains an accurate visible record/status, not a false success.
- [ ] Test 100-entry and 256 KiB UTF-8 bounds in both persistence and the total canonical RAM store
  (loaded + unsaved + memory-only notes), including multibyte text and boundary sizes. Repeated
  storage failures and disabled saving must not permit unbounded RAM growth. Reject
  overflow without silently deleting old notes. Denied access, quota, malformed JSON/schema and
  failed deletion show accurate status while keeping RAM notes; corrupt stored content is not
  overwritten until explicit reset. Reload/destroy does not silently enable write consent.
- [ ] Implement store/panel and free-text safe rendering. Test a script-like note is text, not HTML;
  no image/blob/video/audio/URL/device identifier is stored. No fetch/upload/export/import API added.
- [ ] Browser tests: opt-in/off, reload, delete, denied-storage fallback and no new non-GET requests
  in tested flow. Clearly limit that automated request observation to this test, not all devices.
- [ ] Run unit/browser note tests and full suite; commit. Physical real storage denial remains an
  accepted evidence gap unless genuinely exercised, not inferred from Private Browsing.

### Task 6 — Labelled synthetic benchmark, device acceptance and handoff

**Files:** create `src/tracking/fixtures.ts`, `benchmark.ts`, `tests/tracking-benchmark.test.ts`;
extend quality panel; add `tests/browser/tracking-quality.spec.ts`, production tracking smoke;
update README, ARCHITECTURE, EXPERIMENTS, MODEL_LIMITATIONS, ROADMAP and Phase 2 phase notes.
**Consumes:** pure tracker/config and separate fixture truth; no captured footage or training data.
**Produces:** `evaluateTrackingSequence(fixture, predictions): TrackingEvaluationReport` and local
Run synthetic benchmark view with source/config/version and measured runtime.

- [ ] First test the evaluator with known predictions independently of the tracker: perfect match
  gives zero fixture-defined ID changes/fragments; deliberate ID change gives exactly 1; one missed
  visible frame followed by a match gives 1 fragment; full occlusion is excluded from visible-miss
  denominator; recovery compares the last pre-occlusion matched ID to the first matched ID in the
  first post-occlusion visible interval, bounded by next occlusion/end/1000 ms. Test delayed and
  missing recovery, different-first-ID then old-ID return, and intervening occlusion. A case
  with pre-match and visible post-occlusion truth but no recovery stays in the denominator as a
  failure. Missing denominators display Not measured, never 0%/100%. IoU .50 boundary, maximum
  eligible match count then maximum total IoU and stable-ID ties are explicit. Add an ambiguous-overlap case where greedy matching would give a different metric.
- [ ] Keep the benchmark separate from live session state; allow only when inference is inactive,
  bound each fixture to 120 frames / 10 objects, yield every ≤10 frames and test cancellation.
  Start/Resume cancel it before inference, hidden/page exit cancels it, and late/partial results
  cannot be displayed as a completed current report.
  Then run tracker against built-in single-motion, competing/crossing, stationary/class-flip,
  short-occlusion, long-expiry and empty/invalid fixtures. Preserve actual failures; never claim
  detector evaluation or real-camera ID switches. Each fixture has independent truth IDs/boxes,
  declared visibility and version; input detections are synthetic, not inference outputs.
- [ ] Include sample count, fixture/config, browser-reported environment, processing timings and
  code/build ID if available. Unknown fields stay Unknown. No saved experiment/import/export system.
- [ ] Profile association separately at bounded worst-case 100 tracks / 50 returned detections;
  record p50/p95/maximum plus UI long tasks and environment. The proposed 8 ms p95 budget is a
  review investigation threshold; investigate misses rather than claim unmeasured mobile speed.
- [ ] Production smoke: actual Lite0 worker→accepted frame→tracker→ID/overlay, inspectability,
  threshold behavior and Stop under current CSP in normal and diagnostic modes. Assert no external
  code/requests in that controlled test and keep existing CSP enforcement/header probes.
- [ ] Follow [physical acceptance checklist](../../phases/PHASE_2_TESTING_PLAN.md), on approved
  preview only, separately on iPhone/iPad. Record errors, track/events/latency/FPS and conditions;
  mark untested Pending, not a pass inferred from Chromium fixtures.
- [ ] Run `npm run check`, `npm run format:check`, `npm test`, `npm run test:browser`,
  `npm run build`, `npm run test:production`, `git diff --check`; inspect exact-head remote CI.
  Write phase summary/results/limitations/PR URL and next action. Stop before merge/deploy/Phase 3.

## Plan handoff

The only executed checks in this planning PR are baseline CI verification and documentation checks.
All runtime tasks above are future work. Claude reviews design/plan honesty, association defaults,
state/time/reset semantics, data limits and acceptance criteria, then the user explicitly authorizes
implementation of an exact reviewed plan commit. Do not mistake a planning PR merge for that approval.
