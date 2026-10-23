# Phase 1 implementation and testing

Implemented on `phase-1/live-object-detection`; baseline main `cafa8c7`. No merge or deployment.
Codex implementation and supplemental engineering review are separate from the pending Claude review.

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

- `npm test`: **12 passed** (threshold, empty output, clipping, completed-frame FPS, camera denial,
  late permission grant cleanup, stale paused/stopped results, one-frame limit, load failure/retry,
  loading cancellation, worker timeout/retry, stalled capture/late-bitmap cleanup).
- `npm run test:browser`: **15 passed** on Chromium 154 / Linux x86_64. Includes mocked lifecycle/
  layout checks, actual model-load failure, worker crash, and actual CPU inference tests.
- `npm run test:production`: **1 passed** against built assets with GPU acceleration disabled.
- `npm run check`, `npm run build`, `npm run format:check`, `git diff --check`: passed.
- `npm audit`: **0 vulnerabilities** in the checked lockfile at verification time.
- Clean model acquisition downloaded the actual artifact and verified SHA-256 successfully.

The isolated real-worker test used a fixed image; the complete UI test used a canvas-based camera
stream with that image. Neither uses a physical camera. Phone/tablet viewport checks are Chromium
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

Real iOS/Safari/Android and physical-camera behavior remain unverified. Only Lite0 is implemented;
Lite2 compatibility/comparison is deferred to Phase 3. No accuracy benchmark, tracking, recording,
training, PWA, offline guarantee or advanced module is included. Vendor module-worker compatibility
adaptations need device scrutiny. First load requires asset acquisition; slow devices can time out.

Recommended next action: Claude review using docs/CLAUDE_REVIEW.md, remote CI inspection, and
real-device testing above. Resolve material findings before requesting approval to merge. Do not
start Phase 2, merge or deploy merely because Phase 1 tests pass.
