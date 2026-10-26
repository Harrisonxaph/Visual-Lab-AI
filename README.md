# Visual Labs AI

A local-first educational lab for learning how AI models are trained, evaluated and improved.
The current app runs a **pretrained** object detector with tracking and inspection; it does not yet
train a model. Camera observation and failure notes do not retrain EfficientDet.

The [training-first roadmap](PROJECT_ROADMAP.md) preserves that working app and proposes an upload-based
dataset lab, genuine classifier training, evaluation experiments and active learning. Phase 3 supplies
the first training system; Phase 4 completes the core learning lab. Later features are planned,
not implemented. Camera use will be optional for dataset/training experiments.

Claude develops; Codex independently reviews; the owner approves scope, merges and deployments.
See [workflow and proportionate testing](docs/DEVELOPMENT_WORKFLOW.md). No routine repeated camera,
battery or warmth walkthrough is required. Existing evidence is reused and untested items stay untested.

## Run locally

Use Node **24.5 or newer** (tested on 24.19.0) and npm.

```sh
npm ci
npm run assets
npm run dev
```

Open `http://localhost:5173` and choose **Start camera**. Grant permission when your browser asks.
On a phone or tablet, a remote development server needs **HTTPS**; an HTTP LAN address generally
cannot request camera access. Prefer rear-facing camera, good lighting and familiar COCO objects.
No API key or paid service is required.

`npm run assets` downloads the pinned 13.2 MiB Lite0 model and verifies its SHA-256, then copies
MediaPipe's WASM resources from the pinned npm package. Builds serve everything from the same
origin: no runtime model CDN and no frame uploads. Network is needed for first setup and asset
acquisition. This phase does not guarantee offline operation or provide a service worker.
If the model checksum fails, remove `public/models/efficientdet_lite0.tflite` and rerun assets.

**Pause** stops inference and clears detections; camera preview remains on. **Stop** releases
camera tracks, terminates inference and clears results. Backgrounding pauses inference; returning
requires Resume. Leaving the page stops the session. Frames and detections are not recorded;
the confidence threshold can be saved and failure notes can be explicitly saved in local storage.
Camera frames are not saved. Storage errors are handled; actual Safari storage denial remains untested.

## Checks

```sh
npm run check
npm test
npx playwright install --with-deps chromium
npm run test:browser
npm run build
npm run test:production
npm run format:check
```

For an existing Chromium installation set `CHROMIUM_PATH=/path/to/chromium` for browser commands.
The test suite combines mocked lifecycle/error tests with **actual CPU/WASM inference** against
a fixed test image. Production smoke tests exercise the built worker with GPU acceleration disabled.
CI runs these checks on PRs. [Manual device checks and results](docs/phases/PHASE_1.md) distinguish
simulated camera tests from real hardware testing. A build is local verification, not deployment.
The [recorded plain-link comparison](docs/validation/PHASE_1_OFFLINE_RETEST_2026-10-25.md#o6--plain-link-fresh-tab-check-without-diagnostics-2026-10-25)
used https://visual-lab-2co40dr92-harrisonjbailey-3896.vercel.app without `?diag=1` (source `063a97a`).
It is a user-reported Phase 1 pass with device/tab-closure limits, not a Phase 2 test.

## Compatibility and interpretation

Verified: headless Chromium 154 on Linux x86_64, including the built application.
The recorded iPhone/iPad Safari sessions provide **user-reported physical observations**, with
coverage limits in the [approved Phase 1 closeout](docs/phases/PHASE_1_CLOSEOUT.md). Comprehensive
Safari compatibility, macOS Safari and Android remain unverified; viewport tests do not establish
device compatibility. Requires secure camera access, module workers,
transferable ImageBitmap, OffscreenCanvas and WASM. Unsupported features show actionable errors.
MediaPipe SIMD capability detection selects its WASM variant; no GPU delegate is required.

Confidence is a model score, **not measured accuracy**. The UI displays results at or above the
threshold, subject to a 5% model output floor and 50-result cap. Processing FPS uses a 2-second rolling window, and scheduling is capped at 10 FPS;
actual speed depends on hardware. Model-load timeout is 45 seconds, frame inference timeout is
15 seconds, and frame capture timeout is 5 seconds. Slow devices may need to retry.

## Documentation

- [Architecture and actual repository inspection](ARCHITECTURE.md)
- [Training-first phases and optional stretch targets](PROJECT_ROADMAP.md)
- [Model limitations](MODEL_LIMITATIONS.md) and [supported categories](docs/COCO_LABELS.md)
- [Experiment evidence](EXPERIMENTS.md)
- [Phase 1 approved closeout and decisions](docs/phases/PHASE_1_CLOSEOUT.md)
- [Phase 1 testing and delivery notes](docs/phases/PHASE_1.md)
- [Developer/reviewer handoff](docs/DEVELOPMENT_WORKFLOW.md)
- [Historical Phase 1 review handoff](docs/CLAUDE_REVIEW.md)
- [Assistant instructions](AGENTS.md)
- [Third-party provenance and notices](THIRD_PARTY_NOTICES.md)

Historical Phase 1 review and accepted closeout remain in the [review response](docs/reviews/PHASE_1_RESPONSE.md)
and [closeout](docs/phases/PHASE_1_CLOSEOUT.md). Old documents named Phase 2 concern tracking;
the new Phase 2 means Dataset Laboratory. Historical tracking acceptance remains partial, not passed
by renaming the roadmap. Use scoped branches/PRs; merges and deployments require owner approval.
Application source: MIT. Third-party assets retain their own terms and attribution.

Vercel Git integration automatically created previews of earlier branch pushes. `vercel.json` now
disables automatic Git deployments for refs containing it; no existing preview is removed.
No manual deployment or production change is authorized by this PR. The CI workflow runs on PR
events, pushes limited to main, or manual dispatch. PR branch pushes do not also trigger push jobs.

Phase 1 privacy follow-up: [diagnostics, policy limits and pending device checklist](docs/phases/PHASE_1_PRIVACY.md).

Legacy tracking Phase 2 Tasks 1–6 were merged via [PR #11](https://github.com/Harrisonxaph/Visual-Lab-AI/pull/11) on 2026-10-26 UTC (`efdb1d9`); physical acceptance remains pending.
See [scope, automated evidence, profiling and remaining checks](docs/phases/PHASE_2_IMPLEMENTATION.md).
Legacy tracking acceptance remains incomplete; no deployment approval is implied.
The [device stress-profile follow-up](docs/phases/PHASE_2_STRESS_PROFILE.md) adds an inference-inactive
synthetic timing button (paused preview stays on) and note-form corrections; its iPhone synthetic timing evidence is recorded in the legacy device ledger;
iPad legacy Phase 2 acceptance remains unestablished.
