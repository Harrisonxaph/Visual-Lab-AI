# Visual Labs AI architecture

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
