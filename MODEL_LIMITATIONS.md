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
The threshold can be persisted; metadata-only failure notes can be explicitly saved. Camera frames
remain transient and local; future uploaded datasets require separate explicit local storage intent.
The model is served locally after initial setup; no offline/PWA guarantee exists yet.

The pretrained detector itself does not learn from corrections. Geometric session tracking and
labelled synthetic tracker evaluation have since shipped; classifier training, active learning and
detector fine-tuning have not. Synthetic tracker metrics are not detector accuracy.

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

## Closeout disposition — 2026-10-25

The [supplied closeout review](docs/reviews/PHASE_1_CLOSEOUT_REVIEW_2026-10-25.md) records user
acceptance of limitations 1–5 on 2026-10-25: model-loading interruption coverage, permission-modal
Stop coverage, uninspected network/headers/HTML, untested external interruption and unexplained
historical S1/S2. Those are accepted limits, not new physical test passes. On the same UTC date, the user directly
accepted limitations 6 and 7 (actual Safari storage denial remains untested, and diagnostic
coverage/log provenance is limited), approved retaining opt-in diagnostics for device testing,
and approved Phase 1 closeout. This does not explain S1/S2 or establish absence of uploads.
See the [recorded decisions](docs/phases/PHASE_1_CLOSEOUT.md). Phase 2 remains separately gated;
production diagnostic inclusion must be decided before the first production deployment. No merge,
deployment or protection/automatic-deployment change is authorized by those decisions.

## Legacy Phase 2 interpretation — original planning context

Planning proposes geometric, session-scoped association, not appearance/person re-identification.
IDs may change at control/geometry boundaries or when motion/occlusion prevents matching. Current
Detection output has one primary class/score; alternative scores are unavailable unless a verified
adapter capability later exposes genuine same-box outputs. Near-threshold inspection can show
only returned detections within the fixed output floor/cap. The proposed separate .25 tracking
floor excludes lower scores from association/birth even when the display slider shows them;
confirmation, not tentative creation, allocates public IDs. Above-floor false tracks remain possible.
Live tracking counters/variability
are not accuracy; labelled synthetic identity metrics evaluate association, not detector quality
or real-camera identities. See the [proposed design](docs/superpowers/specs/2026-10-25-phase-2-tracking-design.md).
Accepted Phase 1 limitations remain in force and are not new Phase 2 device passes.

## Phase 2 Tasks 1–3 checkpoint

Geometric tracking was introduced at the Task 3 checkpoint and merged through PR #11;
this is not full Phase 2 physical acceptance. See [checkpoint evidence and risks](docs/phases/PHASE_2_TASK_3_CHECKPOINT.md).
No new physical Safari tracking evidence or measured ground-truth accuracy is supplied.

## Phase 2 inspector, notes and synthetic evaluation

The Phase 2 runtime merged via PR #11 at `efdb1d9` on 2026-10-26 UTC; it is not yet accepted on physical devices.
Current association evidence explains geometric matching, not the model's internal reasoning.
The near-threshold band contains actual returned boxes only; alternatives remain unavailable.
Tracks can switch identities in crossings, expire during low scores or occlusion, and reset at
analysis/control boundaries. No appearance re-identification or live ground-truth ID metric exists.

Notes store metadata and user-entered text only; users may put personal information in that text.
Storage is not encrypted, durable or universally available. Page-RAM and saved serialized content
are capped at 100 entries / 256 KiB; JS heap overhead is larger than serialized bytes. Real Safari
storage refusal remains untested. Notes never automatically retrain or correct the detector.

Synthetic reports evaluate known numeric inputs, not detector accuracy or held-out improvement.
Initial confirmation misses count. Missing recovery denominators show Not measured. Recovery
requires the same first returning ID in a bounded labelled interval; later return cannot rescue
an earlier wrong-ID recovery. Raw confidence is not accuracy. See implementation/profiling notes.

Copy log is opt-in within diagnostics and copies the complete bounded JSON snapshot. Clipboard
content and OS sync are outside page memory; Clear removes page records/fallback text and invalidates
pending UI callbacks, but cannot revoke an already initiated clipboard write. Production inclusion
of diagnostics still requires a decision before the first production deployment. Historical S1/S2
and every other accepted Phase 1 evidence limitation remain unchanged.

The [on-device synthetic stress profiler](docs/phases/PHASE_2_STRESS_PROFILE.md) makes tracker/copy
timings measurable from the app, independently of model inference. It uses no camera and cannot
establish real-scene accuracy, battery/thermal safety or absence of uploads. The legacy ledger records one user-supplied iPhone synthetic timing report (D5);
this does not establish an iPad pass or a universal 8 ms performance guarantee. Unsupported long-task observation
is explicitly unavailable; whole overlapping task durations may include unrelated main-thread work.

## Training-first roadmap reset — 2026-10-26

Current future scope is the [training-first roadmap](PROJECT_ROADMAP.md). Historical Phase 2 means
tracking, while new Phase 2 means Dataset Laboratory. Historical planning/validation evidence above
and in the ledgers is not silently promoted to acceptance. D12–D14 missing boxes remains unexplained;
D16/D17 shows boxes in a user-attributed iPhone screenshot with browser/container unconfirmed. No
physical iPad legacy Phase 2 pass is established. These facts and S1/S2 remain open records; unrelated
upload/training milestones do not require another routine camera walkthrough.

No classifier has been trained by the app yet. The proposed frozen-embedding classifier changes only
its head weights/biases; it does not fine-tune the encoder or retrain EfficientDet. Encoder/runtime
compatibility and exact artifact/licence/preprocessing remain to be verified before implementation.
Small datasets, duplicate leakage, class imbalance, domain shift and repeated test-set tuning can make
improvement claims unreliable. Higher confidence or changed weights alone does not establish accuracy.
Imported images must remain local by default, with consent, bounded storage, deletion and provenance.
The proposed browser model stack adds no new compatibility or privacy guarantee today.

The reset removes routine repeated hardware checks, not essential privacy, security or ML integrity
requirements. Accepted Phase 1 limits remain accepted; other deferred observations remain untested.
Production inclusion of the existing opt-in diagnostics still needs a decision before first production.
