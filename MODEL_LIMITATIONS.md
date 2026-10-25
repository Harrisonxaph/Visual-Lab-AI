# Model and platform limitations

## Verified combination

EfficientDet-Lite0 float32 / v1, MediaPipe Tasks Vision 0.10.32, CPU/WASM in a module worker.
Verified on Chromium 154, Linux x86_64 using a fixed image and synthetic camera video stream,
in both development and production builds (production test disables GPU acceleration).
Physical-camera operation on the user-reported iPhone 15 Pro (iOS 27.0.1, Safari) and iPad Pro
11-inch, 3rd generation (iPadOS 26.6.2, Safari) has user-reported evidence in the device ledgers.
That is not comprehensive Safari/platform validation. macOS Safari and Android remain untested.
Do not interpret responsive viewport screenshots as device inference evidence.

Module workers, OffscreenCanvas, transferable ImageBitmap and WebAssembly are required.
SIMD is detected by MediaPipe; SIMD and non-SIMD binaries are included, but the non-SIMD
path has not been separately forced and validated. Missing capabilities fail visibly.
The tested vendor module-worker loader adaptations are documented in THIRD_PARTY_NOTICES.md.
No assumption of universal GPU acceleration is made; the selected inference delegate is CPU.

## Lite2 investigation

The user-supplied Phase 1 review reports successful EfficientDet-Lite2 float32 / v1 inference
in the same worker without code changes: both cat and dog were detected in the fixed image.
The review's single cold runs were 760 ms (Lite2) and 316 ms (Lite0), on Chromium 153 as reported.
This is compatibility evidence only, not a benchmark or evidence of comparative accuracy.
See EXPERIMENTS.md for provenance and the independently verified versioned-artifact checksum.
The review run’s hardware details and original artifact checksum were not supplied. Lite0 remains the
shipped default; no Lite2 asset, model selector or comparison lab is added to Phase 1. No Lite2
claim is made for Safari, iOS, other devices, sustained performance or accuracy.

## Detector interpretation

Confidence is an uncalibrated model score, not measured accuracy or a guaranteed probability.
Lighting, blur, scale, pose, background, occlusion and domain shift can change results or produce
false positives/negatives. This is an educational tool, not a safety-critical perception system.
The 80 named COCO categories are listed in [docs/COCO_LABELS.md](docs/COCO_LABELS.md).
The embedded label file has 90 entries including placeholder gaps; IDs are not assumed contiguous.
The detector cannot identify arbitrary objects, specific people or unsupported custom classes.

Runtime preprocessing resizes to the detector's 320×320 input. UI boxes use returned frame pixels.
The app receives postprocessed results, not raw class logits. The fixed 5% output floor and
50-result cap can omit results. The slider cannot recover omitted detections. Displayed detection scores are rounded and capped at 99% to avoid suggesting certainty;
filtering still uses unrounded scores. Only drawable, clipped results contribute to the visible count.
No alternative
class probabilities or discarded proposals are invented or exposed in this phase.

## Performance and privacy

Inference time measures the synchronous detection call inside the worker. Processing FPS measures
completed frames in the latest 2-second rolling window, including capture/transfer/scheduling.
Before two seconds have elapsed, it uses elapsed session time. It is not camera FPS, a latency
percentile or accuracy. Processing is capped at 10 FPS and only
one frame is in flight. Earlier five-minute physical sessions include user-reported battery,
endpoint performance and subjective warmth observations; no controlled energy/thermal benchmark
or measured throttling result exists. See the original device ledger for conditions and limits.

Permission is requested only after Start. Pause retains camera preview, Stop releases tracks.
Backgrounding pauses inference; camera preview may still be active until Stop or page exit.
Only the threshold is optionally persisted. Frames and detections remain transient and local.
The model is served locally after initial setup; no offline/PWA guarantee exists yet.

No tracking, identity persistence, active learning, training, retraining, ground-truth evaluation
or model comparison is implemented. Corrections cannot improve this detector in Phase 1.

## Diagnostic and CSP change

PR #4 adds opt-in local camera-call metadata diagnostics and a restrictive response CSP.
Merged commit `edea505` has one authorized temporary preview and user-reported physical Safari
checks on both devices, recorded in the
[privacy-preview ledger](docs/validation/PHASE_1_PRIVACY_PREVIEW_2026-10-24.md).
Remaining lifecycle, network and authenticated deployed-header/HTML checks are not complete.
Same-origin requests are allowed,
so CSP is not proof of no uploads. WASM execution requires the explicit `wasm-unsafe-eval` allowance;
older browsers may reject compilation and must fail visibly. See
[privacy investigation](docs/phases/PHASE_1_PRIVACY.md) for coverage and retest requirements.

## Initialization failure guidance

The offline-error follow-up distinguishes worker failure before ready from a crash during
inference. Initialization guidance mentions possibly unavailable app/model/runtime files and
connection checks, retaining reported detector details; it does not diagnose every failure as
network-related or use navigator.onLine as proof. Generic runtime and missing-capability errors
remain distinct. PR #6 is merged; an authorized preview of `063a97a` is READY for a
focused retest. Both devices have user-reported passes for revised wording, indicator-off state
and explicit retry recovery; these do not complete broader validation or inspect network/track
internals. See
[offline guidance and remaining validation decisions](docs/phases/PHASE_1_OFFLINE_ERROR.md).
