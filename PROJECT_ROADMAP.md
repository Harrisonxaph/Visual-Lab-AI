# Visual Labs AI — training-first roadmap

Reset: 2026-10-26 UTC, requested by the project owner. This replaces the earlier phase progression,
not its evidence. Claude develops; Codex independently reviews. This documentation change authorizes
no feature implementation, merge or deployment. Future milestones need owner approval.

## Purpose and completion

Learn how models are trained, evaluated and improved through small working experiments. Explain
features, weights, loss, optimisation and generalisation alongside the controls that demonstrate them.
The existing EfficientDet detector is pretrained: watching camera input does not teach it categories.

Phase 3 is the first genuine training success. Phase 4 is a functionally complete core learning lab:
create a dataset, train, save/reload and evaluate unseen images. Phase 5 adds the complete human
feedback loop. Stretch targets are optional and do not delay core completion.

## What exists at the reset

Inspected main: `6dca0108cf40523fc49afc0aa5e786d07703b4e7` (PR #16 merge).
[Merge CI 40367378678](https://github.com/Harrisonxaph/Visual-Lab-AI/actions/runs/40367378678)
succeeded on attempt 2. TypeScript/Vite, EfficientDet-Lite0/MediaPipe CPU-WASM worker, responsive
camera UI, privacy controls and automated tests exist. Legacy Phase 2 tracking, charts, explorer,
metadata-only failure notes and synthetic benchmarks are implemented; physical acceptance is partial.
There is no image dataset manager, classifier training pipeline or learned-model persistence.

Historical documents named PHASE_2 refer to tracking, not the new Dataset Laboratory. Preserve their
paths and evidence. Old camera acceptance worksheets are historical references, not a standing task.
See [architecture](ARCHITECTURE.md) and [testing/workflow](docs/DEVELOPMENT_WORKFLOW.md).

## Old and new progression

| Phase | Previous emphasis                       | New emphasis                                        |
| ----- | --------------------------------------- | --------------------------------------------------- |
| 1     | Live object detection                   | Preserve the implemented vision foundation          |
| 2     | Tracking and decision inspection        | Upload-based labelled datasets and safe splits      |
| 3     | Active learning and detector comparison | First genuine classifier training                   |
| 4     | Games, counting and PWA                 | Learning/evaluation experiments and core completion |
| 5     | Optional advanced vision                | Human-approved active learning                      |

Existing tracking stays available; future tracking work, games, PWA and advanced vision are optional.

## Phase 1 — Existing computer vision foundation

**Implemented, with documented validation limitations. Difficulty: maintenance only.**
Keep camera, worker inference, model integration, UI, tests, tracking and inspection. Explain that
inference applies existing weights; it does not train. Existing tracking is retained functionality,
while further tracking development is optional.

Completion: the existing app remains runnable; automated regressions protect it; limitations remain
visible. Phase 1 closeout was accepted on 2026-10-25. The reset does not declare legacy Phase 2
physically accepted or resolve its incident. Do not restart camera validation for unrelated changes.

## Phase 2 — Dataset Laboratory

**Next proposed development milestone. Difficulty: moderate. Not implemented.**
Upload images from phone/tablet file pickers without a camera. Assign/correct labels and organise
categories. Show class counts, split counts, missing labels and duplicate warnings. Store explicitly
imported examples locally, with provenance, deletion and clear storage-failure handling.

Create reproducible train/validation/test splits. Exact duplicates and user-linked related examples
must remain in one split. Use file hashes plus decoded-content checks; offer bounded near-duplicate
warnings with review rather than claiming perfect detection. Flag conflicting labels. Split before
augmentation; derived images inherit their source group. Version the dataset and freeze a test split.
Tiny generated or appropriately licensed fixtures may be bundled for tests; never bundle personal data.

Completion in beginner terms: I can import two or more categories, correct a mistake, see how many
examples each contains, and create three non-overlapping groups: examples to learn from, examples
to tune settings with, and examples reserved for final evaluation. Deleting a dataset removes its
local images and annotations. Unknown related images and imperfect similarity detection are disclosed.

First PR should implement this bounded upload/label/split/statistics workflow, not training, camera
capture, a dataset marketplace or elaborate import/export infrastructure. Claude first presents a
short scope, limits and tests for owner approval. Essential manual check, if needed: one short
phone/tablet upload-and-label session, preferably with in-app Pass / Fail / Skip controls.

## Phase 3 — First genuine AI training system

**Highest educational priority. Difficulty: moderate–high. Not implemented.**
Use selected training examples and a versioned feature extractor to train a small classifier.
Recommend frozen image embeddings plus a trainable linear softmax head; compare options and prove
worker/runtime/CSP compatibility before adopting a library or model. See architecture for trade-offs.
Only classifier weights/biases learn initially; EfficientDet and the feature extractor stay frozen.

Show loss (a penalty for wrong predictions), training/validation accuracy, epochs (passes through the
training set), learning rate (update size), progress and cancellation. Capture initial/final predictions
on the same inputs, parameter checksums and numerical weight changes. Nonzero updates alone are not
proof of better generalisation. Training must never consume validation/test labels for gradients.

Save/reload compatible model weights plus label order, preprocessing, extractor identity and version,
input/output dimensions, configuration and dataset version. Reject incompatible/corrupt artifacts.
No paid API, remote training service or mandatory phone stress session. Real extractor integration
and training correctness must be automated, separately from deterministic synthetic tests.

Completion: I can train, watch loss and validation results, change epochs/rate, demonstrate that
parameters changed, save/reload and recover equivalent predictions within a documented tolerance.
Report honest results even if a chosen dataset does not improve. A tiny separable automated fixture
must show learned behaviour against an untrained baseline, not only changed scores.

## Phase 4 — AI learning and evaluation laboratory

**Core functional completion milestone. Difficulty: moderate. Not implemented.**
Explain accuracy, per-class precision/recall and confusion matrices with counts and denominators.
Plot training/validation loss to explore overfitting (memorising training examples) and underfitting
(failing to learn useful patterns). Compare dataset size, epochs and learning rates using fixed splits,
recorded seeds, extractor/model versions and comparable inputs. Optional simple classifier baselines
can illustrate different learning methods without expanding into a framework collection.

Keep the held-out test set out of tuning. Validation selects configurations; final test use is explicit
and recorded. Repeatedly consulting test results makes that set development evidence; disclose this
and require a new untouched holdout for later independent improvement claims. Show uncertainty and
sample counts for small datasets, not guaranteed accuracy or cross-device bitwise determinism.

Completion: I can reproduce an experiment, explain its confusion matrix, compare training/validation
behaviour and evaluate previously unseen test images without mixing them into training.

## Phase 5 — Active learning

**Feedback-loop completion milestone. Difficulty: moderate–high. Not implemented.**
Predict labels on a separate unlabelled pool; rank uncertain examples for human review. Predictions
are suggestions, never approved labels. Add only approved examples to the training pool, check
related-image leakage, retrain and compare with the same baseline and an untouched evaluation set.
Record provenance, selection strategy, labels, dataset/model versions and configuration.

Completion: I can review suggestions, accept/reject/correct them, retrain and see a valid before/after
evaluation. No improvement is a valid outcome. Higher confidence alone is not an improvement claim;
a test image cannot enter the feedback training pool while remaining held-out evaluation evidence.

## Five distinct learning capabilities

| Capability                        | What changes                                                          | Position                                       |
| --------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------- |
| Pretrained inference              | No weights; apply the existing model                                  | Implemented detector                           |
| Classifier on pretrained features | New classifier weights; extractor frozen                              | Phase 3 recommendation                         |
| Neural-network fine-tuning        | Some pretrained network layers updated                                | Later experiment; not implied by head training |
| Small network from scratch        | Randomly initialised weights learned without pretrained features      | Optional extension                             |
| Object-detector fine-tuning       | Detection network updated using boxes/classes and a suitable pipeline | Optional, separate from classification         |

## Future stretch targets — not core requirements

- Full custom-class detector fine-tuning with annotated boxes and appropriate evaluation.
- Small neural networks from scratch; additional learning algorithms and comparisons.
- Advanced tracking/re-identification, decision inspection, real labelled sequences and replay.
- Pose, gestures, optional scene descriptions and movement summaries with model/uncertainty attribution.
- Adaptive inference resolution/cadence, workers and performance presets; no routine owner thermal tests.
- Advanced dataset integrity, imbalance, coverage, consent and near-duplicate tooling.
- Privacy-safe experiment sharing: explicit raw-image inclusion, metadata minimisation and deletion.
- Named/versioned experiment reruns and structured reports beyond the minimal Phase 4 records.
- Scavenger hunts, zones, directional counts, dwell time, learning challenges and quizzes.
- PWA installation/offline caching and advanced interactive experiences.

## Preserved issues and proportionate delivery

D12–D14 missing boxes remains unexplained. D16/D17 shows visible boxes on a user-attributed iPhone,
with browser/container unconfirmed. No physical iPad legacy Phase 2 pass is established. Historical
S1/S2, diagnostic limits, actual Safari storage refusal and network/header/HTML inspection limits
remain as recorded; CSP permits same-origin connections and does not establish absence of uploads.
See [limitations](MODEL_LIMITATIONS.md) and the unchanged ledgers. Deferring camera checks under the
new scope is not a pass, a resolution or acceptance of a new risk. Independent upload/training work
need not wait for unrelated legacy camera acceptance. Revisit a defect when its affected path changes
or it materially prevents the approved milestone, using logs/reproduction before more manual work.

Use scoped branches/PRs, not one giant implementation. Claude runs proportionate automation; Codex
reviews material correctness/privacy/leakage and clearly labels optional suggestions. The owner
approves merges/deployments. No fixed requirement for multiple documentation-only review rounds.
