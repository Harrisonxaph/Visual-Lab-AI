# Visual Labs AI

A private, in-browser laboratory for learning how AI models are trained, evaluated and improved.

It started as a live object-detection lab: point a phone camera at objects and inspect what a
pretrained detector (EfficientDet-Lite0) sees and how confident it is. That foundation is built.
The roadmap now focuses on **training real models**: building labelled datasets, training a
classifier, measuring it honestly, and improving it with human feedback. See
[PROJECT_ROADMAP.md](PROJECT_ROADMAP.md).

| Phase | What you can do | Status |
| --- | --- | --- |
| 1 | Live detection, tracking, inspector, confidence and privacy safeguards | Implemented |
| 2 | Build labelled image datasets from your photos | Implemented (Dataset lab tab) |
| 3 | Train a real classifier and watch it learn | Implemented, in review (Training lab tab) |
| 4 | Evaluate: precision, recall, overfitting, experiments | Planned |
| 5 | Active learning: improve the model with your feedback | Planned |

The detector does not learn from the camera. Training happens in the Training lab (Phase 3), which
trains a small classifier on top of a frozen image encoder, and the app
always says which kind of learning is happening (see the table at the top of the roadmap).

## Run locally

Use Node **24.5 or newer** and npm.

```sh
npm ci
npm run assets
npm run dev
```

Open `http://localhost:5173` and choose **Start camera**. A phone or tablet needs **HTTPS** to use
the camera. No API key or paid service is required.

`npm run assets` downloads the pinned 13.2 MiB Lite0 model, verifies its SHA-256 and copies
MediaPipe's WASM files from the pinned npm package. Everything is served from the same origin; no
frames are uploaded. If the checksum fails, delete `public/models/efficientdet_lite0.tflite` and
rerun it.

**Pause** stops inference (camera preview stays on). **Stop** releases the camera. Leaving the page
stops the session. Frames are not recorded.

## Checks

```sh
npm run check
npm run format:check
npm test
npx playwright install --with-deps chromium
npm run test:browser
npm run build
npm run test:production
```

Set `CHROMIUM_PATH=/path/to/chromium` to use an existing Chromium. Tests combine mocked lifecycle
tests with real CPU/WASM inference on a fixed image. CI runs them on pull requests and on `main`.

## Compatibility and interpretation

Automated tests run in Chromium. iPhone/iPad Safari behaviour comes from user-reported sessions with
documented limits; comprehensive Safari, macOS Safari and Android support are not claimed. The app
needs a secure context, module workers, transferable ImageBitmap, OffscreenCanvas and WebAssembly.

Confidence is a model score, **not measured accuracy**.

## Documentation

- [Roadmap, phases, completion criteria and known issues](PROJECT_ROADMAP.md)
- [Development workflow and testing approach](docs/WORKFLOW.md)
- [Assistant instructions](AGENTS.md)
- [Architecture](ARCHITECTURE.md) and [model limitations](MODEL_LIMITATIONS.md)
- [Experiment evidence](EXPERIMENTS.md)
- [Supported detector categories](docs/COCO_LABELS.md)
- [Third-party provenance and notices](THIRD_PARTY_NOTICES.md)
- History: [Phase 1 closeout](docs/phases/PHASE_1_CLOSEOUT.md),
  [tracking implementation](docs/phases/PHASE_2_IMPLEMENTATION.md),
  [device ledgers](docs/validation/), [reviews](docs/reviews/)

## Roles

Claude develops; Codex reviews; the project owner approves merges and deployments. Each milestone
uses its own branch and pull request.

Application source: MIT. Third-party assets keep their own terms.

Deployment: `vercel.json` disables automatic Git deployments. Production still serves the original
README-only commit; any deployment requires explicit owner approval.
