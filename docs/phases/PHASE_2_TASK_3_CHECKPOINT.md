# Phase 2 — Task 3 review checkpoint

Approved implementation baseline: `559bd645aa5c9be636169435e02b74df5a6374df`.
Its merge CI [40246823872](https://github.com/Harrisonxaph/Visual-Lab-AI/actions/runs/40246823872)
completed successfully. The user authorized Tasks 1–3 only on 2026-10-26 UTC.
This is a partial Phase 2 implementation, awaiting review; Tasks 4–6 are not started.

## Implemented

- Task 1: intrinsic-to-unit clipping/normalization, contain-fit hit-test helpers, typed frame,
  boundary, tracker and capability contracts; pinned 80-label catalog with model-checksum guard.
- Task 2: bounded deterministic global assignment; 0.25 floor for births and continuing matches;
  private tentative candidates; public IDs after two consecutive matches; loss, reassociation,
  class changes, expiry and segment-boundary events; bounded histories and descriptive quality helpers.
- Task 3: optional accepted-frame Lab observer, generation/geometry rejection, lifecycle boundaries,
  controller, current observed IDs/trails and selectable keyed list; stale analysis hiding;
  on-video segment-reset notice; full-width stacked phone layout and Stop-and-clear action.

No notes store, inspector/chart/explorer UI, configurable trajectory controls, benchmark UI,
training, new dependencies or deployment changes are included. The default trail is five seconds;
Task 4 adds configuration and detailed inspection. Metadata stays in bounded page memory.

## Automated evidence (Linux Chromium 154; not physical Safari)

- Unit: 49 tests pass, including all existing Phase 1 tests. New coverage includes global assignment
  versus exhaustive small-matrix costs, confirmation-only IDs, inclusive floor/expiry boundaries,
  300-frame noise, capacity/history bounds, observer cleanup, late geometry/capture rejection,
  stale projections and exact overlay associations for overlapping boxes.
- Development browser: 29 tests pass, including real CPU/WASM worker tests and a raw-category probe;
  synthetic camera/worker fixtures check selection, threshold projections, Resume segment notices,
  phone stacking, loss/reacquisition/expiry and stopped camera tracks.
- Production: 10 tests pass under the existing CSP, with GPU disabled. Actual Lite0 inference
  confirms IDs in both ordinary and diagnostic modes; controlled request/header/CSP tests pass.
- Type check, formatting, build and `git diff --check` pass. Exact-head remote CI is recorded in
  the draft PR/checks, separately from these local results.

Fixed-image public-runtime probe: cat score 0.780376672744751, dog 0.7627290487289429,
each with exactly one category; category index -1 and empty displayName. This establishes no
same-box alternatives in this probe; the production adapter still exposes primary label/score only.
The probe instruments a test-only development worker response, not the production protocol.

The synthetic noise sequence contains one .80 cup and 49 .05–.24 boxes/frame at 100 ms intervals.
It yields one candidate, one confirmed/public ID, no losses/expiry/capacity drops, peak one live
slot and exactly 14,700 exclusions. It is not a detector accuracy or real-camera identity benchmark.

## Risks and pending acceptance

- Heuristic geometry can swap identities at crossings and after ambiguous occlusion. No appearance
  re-identification, real-scene ground-truth fragmentation or ID-switch claim is made.
- Scores below .25 cannot maintain tracks. Displaying a low-score box does not give it a track ID.
- Resume, intrinsic geometry changes and >2-second analysis gaps start new segments; CSS-only
  resize does not. IDs are not reused within the session; new Start resets the session.
- The 8 ms p95 association budget is not yet a physical-device measurement. Profiling and final
  Phase 2 acceptance remain later work; bounded synthetic tests are not mobile performance proof.
- All new iPhone/iPad tracking tests remain Pending. No preview deployment is authorized.
- Preserve every accepted Phase 1 limitation, including untested actual Safari storage refusal,
  diagnostic coverage/log provenance, unexplained S1/S2, and uninspected authenticated deployed
  headers/HTML and network traffic. Local production checks do not replace deployed inspection.
- Pause leaves camera preview live, as in Phase 1. Stop releases the camera; Stop-and-clear also
  deletes this session's tracking metadata. No footage is persisted or uploaded by this change.

## Review and next action

A separate read-only Codex review found and prompted regression fixes for analysis-gap observer
failure, overlay ID association and immediate lifecycle list updates. It is not a Claude review.
The developer also corrected expiry gap accounting and terminal notice visibility.

Stop here. Review the exact draft-PR checkpoint commit and CI; Tasks 4–6 require the user's
review approval of that commit. Do not merge, deploy, change protection/automatic deployments
or begin Phase 3.
