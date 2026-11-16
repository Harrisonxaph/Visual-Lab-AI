# Visual Labs AI architecture

## Current summary (roadmap reset, 2026-10-26)

A static Vite + TypeScript app with a framework-free DOM UI, no backend and no paid services.
The current local database is v3: the Phase 4 final-check store is additive to the Phase 3 schema,
which is recorded below in its original context.

| Area | Modules | Reuse for training phases |
| --- | --- | --- |
| Camera and capture | `camera.ts`, `capture.ts` | Optional image source for datasets |
| Inference worker | `inference/client.ts`, `inference/detector.worker.ts`, `inference/types.ts` | Same MediaPipe loader adaptations, worker lifecycle, timeouts and typed configuration pattern for the image embedder |
| Assets | `scripts/prepare-assets.mjs`, `THIRD_PARTY_NOTICES.md` | Pinned download + SHA-256 check for the detector and (since Phase 3) the embedder model |
| Lifecycle and scheduling | `lab.ts` | Unchanged; detection-only |
| Tracking and inspection | `tracking/*`, `inspection/*`, `ui/*` | Patterns: seeded synthetic fixtures, cancellable jobs, bounded state, canvas charts |
| Local storage | `failures/store.ts` | Patterns: guarded storage, schema validation, size limits, honest deletion status |
| Privacy | `vercel.json` CSP, `public/camera-diagnostics.js` | CSP already allows same-origin workers, WASM and blob media; datasets stay local |
| Tests | `tests/`, `tests/browser/` | Fake camera, worker stubs, real-runtime smoke tests, CI |

## Dataset lab (Phase 2, implemented)

| Module | Role |
| --- | --- |
| `datasets/types.ts`, `limits.ts` | Records, limits (500 images, 10 labels, 5 datasets, 25 MB/file, 50 files/import), name validation |
| `datasets/hash.ts` | SHA-256 of original bytes (exact duplicates), 64-bit difference hash (likely near-duplicates) |
| `datasets/splits.ts` | Pure, deterministic related-group and split rules (tested in Node, including a randomised group-integrity test) |
| `datasets/stats.ts` | Counts per label/split, warnings |
| `datasets/importer.ts` | Decode with orientation, downscale to 512 px JPEG (drops file metadata), thumbnail, hashes |
| `datasets/db.ts` | IndexedDB stores `datasets`, `labels`, `images`, `blobs`; every change is one transaction |
| `datasets/service.ts` | Computes each change in memory, commits it, then updates state; import is one image per transaction |
| `datasets/example.ts` | Seeded generated shapes plus a deliberate near-copy and exact duplicate |
| `ui/dataset-lab.ts`, `ui/acceptance-checklist.ts` | Dataset lab tab and in-app Pass / Fail / Skip checklist |

The Dataset lab is mounted only when its tab is opened, so the detector path is unchanged;
opening it pauses running detection. Thumbnails are drawn on canvases, so the CSP is unchanged.

## Training lab (Phase 3, implemented)

| Module | Role |
| --- | --- |
| `learning/encoder.ts` | Pinned frozen encoder: MobileNetV3-Small embedder (float32 v1, SHA-256 checked by `prepare-assets.mjs`), 1,024 dimensions, `ENCODER_KEY` = model hash + runtime + preprocessing (`stretch-224/l2norm/v1`) |
| `learning/embedder.worker.ts`, `embedder-client.ts`, `embedder-types.ts` | MediaPipe `ImageEmbedder` in a module worker (CPU, IMAGE mode, L2-normalised), same loader adaptations as the detector worker; the model loads lazily on first use |
| `learning/embeddings.ts` | Embedding cache: reuses stored vectors with the same `ENCODER_KEY`, computes and saves the rest one at a time; refuses test-split photos; cancellable |
| `learning/examples.ts` | Picks training (optional seeded per-label cap) and validation photos of the chosen labels; `assertNoTestImages` guard |
| `learning/softmax.ts` | Softmax regression in Float64: stable softmax/log-sum-exp, mean cross-entropy, exact gradient, mini-batch SGD epoch, non-finite guard, parameter evidence |
| `learning/trainer.ts` | Settings ranges, epoch loop that yields to the browser between epochs, cancellation keeps completed epochs, honest outcome sentence |
| `learning/models.ts`, `learning/types.ts` | Saved-model record and compatibility check (damaged weights, encoder key, dataset, missing labels refused; changed dataset version warns) |
| `ui/training-lab.ts`, `ui/training-chart.ts` | Training lab tab: data and settings, live loss/accuracy charts, before/after table, parameter evidence, saved models |

- **Storage:** Phase 3 introduced database version 2, adding two stores: `embeddings`
  (key `imageId`, one vector per photo for the current encoder) and `models` (up to 5 per dataset,
  weights stored as `Float64Array` by IndexedDB structured clone rather than JSON). Deleting a
  photo deletes its embedding; deleting a label with its photos or a dataset deletes their
  embeddings, and deleting a dataset deletes its saved models, in the same transaction.
- **Where code runs:** embeddings in a worker; training on the main thread one epoch at a time,
  yielding between epochs (a 500-photo, 10-label epoch is about 10 M multiply-adds).
- **Saved-model independence:** a saved model records its training photos (id, SHA-256,
  difference hash). On load, `independentValidation` (`learning/models.ts`) leaves out current
  validation photos it learned from, re-imported copies and likely near-copies, so a re-split
  cannot turn training photos into its "validation" check.
- **Stale work:** `DatasetDb.commit` accepts `require` (dataset or photo ids checked inside the
  write transaction); model and embedding saves use it. The Training lab cancels a job whose
  dataset is deleted and re-checks before showing results.
- **Test split sealed:** test photos are never embedded or evaluated in Phase 3 (code guard plus
  unit and browser tests). Only the explicit Phase 4 final-check path described below can open
  them; routine training/validation guards remain in force.
- The Training lab reopens its own storage connection whenever its tab is shown, so it sees the
  Dataset lab's latest changes; the detector path and the CSP are unchanged.

## Planned learning-lab architecture (Phases 2–5)

Proposed; each phase's plan is approved before implementation.

```text
Photo library / camera ──► Dataset store (IndexedDB: image blobs + labels + split + hashes)
                                   │
                                   ▼
             Embedder worker (MediaPipe ImageEmbedder, MobileNetV3-Small, FROZEN)
                                   │  1,024 numbers per image, cached per image + model hash
                                   ▼
             Trainable classifier (plain TypeScript: softmax regression, optional hidden layer)
             forward ─► cross-entropy loss ─► gradients ─► optimiser step (SGD/Adam)
                                   │
                                   ▼
        Evaluation (accuracy, precision, recall, confusion matrix, loss curves) ─► experiment records
```

- **What learns:** only the classifier's weights and biases (about 1,024 × number of labels, plus a
  hidden layer if enabled). **What stays frozen:** the embedder network.
- **Why this stack:** it reuses the MediaPipe package already pinned (`@mediapipe/tasks-vision`
  0.10.32 includes `ImageEmbedder`), adds no runtime dependency, keeps every weight and gradient
  visible for teaching, trains in well under a second on small datasets, and can be tested
  deterministically in Node and Chromium without phone hardware.
- **Feasibility check (2026-10-26, Chromium, throwaway code):** MobileNetV3-Small embedder
  (float32 v1, 4,117,670 bytes) produced 1,024-number embeddings in about 9 ms per 224×224 image.
  A softmax classifier trained on 60 generated shape images (circles / squares / triangles) went
  from loss 1.10 (chance, ln 3) to 0.005, and from 33% to 100% accuracy on 30 validation images.
  Generated shapes are an easy task: this proves the pipeline works, not that real photos will.
- **Alternatives considered:** TensorFlow.js + MobileNet enables true fine-tuning (roadmap type 3)
  but adds a large dependency and GPU-backend variability; deferred to stretch targets. Offline
  Python/MediaPipe Model Maker training is needed for detector fine-tuning (type 5); not in-app.
- **Storage:** IndexedDB for images (downscaled on import), labels, splits, cached embeddings and
  saved models. `navigator.storage.persist()` requested where supported. Clear-all deletion.
- **Splits and leakage:** deterministic splits from a seed; exact duplicates by SHA-256; likely
  near duplicates by a small perceptual hash. Each identified related-image group is assigned to
  one split as a unit. The hash cannot find every similar image, so undetected similarity may
  still leak and the app discloses this. Iteration uses validation; the test split is evaluated
  once at the end, and any later reuse is labelled as no longer independent.
- **Model files:** saved classifier = JSON weights + label list + embedder model hash + training
  settings; reload refuses incompatible embedders or label sets.

## Historical record

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


## Phase 4 first slice — read-only validation metrics

`learning/metrics.ts` builds counts, an actual-row/predicted-column confusion matrix and per-class
precision/recall from an existing evaluation. It returns null when a denominator is zero and rejects
invalid indices or mismatched arrays. It does not choose photos or claim independence.
`ui/classification-metrics.ts` renders counts, ratios and explanations with DOM text, without reading
storage. The Training lab supplies its existing validation results; loaded-model results pass through
the existing training-provenance filter first. The unknown-provenance warning remains visible.
No extra inference, image persistence, schema change or test-split access is added.


## Phase 4 reproducible saved runs — second slice

`learning/experiments.ts` records the algorithm version, split seed, class order and ordered
training/validation references (image id, original-file SHA-256 and label id). Bump the algorithm
identifier when numerical training semantics change. A run's existing
model record already carries its encoder/preprocessing key, dataset/version and settings.
The optional manifest is saved in the existing models store: no new schema or store is needed.
It excludes test photos and raw images. Model/dataset deletion uses the existing cascade rules.

The Training lab exposes an unsigned 32-bit seed (default 42). Restore checks the current dataset
version and exact selected references before copying settings; it never starts a job automatically.
Stopped runs restore completed epochs; a run with zero completed epochs cannot be repeated as a
trained model. An action guard serializes asynchronous controls and refreshes state afterwards.

`ui/run-comparison.ts` reads two saved histories, not the current validation images. Comparison
requires matching dataset/version, encoder/dimensions, algorithm, classes, split seed, and ordered
training/validation references with finite measured results. It shows both settings and actual
completed epochs, including early stopping and any changed settings. It does not run inference,
choose a winner, write data or open the sealed test set. Historical comparisons remain explicitly
labelled with their recorded version even if the current dataset has changed.

## Phase 4 controlled learning lessons — third slice

`learning/lessons.ts` creates seeded, separate numeric training/validation arrays for three
bounded tasks and calls the existing `runTraining`/softmax optimiser. The tasks illustrate useful
learning, memorisation of unrelated labels and a linear model unable to fit a nonlinear boundary.
They use at most 150 epochs, 48 features and 150 examples total. No encoder, image data, database
or model persistence is used by a lesson.

`ui/learning-lessons.ts` reuses the epoch charts and reports measured accuracy and parameter
change. It yields between epochs. The Training lab serialises lessons with photo-training/storage
actions; each has its own cancel control. Manual cancellation retains completed epochs, labelled
partial. Leaving the lab, backgrounding or pagehide cancels and discards the pending lesson result.
This does not change the existing photo-training lifecycle or expose final-test photos.

## Phase 4 saved-run reports — fourth slice

`learning/run-report.ts` serializes an explicit allowlist from a saved `ModelRecord`. The versioned
`visual-labs.run-report/v1` JSON contains recorded settings, epoch history, counts, encoder key,
dataset/version, class IDs and the optional ordered run manifest. It retains null validation
measurements, distinguishes planned/completed epochs and labels missing legacy manifests. It
rejects invalid measurements/settings and inconsistent manifests rather than silently converting
non-finite numbers to JSON null. It bounds output to 1 MiB. Class names require explicit opt-in;
model/dataset names, training-provenance extras, weights, embeddings and images are excluded.

`ui/run-report.ts` prepares an application/json Blob only on an explicit download click. Its
constant filename avoids including user text. The temporary anchor is removed immediately and
its object URL is released after 30 seconds so the browser can acquire the download. It never
opens data stores, runs inference or uploads. The existing Training lab action guard serialises
exports with jobs. Existing deletion, model compatibility and final-test sealing are unchanged.
There is no report importer or new schema/store.

## Phase 4 training-set-size experiments — fifth slice

`compareRecordedRuns` defaults to strict same-data comparison. An explicit `dataset-size` mode
keeps dataset/version, class order, encoder, split seed and ordered validation references fixed.
It additionally requires valid identical optimiser settings (excluding the cap), complete matching
epoch budgets, and different actual training counts. It rejects duplicate IDs, missing label/hash
references and train/validation hash overlap. The smaller training manifest must equal the exact
seeded cap selection from the larger manifest, preserving recorded order; arbitrary subsets fail.
This reuses the Dataset lab's stable hash ranking and does not read images or run inference.

`ui/run-comparison.ts` exposes the mode and labels recorded counts, caps, metrics and batch-update
counts. A fixed epoch budget is not equal compute: data volume can change both batch sizes and
number of optimiser updates. Training losses use different examples in size mode; validation
measurements use identical recorded examples. Existing restoration remains same-snapshot only.
No optimiser, encoder, model schema or storage behaviour changes, and test photos remain sealed.

## Phase 4 explicit final held-out evaluation — sixth slice

`learning/final-evaluation.ts` preflights a saved model against the exact current dataset/run
manifest. The snapshot must match; the model must be complete and compatible. Every selected
class needs test examples. Exact/near-copy overlap with training or validation is refused (rather
than filtering test examples and changing the exam). The model fingerprint covers parameters,
encoder, class order, settings and recorded provenance. No test pixels are read during preflight.

`learning/final-store.ts` uses a single readwrite IndexedDB transaction across datasets, labels,
images, models and the new `finalChecks` store. It validates current data and parameters before
saving a durable per-dataset choice. Competing choices across tabs serialize. Completion requires
the original lock, unchanged snapshot/model and valid full predictions. The result cannot overwrite
a completed entry or resurrect deleted data. A failed/cancelled check leaves a committed lock
retryable only for that same model/snapshot. Transaction cancellation rolls back its writes.
Database v3 adds only this store; existing datasets, model weights and embedding caches are kept.
Dataset deletion and Delete all remove final records; deleting a model removes its weights but
leaves the disclosed historical report. No duplicate model weights or photos are stored here.

The dedicated executor computes test embeddings in memory using the existing worker, then evaluates
the frozen classifier. It never calls `embedImages`, saves test embeddings or updates weights.
Abortable waits discard partial results; tab/background/pagehide cancellation releases the worker.
The Training lab publishes metrics only after atomic completion, using the existing metrics panel.
Training, validation, comparisons and lessons keep their test guards. Historical reports remain
labelled with their original version even if data/model changes later. There is no lock-reset UI.
This is local state, not a security boundary against devtools, storage clearing or eviction.

## Phase 4 1-nearest-neighbour validation baseline — seventh slice

`learning/nearest-neighbour.ts` provides the fixed squared-L2/first-tie 1-NN predictor and a strict
metadata preflight. It requires the saved run's exact dataset/version, class order, encoder key,
ordered capped selection and complete matching training provenance. It reuses the existing
independence filter and refuses an empty check. Ground-truth validation labels are used only for
scoring, never passed to the neighbour predictor. Vectors/labels are validated and left unchanged;
the loop yields between queries and discards partial output on cancellation. Dataset limits bound
work. No weights are learned by 1-NN and no probabilities, confidence or cross-entropy are fabricated.

The Training lab serialises a dedicated cancellable comparison job with other work. Existing
`embedImages` loads/recomputes/caches only training/validation features. Both methods then use the
same current validation embeddings; the softmax parameters are frozen. Preflight is repeated after
computation, and deleted models/changed snapshots discard the result. Cancel, hide, pagehide and
leaving the lab stop active comparisons. Initial reads happen before creating the encoding-cancel
promise, preventing an early unused rejection; abort listeners are removed afterwards.

`ui/baseline-comparison.ts` reuses the metrics panels and reports counts, exclusions, actual saved
training epochs and method rules. Results stay in page memory, not the model/database/report JSON.
Reload or a refresh detecting relevant data/model changes clears them. The existing final choice
and test guards are unchanged; an already-opened final test gets an explicit reuse warning. Cached
features may be regenerated with small runtime-dependent differences; exact historical feature
bits are not guaranteed. No new stores, schema changes, dependencies or model resources are needed.

## Phase 4 optional L2 classifier regularisation — eighth slice

`TrainingSettings.l2` is optional: missing means zero and old records are never backfilled. The
UI accepts 0–1, initially 0; zero is omitted when storing new settings. `lossAndGradients` adds
lambda W once to each mean minibatch gradient and lambda/2 sum(W²) to its loss. Bias gradients
are unchanged. `trainEpoch` uses that gradient with the existing SGD, seed, batches and ordering.
Zero skips penalty arithmetic. Minibatch CE reuses forward probabilities when normal, with a
log-sum-exp fallback for subnormal or zero probabilities. This avoids a second forward pass in
ordinary batches while fixing clipping at ~744 and subnormal rounding errors; valid zero-strength training
updates/history remain unchanged, verified against a pre-change numerical fixture.

`EpochRecord.trainLoss` and validation/final losses remain mean prediction cross-entropy. Positive
runs also record `trainObjective` (training CE + penalty) at epoch 0 and completed epochs. The loss
curves keep the same CE definition; progress/results report the objective separately. No penalty
is added when predicting, checking validation or computing final-test metrics.

Zero/missing settings retain `softmax-sgd-f64/v1`; positive strength uses
`softmax-sgd-f64-l2/v1`. Manifest creation, restore and reports validate the settings/tag pairing.
Comparisons accept the two supported SGD objectives on matching data and list the strength change;
size experiments additionally require equal strength. Missing and explicit zero compare equally.
The existing report schema gains optional `settings.l2` and `history[].trainObjective`; regularised
reports refuse missing/non-finite objectives instead of substituting CE. No store/schema changes,
weight-shape changes, encoder changes or new resources/dependencies are introduced. Existing final
locks are not rewritten; fingerprints include each stored settings/manifest representation.


## Nonlinear capacity lesson — ninth Phase 4 slice

`learning/nonlinear.ts` is a bounded educational learner: two numeric inputs, eight tanh hidden
units and two softmax outputs, 42 Float64 parameters. Xavier uniform initialises both weight
matrices; biases start at zero. Backpropagation differentiates mean score-based cross-entropy
through tanh into both layers and biases. Mini-batch SGD uses a seeded Fisher–Yates shuffle,
yields between epochs and guards non-finite values. Only bounded two-feature binary lesson data
are accepted; regularisation is disabled for this controlled comparison.

`runCapacityComparison` in `learning/lessons.ts` feeds exactly one generated underfitting dataset
to the existing softmax optimiser and the network. Both get 48 training / 80 separate validation
examples, seed 42, learning rate 0.5, batch size 16 and 100 epochs. Softmax starts with small
normal weights, the network with Xavier uniform. This is equal epoch budget, not equal compute
or a general benchmark. Validation is evaluated after updates but never differentiated.

`ui/nonlinear-lesson.ts` mounts inside the existing learning lessons. It shares their busy gate
with photo operations and other lessons. Explicit Cancel publishes no completed comparison;
leaving, backgrounding and pagehide discard incomplete output. Completed curves distinguish
both methods and both splits; parameter evidence reports changes in each network weight matrix.
Nothing is saved or uploaded. There are no dataset, encoder, camera or test-split dependencies.
Photo classifiers, their saved format, final locks and database schema are unchanged. Training a
network from random numeric features is not fine-tuning the detector or pretrained encoder.


## Photo-feature method comparison — tenth Phase 4 slice

The nonlinear core now supports 1–1,024 features and 2–10 classes with a fixed 8-unit tanh hidden
layer. Default 2-feature/2-class initialization preserves the numeric lesson. Each matrix uses
Xavier uniform based on its fan-in/fan-out; biases start zero. Backpropagation includes both layers;
optional L2 adds lambda W to each mean minibatch weight gradient, with biases excluded. Training
history keeps prediction CE separate from the penalised objective, just as softmax does.

`learning/method-comparison.ts` reuses `prepareBaseline` snapshot, ordered cap, provenance,
independence and test guards; it additionally requires a completed source run. Both models train
afresh using exactly the same current feature arrays and source settings. Historical classifier
weights/scores are not compared against newly encoded training features. The network yields and
checks cancellation between batches; no incomplete comparison is published. Equal epochs do not
mean equal compute, and different parameter counts/initialization/penalised objectives are disclosed.

The existing comparison lifecycle in `ui/training-lab.ts` handles feature preparation, cancellation,
hidden/pagehide/leaving, encoder disposal and post-job dataset/source rechecks for both kinds of
comparison. `ui/photo-method-comparison.ts` shows shared validation metrics and both methods' CE
and accuracy histories. Results/models are page-memory only and cleared on relevant snapshot/source
changes. Missing training/validation features may use the existing local cache; test features are
never requested or cached. No source model, final lock, saved format, schema or dependency changes.
Saving networks and evaluating a selected network on final-test data are later bounded slices.


## Neural-network files — eleventh Phase 4 slice

`learning/network-files.ts` defines `visual-labs.network-model/v1`: explicit JSON parameter files,
not the existing metadata-only run reports and not a dataset backup. Four weight/bias arrays are
encoded as numbers and decoded into Float64 arrays. Known tanh8 algorithm tags distinguish zero
and positive L2. Encoder/preprocessing, dimensions, class order, settings, complete epoch history,
original dataset/version/split seed and actual training/validation references accompany the model.
Label names are opt-in; source/dataset names, raw photos and cached embeddings are excluded.

Read at most 1 MiB. Shape, finite values, class/ref uniqueness, split hash disjointness, settings,
history and final objective consistency are checked before allocating model arrays. Unknown fields
are discarded through explicit allowlists. Files do not execute code. Compatibility requires the
original encoder, dataset ID and label IDs. Changed dataset versions warn. Current validation is
screened against recorded training IDs, SHA hashes and difference hashes, using the existing rule;
no test pixels are requested. File history/provenance is not signed or independently verified;
current predictions are actually recomputed, but screening cannot prove no unrecorded training.

`ui/network-file-panel.ts` provides explicit downloads (generic filename, temporary blob URL) and
file selection. The Training lab uses its existing cancellable comparison job to parse/check,
encode only current permitted validation images and run inference without training. Dataset
changes during a check discard the result; later changes clear page-memory results. Reloaded
networks hold the dataset version when checked, so an older exported model's warning does not
incorrectly erase a completed current check. Nothing is written to the model database: the schema
stays v3, saved softmax models and durable final locks remain unchanged. Missing current validation
features may use the existing guarded embedding cache. Download deletion belongs to Files/Downloads;
clearing app storage cannot remove exports. A network final-test path remains separate work.


## Protected neural final choice — twelfth Phase 4 slice

`FinalPlan.networkChoice` is optional: absence retains the original softmax path and byte-for-byte
legacy model signature. Presence records the tanh8 algorithm, all four parameter arrays, actual
network history and actual training/validation references. The `modelId` remains the saved source
run ID; `sourceRun` describes that source's configuration/selection, while `networkChoice` describes
the actual selected neural classifier. UI method labels make this distinction explicit.

Only the completed in-session photo comparison produces an eligible neural choice. Imported
network files are not offered, because their provenance is unverified. Choice construction reuses
the bounded parameter/history/provenance validator from model-file export; this internal data-only
normalisation creates no download or persistence. Preflight verifies it against the exact current
source selection and applies the existing held-out integrity guards. The identity hash adds actual
network parameters and provenance to the existing source signature. No legacy signature is changed.

`FinalCheckStore` uses its existing readwrite transaction and single dataset key for both methods.
It verifies the saved source and unchanged dataset, and refuses method/parameter/provenance changes
to an existing choice, even for the same source ID. Exact network parameters are stored with an
explicitly confirmed lock before any test pixels are read. Reload can retry that immutable network
without retraining; the original source must remain available. Parameters remain with completed
history until dataset deletion, which already removes the finalChecks record atomically. The
confirmation and retention explanation disclose this extra copy; deleting a source does not remove
these retained network parameters. No new store or database version is needed.

`runFinalCheck` fingerprints the actual locked choice before reading test blobs and dispatches to
frozen softmax or neural inference. It uses only locked test references, keeps embeddings in memory
and commits one complete result before displaying it. Cancellation/failure keeps the original
choice, publishes no partial score and cannot reset exposure. Source/configuration changes refuse
retry. Older builds cannot retry neural locks because their source-only fingerprint mismatches;
use a compatible current build. Historical scores are never a fresh evaluation of edited data.


## Phase 5 first slice — bounded review queue

`learning/active-review.ts` reuses strict source snapshot/provenance checks. Pool members must have
both labelId and split null. Known exact/near copies of any protected image are excluded, including
validation/test metadata; protected images are never selected as review inputs. Conservative grouping ignores manual
not-related overrides. One representative per pool group is retained; at most the first 50 by
stable import order are scored, and deferred counts are shown. Difference-hash limitations remain.

The frozen saved softmax head produces actual probabilities. Uncertainty ordering uses top-two
margin (ascending); entropy uses natural logs, skipping p=0 terms. Seeded hash ordering is a review
control on the same scored window, not a learning-quality comparison. Feature and probability
non-finiteness fail rather than manufacturing rankings. The model does not optimise or change.

`ui/active-review-panel.ts` shows at most 10 candidates, local thumbnails, confidence/margin/entropy,
and accept/correct/skip controls. Decisions are bounded page memory only. The Training lab uses a
separate cancellable review phase in its existing job/busy gate, encodes only eligible pool photos
with a read-only embedding-store adapter. Existing permitted features may be reused, but newly
computed review features are page memory only. It rechecks metadata before each uncached image
read and the full snapshot/source before publishing a complete queue. A role change in another
tab cannot turn a review cache write into a persistent test embedding because there are no review
cache writes. Cancel/background/navigation publishes no partial queue. Relevant changes/reload clear decisions.
Scoring alone changes no dataset metadata, model weights, final locks, schema or dependencies.

Promotion uses the explicit protected transaction described below rather than ordinary
setImageLabel/recompute, which can assign new groups to validation/test. Controlled retraining and
validation comparison with a seeded random-selection arm remain unimplemented. Test results cannot
guide rounds or be silently refreshed after Phase 4 exposure.

### Consent-gated training promotion

`learning/review-promotion.ts` builds only approved training changes. `DatasetDb.promoteReview`
reads dataset, source model, labels and all image metadata in one readwrite transaction, checks the
exact saved model and current snapshot, then writes approved image records and increments the dataset
version. No await or independent transaction separates validation from writes. Source deletion,
stale versions and request failures abort the entire operation. All existing evaluation assignments,
models, final locks, blobs and cached embeddings remain untouched. Hash-connected groups touching
protected images are refused even through an unlabelled bridge; manual separation overrides do not
weaken this check. No test pixels are read.

An explicit consent checkbox gates the commit button. Provenance is an optional field on the
existing image record (no schema/store migration): source model/version/encoder, proposed and approved
labels, timestamp, score/margin/entropy, ordering and seed. It is deleted with the image/dataset.
Decisions otherwise remain ephemeral. This short storage transaction is atomic, not cancellable;
page closure leaves either the whole transaction or nothing, never a partial batch. Committing does
not retrain, automatically compare runs or assert improvement. New dataset versions require a new
source; controlled round records and equally budgeted random-selection learning remain future work.
