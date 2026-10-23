# Visual Labs AI architecture — proposed

Status: design proposal; no application implemented. Phase 1 only.

## Repository inspection (2026-10-23)

Repository: Harrisonxaph/Visual-Lab-AI. Baseline: main at cafa8c7.
Only README.md (project name and one-line description) and MIT LICENSE exist.
No application, package manager, tests, CI, deployment configuration or assistant instructions exist.
The initial workspace had no checkout; the repository was cloned before inspection.

## Recommended approach

A static Vite application using TypeScript, semantic HTML and CSS, with no backend or paid API.
Start with a small framework-free UI: video and canvas stay outside reactive rendering.
MediaPipe Tasks Vision runs EfficientDet-Lite0 with an explicit CPU delegate in a module worker.
This avoids requiring WebGPU/WebGL. CPU/WASM availability still requires validation.

Alternatives: TensorFlow.js COCO-SSD has established browser usage but changes the detector family;
a custom TFLite runtime needs more preprocessing and output-decoding work and validation.
EfficientDet-Lite2 remains a Phase 3 candidate, conditional on actual compatibility tests.
These are developer recommendations, not choices already approved by the user.

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
This proves availability, not browser inference compatibility. Before implementation is accepted,
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
supported. Builder check performed by Codex; Claude review remains pending.
