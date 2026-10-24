# Phase 1 implementation and testing

Implemented on `phase-1/live-object-detection`; baseline main `cafa8c7`.
**Merged into main in [PR #1](https://github.com/Harrisonxaph/Visual-Lab-AI/pull/1) on 2026-10-23
at 23:17:42 UTC**, merge commit `a5bb085627c226b4c4a9bd768dfa12ba6133c408`.
This merge preceded the recommended real iPhone/iPad testing. The user reported the merge;
no device-test completion or waiver is inferred. No explicit deployment command was issued.
The existing Vercel Git integration did publish branch previews; see the review follow-up below.
The designated review has now been supplied through the user; fixes and response are recorded
in docs/reviews/PHASE_1_RESPONSE.md. Real-device testing remains pending. Merge approval for any follow-up PR is separate.

## Delivered

Responsive desktop/tablet/phone lab UI; explicit camera consent and local live preview; actual
EfficientDet-Lite0 CPU/WASM in a module worker; labelled boxes and scores; inclusive threshold
slider; pause/resume/stop; current detections, inference time and processing FPS; educational model
panel and confidence explanation. Loading, permission, missing features, model download errors,
worker failures, timeouts and storage restrictions have actionable behavior.

Camera, capture, inference adapter/client, scheduler, overlay and UI are separate modules.
One frame is in flight; cancelled generations cannot update results; captured/received bitmaps
are disposed; Stop releases streams and worker. No footage is stored or uploaded. Only the
threshold may persist. Pinned model checksum and WASM preparation support repeatable setup.
All five phases and all stretch targets remain documented; implementation stays within Phase 1.

## Automated verification (2026-10-23)

- `npm test`: **21 passed** (threshold, empty output, clipping, completed-frame FPS, camera denial,
  late permission grant cleanup, stale paused/stopped results, one-frame limit, load failure/retry,
  loading cancellation, worker timeout/retry, stalled capture/late-bitmap cleanup, background interruptions during permission/model loading,
  stale worker error isolation, injected model configuration/metadata, rolling FPS, camera-end
  messaging, score formatting and drawable counts).
- `npm run test:browser`: **19 passed** locally on Chromium 154.0.8037.57 / Linux x86_64. Includes mocked lifecycle/
  layout checks, actual model-load failure, worker crash, aspect-change overlay clearing, metadata
  replacement, score/count consistency, and actual CPU inference at two configured output floors.
- `npm run test:production`: **1 passed** against built assets with GPU acceleration disabled.
- `npm run check`, `npm run build`, `npm run format:check`, `git diff --check`: passed.
- `npm audit`: **0 vulnerabilities** in the checked lockfile at verification time.
- Clean model acquisition downloaded the actual artifact and verified SHA-256 successfully.

The isolated real-worker test used a fixed image; the complete UI test used a canvas-based camera
stream with that image. Neither uses a physical camera. The supplied review reports Chromium 153 for its own run and CI; this differs from the local
154 environment and is recorded separately in EXPERIMENTS.md. Phone/tablet viewport checks are Chromium
layout tests at 390/768px, not iOS validation. Remote GitHub CI status is independent of local results.
See EXPERIMENTS.md for exact model input, outputs, hardware and measured timing caveats.

## Manual testing still required

Use a secure origin (HTTPS, or localhost on the machine running the browser). Test desktop Chrome,
macOS Safari, real iPhone Safari and real iPad Safari; add Android Chrome when available.

1. Start and grant permission; point at supported COCO objects. Verify real preview, labelled boxes,
   scores and nonzero processing rate. Record browser, OS, hardware and observed latency/FPS.
2. Deny permission, inspect guidance, change permission in browser settings and retry. Test no-camera
   and camera-in-use cases where available. Model-download failure must release the camera.
3. Change threshold from 5% through 100%, including a visible score boundary. Verify results update
   immediately. Try empty scenes and multiple objects. Never infer accuracy from score changes.
4. Pause: results clear and preview stays on; Resume: new results appear; Stop: camera indicator goes
   off. Repeat rapidly; also Stop while the permission prompt or model load is pending.
5. Background and return: inference remains paused until Resume. Navigate away: camera stops.
   Disconnect the camera or end its track externally: the session stops safely.
6. Rotate phone/tablet, resize and zoom. Test touch controls and scroll. Verify boxes align with objects
   in portrait/landscape and across aspect changes. A camera image is contained, not cropped/mirrored.
7. Run for several minutes on each real device; inspect responsiveness, battery use and overheating
   behavior. The app does not claim to measure unavailable thermal sensors.
8. Inspect network requests: local assets only, no frame POSTs or footage uploads. Block storage;
   the app must still operate. No recordings or saved examples should be created.
9. Test unavailable worker, OffscreenCanvas or WASM support; a readable error should replace a hang.

## Limitations and next action

Real iOS/Safari/Android and physical-camera behavior remain unverified. Lite0 remains the only default asset;
Lite2 compatibility evidence was supplied in the review and is recorded in EXPERIMENTS.md.
Controlled model comparison remains Phase 3. No accuracy benchmark, tracking, recording,
training, PWA, offline guarantee or advanced module is included. Vendor module-worker compatibility
adaptations need device scrutiny. First load requires asset acquisition; slow devices can time out.

Recommended next action: inspect the review fixes and remote CI, then complete real-device testing above. Write up device results and fix material findings before requesting approval to start Phase 2.
Opening a follow-up PR does not authorize merging it or deploying the app.

## Pull request and supplemental review

Merged PR: https://github.com/Harrisonxaph/Visual-Lab-AI/pull/1 (2026-10-23; commit `a5bb085`).
Fresh Codex audit found a startup/background pause gap and noted stale-worker errors and transient
aspect mismatch. Regression tests reproduced each; fixes preserve startup suspension, ignore
obsolete worker errors and clear mismatched boxes on video resize. Full local suites passed after
fixes. That audit was not Claude review. The subsequent user-supplied designated review is now recorded
in docs/reviews/PHASE_1_RESPONSE.md; real-device validation remains pending despite the merge.

## Review follow-up and device gate

The supplied review's findings are tracked in docs/reviews/PHASE_1_RESPONSE.md. Model configuration
is now injected, FPS uses a 2-second rolling window, externally ended cameras show reconnect
guidance, score display is capped at 99%, and only drawable results contribute to counts.
CI runs on PR events, pushes limited to main, and manual dispatch. Vercel automatic Git deployments are disabled in vercel.json
for refs containing that config; earlier previews remain untouched. The completed Phase 1 merge is recorded above;
any further merge or manual deployment still requires approval.

| Required physical-device check | Status |
| --- | --- |
| Real iPhone Safari camera/inference/rotation/background checklist | Pending: no HTTPS access to the merged build |
| Real iPad Safari camera/inference/rotation/background checklist | Pending: no HTTPS access to the merged build |

Phase 2 must not start until device results are written up, resulting issues are fixed, and
the user explicitly authorizes Phase 2. The earlier merge does not waive this gate.

## Physical-device access status (2026-10-24)

User-reported devices: iPhone 15 Pro / iOS 27.0.1 / Safari, and iPad Pro 11-inch (3rd generation) /
iPadOS 26.6.2 / Safari. OS versions are recorded as supplied, not independently inspected.
No camera, permission, alignment, performance, heat, battery or privacy observations have been
collected from these devices. The user has no computer available for local HTTPS serving and no
HTTPS URL for the merged build. Older existing previews predate the final fixes and cannot
validate merged main. All physical-device results remain pending, not failed.

Testing needs a local HTTPS origin accessible from the devices (with a trusted certificate) or an
explicitly approved temporary preview. Neither an HTTP LAN URL nor an old preview satisfies the
merged-build camera test. No preview deployment is authorized by this documentation update.

## Merge-commit CI coverage

The original workflow ran on PR events/manual dispatch only, so merging PR #1 did not automatically
check `a5bb085`. The PR-head CI evidence is not relabelled as merge-commit CI evidence. A test-only
[manual main run on 2026-10-24](https://github.com/Harrisonxaph/Visual-Lab-AI/actions/runs/40081289803)
**passed** for exact commit `a5bb085627c226b4c4a9bd768dfa12ba6133c408`. This is a later check,
not evidence that CI ran when the merge occurred.
The docs/CI follow-up adds a push trigger limited to `main`, retaining PR checks without a second
branch-push run on each PR update.

## Current physical-device validation session

See [the 2026-10-24 device ledger](../validation/PHASE_1_DEVICES_2026-10-24.md) for the
exact current main/preview, CI provenance, device metadata and per-check results. The user
authorized refreshing only the temporary preview for this session. Historical access constraints
above describe the earlier state; current authentication/access and observations are recorded in
the ledger. No physical-device pass is claimed until an observation is collected.
