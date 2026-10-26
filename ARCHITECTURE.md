# Visual Labs AI architecture — training-first reset

## Actual repository state, inspected 2026-10-26

Main `6dca0108cf40523fc49afc0aa5e786d07703b4e7` contains a framework-free TypeScript/Vite app;
MediaPipe Tasks Vision 0.10.32 runs EfficientDet-Lite0 CPU/WASM in a module worker. Camera/capture,
inference, Lab scheduling, overlay/UI, tracking/inspection and metadata-only failure storage are
separate modules. Vitest and Playwright cover pure logic, mocked lifecycle and actual model inference.
There is no backend, image dataset repository or trainable classifier. Main CI 40367378678 succeeded
on attempt 2. Existing runtime, configuration and test files are unchanged by this documentation reset.

## Recommended learning architecture — proposed, not implemented

Keep the detector path intact. Add independent typed modules for:

- **Dataset repository:** IndexedDB for explicitly imported image Blobs and annotations; localStorage
  is unsuitable for image collections. Use schema versions, guarded transactions, bounded decode/
  image counts and pixel sizes, failure reporting and explicit deletion. Quota/eviction remains possible.
  Decode according to a documented orientation/colour/resize policy; revoke object URLs on cleanup.
- **Dataset integrity/splits:** stable example IDs, provenance, label vocabulary, content hashes,
  related/duplicate groups, deterministic split seed and immutable dataset manifests. Exact decoded
  image equality and similarity warnings have different guarantees. Related examples and derivatives
  stay together, with conflicts resolved before training. Tiny classes may make valid splits impossible;
  show an actionable error rather than silently emptying validation or test sets.
- **Feature extractor adapter:** pinned pretrained image encoder, explicit preprocessing, tensor shape,
  output dimension, licence/source/checksum and version. EfficientDet's current postprocessed boxes
  are not an image-embedding API; do not pretend the detector exposes trainable features.
- **Training worker:** feature extraction plus a small softmax classifier using a suitable browser ML
  library, initially a CPU baseline. UI sends a frozen training manifest/configuration and receives
  progress/loss/metrics. Bound batches, yield, support cancellation, reject stale completion and dispose
  tensors/workers. Do not run camera inference and training concurrently by default.
- **Evaluation/experiments:** pure metric functions, split-bound evaluation, model/configuration/dataset
  provenance and explicit final-test runs. Keep results distinct from the existing tracker benchmark.
- **Learning UI:** upload-first, camera optional; explain each quantity in plain language and keep touch
  controls responsive. Charts and model-info patterns can be reused, not detector-score semantics.

Dataset-selected files are explicitly permitted local examples; they are not permission to upload.
Training and image processing remain on-device initially. Saved artifacts should contain weights,
class order and extractor/preprocessing compatibility metadata, without silently including raw images.
Any future export/import needs validation, resource limits and explicit user intent.

## Minimal first training stack and alternatives

Recommend TensorFlow.js with a frozen MobileNet-family image feature extractor and a single trainable
linear softmax head, using categorical cross-entropy and gradient-based optimisation. This is a
recommendation, not a verified dependency/model selection. Claude must first pin an appropriate
licensed artifact/version and prove real feature extraction, head updates and save/reload under the
current worker/CSP restrictions in automated browser tests. No packages or assets are added now.

CPU is a practical baseline for small cached-embedding datasets and avoids requiring WebGPU. It may
be slower; dataset bounds must follow measurements. A WASM backend is an alternative if its workers,
asset paths and policy are verified. GPU support is optional, not assumed. Do not casually weaken CSP
or add a remote CDN to make a runtime work. File uploads may require narrowly scoped local Blob image
rendering permissions; review the actual chosen rendering path and test any future CSP change.

A custom TypeScript linear classifier avoids a library but requires maintaining gradients, numerical
stability and serialisation. A Python/PyTorch service offers wider fine-tuning support but adds setup,
remote-image privacy and infrastructure concerns. Neither is preferred for the first browser lesson.
Full-network fine-tuning and a small network from scratch are later, separate experiments. TensorFlow.js
is not needed for the first dataset milestone; keep interfaces library-independent until compatibility
is proven. No paid API or compute service is required by this proposal.

## What learns and how to prove it

A frozen encoder converts images into numeric feature vectors. A new head computes scores from those
vectors using adjustable weights/biases. Optimisation changes those parameters to reduce training loss;
validation measures behaviour without gradient updates. This is transfer learning using frozen
features, not extractor fine-tuning or EfficientDet retraining. The saved classifier depends on the
exact encoder and preprocessing; incompatible artifacts must be rejected.

Cache embeddings by content ID plus extractor/preprocessing version; label or split edits invalidate
experiment manifests, not image identity. Any learned normalisation or augmentation configuration
must be derived from training only. Class ordering and split grouping are fixed in each run.

Record initial/final parameter digests and update magnitude, baseline predictions, training/validation
curves and model round-trip checks. Use a known learnable synthetic fixture for deterministic numerical
tests and a separate pinned real-image/encoder smoke test. Neither alone proves broad real-world
accuracy. Phase 4 adds held-out comparisons with counts, reproducible settings and small-sample limits.
Phase 5 never recruits test examples into its training feedback pool while keeping them as holdout.

## Reuse and unresolved risks

Reuse worker lifecycle/cancellation patterns, modular configuration, model metadata/provenance,
responsive UI, chart patterns, bounded storage/error patterns and existing CI/tests. Existing confidence
history is not a training-loss chart until supplied genuine training data. Detection failure notes lack
approved images/labels and must not automatically become a training dataset. Tracker synthetic truth
cannot establish classifier accuracy. Imported datasets require explicit storage intent unlike camera
frames, which remain transient under the existing camera path.

IndexedDB adds local persistence but not guaranteed durability, privacy from other local users or
unlimited capacity. Large image decoding and tensor leaks are principal mobile risks; use bounds and
automation rather than routine owner heat/battery sessions. Duplicate warnings cannot establish zero
leakage across unrelated uploads; capture grouping and honest limits matter.

D12–D14 and S1/S2 remain unexplained. D16/D17 is a working iPhone-attributed still view with browser
unconfirmed. Legacy iPad Phase 2 physical acceptance is not established. Accepted Phase 1 network,
headers, diagnostic and storage-denial limits remain. Independent upload-based work can proceed when
authorized without first completing old camera worksheets. See [workflow](docs/DEVELOPMENT_WORKFLOW.md).

## Historical design record

The following retains the original foundation and tracking decisions. Old future-phase references
and role/test gates are historical; the [new roadmap](PROJECT_ROADMAP.md) and AGENTS.md govern current
work. Planning-only statements below describe their original point in time; tracking later shipped.

# Historical computer-vision architecture

Status: Phase 1 merged into main through [PR #1](https://github.com/Harrisonxaph/Visual-Lab-AI/pull/1)
on **2026-10-23 at 23:17:42 UTC**, merge commit `a5bb085627c226b4c4a9bd768dfa12ba6133c408`.
The merge happened before real iPhone/iPad testing. User-reported physical evidence is now recorded;
[Phase 1 closeout](docs/phases/PHASE_1_CLOSEOUT.md) was approved by the user with documented
limitations on 2026-10-25 UTC. Phase 2 remains separately gated. The original merge
does not establish device compatibility or authorize Phase 2 or deployment.

## Repository inspection (2026-10-23)

Repository: Harrisonxaph/Visual-Lab-AI. Baseline: main at cafa8c7.
Only README.md (project name and one-line description) and MIT LICENSE exist.
No application, package manager, tests, CI, deployment configuration or assistant instructions exist.
The initial workspace had no checkout; the repository was cloned before inspection.

## Approved approach

A static Vite application using TypeScript, semantic HTML and CSS, with no backend or paid API.
Start with a small framework-free UI: video and canvas stay outside reactive rendering.
MediaPipe Tasks Vision runs EfficientDet-Lite0 with an explicit CPU delegate in a module worker.
This avoids requiring WebGPU/WebGL. CPU/WASM availability still requires validation.

Alternatives: TensorFlow.js COCO-SSD has established browser usage but changes the detector family;
a custom TFLite runtime needs more preprocessing and output-decoding work and validation.
EfficientDet-Lite2 float32 / v1 has reviewer-supplied compatibility evidence for this worker
(see EXPERIMENTS.md); controlled model comparison remains Phase 3 work.
The user approved this architecture on 2026-10-23.

## Boundaries and data flow

- Camera: explicit Start action, secure-context checks, getUserMedia, playsinline muted video,
  rear-facing preference, permission/device errors, track cleanup and Stop action.
- Inference: typed detector interface and metadata; MediaPipe adapter isolated from UI.
- Scheduler: one frame in flight, transferable ImageBitmap, monotonically increasing timestamps,
  frame/resource disposal, pause/resume and cancellation generation to discard stale responses.
- Worker: model loading and synchronous detection off the UI thread. Missing worker/frame-transfer
  support produces a clear unsupported state; do not silently block the UI with synchronous inference.
- Visualization: overlay in native video coordinates with a contained aspect ratio; resize video
  and overlay together, avoiding crop and mirror mismatches. Threshold filtering is inclusive.
- UI: state machine for idle, loading, ready, running, paused, stopped and recoverable errors;
  confidence slider, current detections, processing FPS, inference milliseconds and model information.
- Settings: optional non-sensitive threshold persistence guarded against storage exceptions.
- Future modules: tracking consumes normalized detections; experiments and datasets are separate
  services. Phase 1 neither records footage nor pretends to track objects.

## Privacy and assets

Frames remain in browser memory and are never uploaded or persisted. Stop releases the camera;
pause pauses inference but leaves the preview running, clearly indicated. Hide/background handling
suspends processing. Model/WASM downloads require network initially and must be disclosed.
Prefer pinned same-origin model and WASM assets with source, license and checksum records.
No analytics, image export or cloud APIs in Phase 1. Installation/offline guarantees wait for Phase 4.

## Validation before accepting the architecture

Official web Object Detector documentation confirms detect/detectForVideo are synchronous and
recommends workers: https://ai.google.dev/edge/mediapipe/solutions/vision/object_detector/web_js
The official Lite0 float32 artifact downloaded successfully during investigation:
https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float32/1/efficientdet_lite0.tflite
The initial download proved availability only. Browser compatibility has since been tested as recorded in EXPERIMENTS.md. The verification requirement is to
run the pinned package + WASM + model in a real browser worker on a fixed input, record actual
output and errors, and test camera flow separately. Record engine/package/model versions.
Test desktop Chromium automatically, then Safari on real iPhone/iPad manually. Never infer
Safari support, accuracy or GPU acceleration from a successful Chromium run.

## Phase 1 verification

Unit tests: threshold boundary and empty output, coordinate conversion, stale response rejection,
metrics and resource cleanup. Integration/browser tests: mocked permission rejection, loading
failure/retry, unsupported features, pause/resume/stop, slider filtering, responsive touch layout.
A separate real-runtime smoke test must load the actual model and process an image; mocked
browser tests do not establish model compatibility. Run type checks, tests and production build.
Manual device tests cover permissions, orientation, background/resume and sustained responsiveness.

## Builder-check refinements

The worker compatibility spike is a prerequisite to finalizing this proposal: exercise the pinned
runtime, WASM, Lite0 and transferable frame path together. Use a fixed output score floor of 0.05
and expose a slider from 0.05 to 1.00; verify the runtime honors the floor. Configure a documented
result cap of 50 and explain that postprocessing/capping can omit detections below that output.
Inference time means duration of the worker detection call. Processing FPS means completed frames
per elapsed second, including scheduling/transfer effects; neither means camera FPS.

Worker crashes and model initialization timeouts transition to an actionable error and dispose
resources; Retry creates a fresh worker. Externally ended camera tracks transition to stopped and
require a new explicit Start. The model panel shows model/runtime versions, CPU delegate, verified
class coverage, asset source and measured compatibility status. Do not label an untested device
supported. Builder check performed by Codex; the designated review was subsequently supplied
through the user and its findings are tracked in docs/reviews/PHASE_1_RESPONSE.md.

## Implementation evidence and modules

The fixed-image test detects cat and dog in a real worker; the full UI/model path also passes
against a synthetic camera stream in development and production. See EXPERIMENTS.md for hardware,
versions, scores and timing limits. Physical iPhone/iPad Safari observations are recorded separately
as user reports; comprehensive platform validation is not claimed.

`src/camera.ts` owns stream lifetime; `capture.ts` bounds capture waits; `inference/client.ts`
owns worker lifecycle and transfer; `inference/detector.worker.ts` adapts MediaPipe; `lab.ts`
schedules frames and owns state; `detections.ts` filters/clips/measures; `overlay.ts` draws boxes;
`main.ts` and `style.css` present the lab. No backend, recording or uploads exist.

Asset preparation pins/checks the model and copies package-lock-pinned WASM locally. Module-worker
compatibility required the dynamic import hook, an explicit ModuleFactory export on copied loaders
and a global vendor debug hook. The original WASM binaries are unchanged. These changes are
verified with Chromium, not assumed portable. `THIRD_PARTY_NOTICES.md` records attribution.

Frame capture times out after 5s and late bitmaps are closed. Model load times out after 45s;
inference after 15s. Backgrounding pauses without automatic resume. Camera permission requests
remain cancellable through Stop; a late granted stream is released. Model errors release camera.
Processing FPS uses a 2-second rolling window; scheduling caps work at 10 FPS.

Video resize updates the container's live aspect ratio and clears old-aspect results until a matching
frame completes. Backgrounding during pending permission/model initialization is remembered, so
startup finishes paused and requires explicit Resume. Obsolete worker error callbacks are ignored.

## Review follow-up

`DetectorConfiguration` in `src/inference/types.ts` defines the chosen model, asset paths, runtime,
metadata and limits. The caller passes it into `WorkerDetector`; init messages carry the explicit
score threshold, result cap and CPU delegate to the adapter. `src/model-info.ts` derives displayed
metadata from the same configuration; asset preparation uses its model path/source/hash. Lite0
remains the only default asset. These interfaces do not add a Phase 3 model-comparison UI.

An externally ended camera track produces a connection-ended/reconnect explanation, distinct from
explicit Stop. Score presentation is capped at 99%, raw scores still drive inclusive filtering, and
only drawable boxes contribute to the displayed list/count. Hidden tabs retain the approved Pause
behavior (camera remains on); an automatic camera shutdown timer is deferred and not claimed.

Vercel's existing Git integration published previews of earlier phase commits. The repository's
`vercel.json` now disables automatic Git deployments for refs containing that configuration,
consistent with the no-deployment-without-approval rule. Existing previews are not removed and
project/production settings are not changed by this configuration addition.

## Phase 1 privacy follow-up

An early same-origin classic script activates camera-call instrumentation only for `?diag=1`;
its bounded metadata log stays in page memory outside the application DOM. It observes this realm
after installation and cannot cover earlier scripts, other tabs or saved native references.
`vercel.json` defines a response CSP for documents and workers; local Vite preview reuses it for
production verification. Same-origin connections remain allowed. See
[privacy notes](docs/phases/PHASE_1_PRIVACY.md) for limitations and pending physical checks.

PR #4 is merged. Its exact merge commit `edea505` has a single authorized temporary preview,
READY according to Vercel. Production/protection were not changed. Effective authenticated
response headers remain uninspected; user-reported physical sessions are recorded in the
[privacy-preview ledger](docs/validation/PHASE_1_PRIVACY_PREVIEW_2026-10-24.md).
Current accepted limitations and explicit user approval are in the closeout; historical ledgers are
not retroactively turned into complete validation.

The separate offline-message follow-up uses WorkerDetector's ready state to distinguish
initialization errors from active-inference worker crashes. It changes guidance only, keeps
reported detector detail and existing cleanup/retry semantics, and does not add connectivity
probes or automatic retry. See [follow-up notes](docs/phases/PHASE_1_OFFLINE_ERROR.md).

## Phase 2 proposed architecture — planning only

The user authorized a design/plan, not runtime work. The proposed pure tracker consumes accepted
Lab frames exactly once, separately from display threshold filtering; an inspection controller
owns session/geometry boundaries and bounded history. Proposed model floor .05, tracker floor .25
and display threshold are separate; public IDs are allocated on confirmation only. UI, supported
labels, metadata-only failure
notes (explicit localStorage save) and labelled synthetic evaluation remain separate modules. Current inference still emits
primary label/score/pixel box only. See the [Phase 2 entry](docs/phases/PHASE_2.md) and linked design
for alternatives, defaults, capability limits, memory/privacy rules and approval gates. No proposed
module or runtime behavior is implemented by the planning PR.

## Phase 2 integration checkpoint

Accepted Lab frames notify a synchronous optional observer before UI render. The inspection
controller normalizes once and updates the pure bounded tracker; slider/selection/timer renders
project existing state. Intrinsic geometry invalidates old generations; analysis/control boundaries
close segments. Tracking, catalog, controller and keyed list remain separate modules.
See [Tasks 1–3 checkpoint](docs/phases/PHASE_2_TASK_3_CHECKPOINT.md); later features remain gated.

## Phase 2 Tasks 4–6

Inspector projections are pure reads of once-committed tracking results. DOM/chart work is capped
at 4 Hz except explicit controls; video overlay follows observations. Chart time coordinates use
actual sample times and break at null samples. Near-threshold boxes come only from returned
valid normalized detections; the adapter supplies no alternative class scores. The pinned catalog
is enabled only for matching model provenance. Stage selection respects contain-fit letterboxes
and short single-pointer taps without preventing scroll or pinch.

Failure notes use a bounded canonical RAM store and guarded localStorage key
`visual-labs.phase2.failure-notes.v1`. Loading does not enable writes. Saving requires per-page
opt-in; deletion is explicit and failure never reports successful saved-data removal. Corrupt
saved data is preserved until explicit reset. Notes are user reports, not training/ground truth.

Synthetic evaluation uses a separate tracker and separate labelled truth. Bounded bitmask assignment
maximizes eligible matches, then total IoU, then stable truth-ID/birth-order ties; binary64 sums
within 10 machine epsilons are treated as numerical ties. It is distinct from live association.
Benchmark chunks yield every 10 frames; cancellation tokens block late/partial completed reports.
Start/Resume and hide/page exit cancel it. It runs only with inference inactive; a paused camera
preview can remain on, as explicitly disclosed. See [Phase 2 implementation](docs/phases/PHASE_2_IMPLEMENTATION.md).

## Device stress-profile follow-up

`runStressProfile` runs a separate fixed numeric tracker, yielding every update, with no camera,
model or storage access. A shared abort token in the benchmark panel serializes jobs, enforces
stopped-camera states and prevents late publication. App and developer tests use this same engine.
Timing stamps isolate update/returned-copy, extra snapshot and combined costs; optional long-task
records use interval overlap. Notes read current tracker configuration through a defensive getter.
See [scope, measurement definitions and pending device procedure](docs/phases/PHASE_2_STRESS_PROFILE.md).
