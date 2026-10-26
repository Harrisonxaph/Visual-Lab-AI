# Visual Labs AI roadmap

**Purpose:** learn how AI models are actually trained, evaluated and improved, through working
experiments you can run on an iPhone, iPad or desktop browser. Success means building, training and
evaluating a genuine machine-learning model, not just operating a pretrained detector.

This roadmap replaced the earlier tracking/PWA/advanced-modes plan on 2026-10-26 (roadmap reset).
The earlier plan, its phase documents and validation ledgers remain in `docs/` as history.

## Five kinds of "AI" this project distinguishes

The app must always say which of these is happening. They are easy to confuse, and confusing them
leads to false claims.

| # | What happens | What changes | Where in this roadmap |
| --- | --- | --- | --- |
| 1 | **Inference with a pretrained model.** A model someone else trained makes predictions. | Nothing. The model's weights are fixed. | Phase 1 (EfficientDet-Lite0 detector, already built) |
| 2 | **Training a new classifier on pretrained features** ("transfer learning", "linear probe"). A frozen network turns each image into a list of numbers (an *embedding*); we train a small new model on those numbers. | Only the new small model's weights. The big network stays frozen. | Phase 3 (first genuine training) |
| 3 | **Fine-tuning an existing neural network.** Some of the pretrained network's own layers are unfrozen and updated with our data. | The pretrained network's weights (some layers). | Stretch target |
| 4 | **Training a small neural network from scratch.** All weights start random and are learned from our data. | Every weight, starting from random. | Phase 4 comparison (small network on embeddings); a raw-pixel network is a stretch target |
| 5 | **Fine-tuning an object detector.** Teaching EfficientDet new categories or better boxes. | Detector weights; needs box-labelled data and a heavier training pipeline. | Stretch target |

The Phase 1 detector does **not** learn from camera input. Training a classifier (type 2) is never
described as retraining or fine-tuning EfficientDet (type 5).

## Phase summary

| Phase | Name | Status | Difficulty |
| --- | --- | --- | --- |
| 1 | Computer vision foundation | Implemented (with documented limitations) | Done |
| 2 | Dataset laboratory | Next | Medium (3/5) |
| 3 | First genuine AI training system | Planned (**highest educational priority**) | Medium–high (3.5/5) |
| 4 | Learning and evaluation laboratory | Planned | Medium (3/5) |
| 5 | Active learning | Planned | Medium (3/5) |

- **Minimum meaningful result:** end of Phase 3. You will have trained a real model and seen its
  weights and loss change.
- **Core project complete:** end of Phase 5. Train, evaluate, improve with human feedback, and
  prove the improvement on held-out data.
- Stretch targets are optional and not required to call the project complete.

## Phase 1 — Computer vision foundation

**Status: implemented.** Live camera detection with EfficientDet-Lite0 (MediaPipe, CPU/WASM in a
worker), labelled boxes, confidence threshold, privacy safeguards (local-only frames, CSP, opt-in
diagnostics), tracking with confirmed IDs, inspector, confidence history, local failure notes,
synthetic tracking benchmark and stress profile. 79 unit, 51 development-browser and 14
production tests exist.

What it teaches: what inference is, what a confidence score is (and why it is not accuracy).

Earlier phase numbering: the old "Phase 1" (detection) and old "Phase 2" (tracking and decision
inspector) are both part of this foundation now.

Do not restart camera validation unless a material defect or a relevant code change justifies it.
Known issues and gaps are listed below and stay open; none is silently waived.

## Phase 2 — Dataset laboratory

Build and manage labelled image datasets. The camera becomes optional.

Scope:

- Add images from a phone or tablet photo library (file picker), optionally from the camera.
- Create categories (labels); assign, correct and remove labels.
- Training / validation / test splits, created deterministically and kept stable.
- Exact-duplicate detection (content hash) and near-duplicate detection (a small image
  fingerprint); near-duplicates are kept in the same split so they cannot leak across splits.
- Dataset statistics: images per label and per split, imbalance warnings, duplicates found.
- A generated example dataset (simple shapes drawn in code) for automated tests and quick demos.
- Local-only storage in the browser (IndexedDB); nothing uploaded. Clear-all deletion.
- In-app acceptance checklist (see testing approach) for the one manual check this phase needs.

Done when, in plain terms:

1. You can create a dataset of your own photos with at least two labels on your phone.
2. The app shows how many images each label has in training, validation and test.
3. Adding the same photo twice is detected; near-identical photos never end up in different splits.
4. The example dataset loads in one tap, and automated tests prove splits are stable and leak-free.

## Phase 3 — First genuine AI training system (highest priority)

Train a real model in the browser and show exactly what changed.

Approach (proposed, see Architecture): a **frozen** pretrained image embedder turns each image into
1,024 numbers; a **small trainable classifier** (softmax regression, optionally one hidden layer)
learns to map those numbers to your labels. The classifier is written in plain TypeScript so every
weight, gradient and update can be shown and tested. This is type 2 above, honestly labelled.

Scope:

- Choose which labels/examples to train on.
- Adjustable learning rate and number of epochs; fixed random seed for reproducibility.
- Live training progress: loss per epoch (training and validation), training and validation accuracy.
- "What learns / what stays frozen" panel: weight count, a view of weights changing, embedder frozen.
- Before-and-after predictions on the same validation images.
- Save and reload a trained model locally, with a compatibility check (same embedder, same labels).
- Evidence that training changed the model: untrained accuracy ≈ chance; weights differ from start.

Done when, in plain terms:

1. You train a model on your own dataset and watch the loss go down.
2. Validation accuracy is shown separately from training accuracy.
3. The same validation images are predicted before and after training, side by side.
4. Reloading the page and reloading the saved model gives the same predictions.
5. Automated tests prove the maths is correct (gradient check), training reduces loss on the
   example dataset, and results are reproducible with the same seed.

## Phase 4 — Learning and evaluation laboratory

Explore what "good" means for a model.

Scope:

- Accuracy, precision, recall per label; confusion matrix.
- Training vs validation loss curves; overfitting and underfitting demonstrations.
- Experiments: vary dataset size, learning rate, epochs, regularisation; compare results.
- Compare learning methods: softmax regression vs a small neural network trained from random
  weights on the same embeddings (type 4); nearest-neighbour baseline.
- Final evaluation on the held-out test split only after choices are made (no peeking).
- Reproducible experiment records: dataset version, split seed, settings, results; local list and
  JSON export.

Done when, in plain terms:

1. You can explain from the app's own charts why a model is overfitting.
2. You can run two settings on the same data and see which generalises better on unseen images.
3. Every reported result can be re-run with the same settings and dataset version.

## Phase 5 — Active learning

Improve a model with human feedback and prove the improvement.

1. Run the trained model on unlabelled images.
2. Rank images by uncertainty (e.g. lowest top-score margin or highest entropy).
3. Ask you to review a small batch: approve, correct or skip.
4. Add approved examples to the training split (never to test).
5. Retrain.
6. Compare held-out test results before and after, against a random-selection baseline.

Done when, in plain terms:

1. One loop of review → retrain → re-evaluate works end to end.
2. The app shows test-set results before and after, not confidence scores.
3. An automated experiment on the example dataset shows whether uncertainty-picked examples beat
   randomly picked ones, reporting whichever result actually occurs.

## Stretch targets (optional, deprioritised)

- Fine-tuning a pretrained network's layers (type 3), likely with TensorFlow.js.
- Custom neural network trained from scratch on raw pixels (type 4, small CNN).
- Object-detector fine-tuning (type 5); likely needs an offline Python pipeline such as MediaPipe
  Model Maker and box labels. Difficulty 5/5.
- Additional learning algorithms and comparison experiments.
- Object tracking and decision-inspection extensions (foundation already has the basics).
- Gesture and pose recognition.
- Performance optimisation (adaptive inference, workers, presets).
- Advanced dataset management (import/export, versioned datasets, annotation tools).
- Interactive learning challenges and quizzes.

## Known issues and validation gaps (carried forward)

These remain open. They do not block the new phases, which do not depend on live tracking.

- **Missing boxes on iPhone (ledger D12–D14):** a single report of boxes disappearing while
  inference ran. Not reproduced in automated tests; cause unknown. If it recurs during normal use,
  check the "Visible detections" number and the text under "Detected objects" (see
  `docs/reviews/PHASE_2_M1_MISSING_BOXES.md`). Not waived.
- **Legacy tracking device acceptance incomplete:** partial iPhone evidence recorded; the iPhone M2
  session results were never recorded in the repository and no iPad session was run. Not passed.
  No dedicated re-run is planned; tracking is no longer on the critical path.
- **Overlay can fail silently** if the 2D canvas context is unavailable (`src/overlay.ts`).
  Optional hardening.
- **Phase 1 accepted limitations** (`docs/phases/PHASE_1_CLOSEOUT.md`): physical loading/permission
  interruption coverage, external interruption untested, real Safari storage refusal untested,
  deployed headers/HTML/network not inspected, diagnostics coverage limits, early S1/S2 reports
  unexplained.
- **Diagnostics in production:** decide before the first production deployment.
- **Performance:** the tracker stress profile's 8 ms p95 budget is not consistently met on shared
  desktop Chromium; one iPhone run was within it. Not on the critical path.
- **Automated WebKit unavailable** in the development container (missing host libraries).
- **Production** still serves the original README-only commit; temporary previews are protected.

## Delivery rules

See [docs/WORKFLOW.md](docs/WORKFLOW.md). In short: Claude develops on a branch and runs automated
checks; Codex reviews the PR; the project owner approves merges and deployments. One focused
manual acceptance session per new feature at most, guided inside the app.
