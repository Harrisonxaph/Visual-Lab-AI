# Visual Labs AI

A planned private, on-device computer-vision laboratory for investigating detections,
tracking, uncertainty and model performance.

## Actual status

Phase 1 design proposal only. The original repository contained this README and an MIT license;
there is no runnable application, dependency setup or test suite yet. No deployment exists from
this work. Do not interpret the roadmap as implemented functionality.

- [Architecture and repository inspection](ARCHITECTURE.md)
- [All five phases and stretch targets](PROJECT_ROADMAP.md)
- [Phase 1 plan and manual testing matrix](docs/phases/PHASE_1.md)
- [Model limitations](MODEL_LIMITATIONS.md)
- [Experiment evidence requirements](EXPERIMENTS.md)
- [Assistant instructions](AGENTS.md)

Proposed stack: TypeScript/Vite with MediaPipe Tasks Vision, EfficientDet-Lite0 CPU/WASM in a
worker. Browser inference compatibility must be verified before accepting that runtime choice.
Camera footage stays local; model/asset acquisition may require network access.

Development uses a separate branch and PR per phase. Codex implements and Claude reviews.
Merging and deployment require user approval. License: MIT; third-party model/runtime licenses
must be documented separately when dependencies are introduced.
