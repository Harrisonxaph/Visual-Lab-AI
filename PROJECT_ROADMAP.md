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
| 2 | Dataset laboratory | Implemented and merged (documented device limits) | Medium (3/5) |
| 3 | First genuine AI training system | Implemented and merged (**first genuine training**) | Medium–high (3.5/5) |
| 4 | Learning and evaluation laboratory | Closed by owner 2026-11-16 (documented limits) | Medium (3/5) |
| 5 | Active learning | Closed by owner 2026-11-16 (documented limits) | Medium (3/5) |

- **Minimum meaningful result:** end of Phase 3. You will have trained a real model and seen its
  weights and loss change.
- **Core project complete:** Phase 5 closed by owner 2026-11-16. Train, evaluate, use human feedback, and
  measure its effects honestly, reserving a fresh final test after selection.
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

Status: implemented in the Dataset lab tab (`src/datasets/`, `src/ui/dataset-lab.ts`). The only
remaining check needs a real iPhone/iPad (photo-library import including HEIC, Take Photo,
reload); it is listed in the in-app acceptance checklist and is not yet done.

Scope:

- Add images from a phone or tablet photo library (file picker), optionally from the camera.
- Create categories (labels); assign, correct and remove labels.
- Training / validation / test splits, created deterministically and kept stable.
- Exact-duplicate detection (content hash) and likely near-duplicate detection (a small image
  fingerprint). Images the app identifies as related are placed in one group, and a group is never
  split across training, validation and test. Fingerprints miss some similar images (different
  crops, angles or edits), so the app says that undetected similarity can still leak between splits.
- Dataset statistics: images per label and per split, imbalance warnings, duplicates found.
- A generated example dataset (simple shapes drawn in code) for automated tests and quick demos.
- Local-only storage in the browser (IndexedDB); nothing uploaded. Clear-all deletion.
- In-app acceptance checklist (see testing approach) for the one manual check this phase needs.

Done when, in plain terms:

1. You can create a dataset of your own photos with at least two labels on your phone.
2. The app shows how many images each label has in training, validation and test.
3. Adding the same photo twice is detected. Photos the app identifies as related stay in the same
   split, and the app explains that it cannot catch every similar photo.
4. The example dataset loads in one tap. Automated tests prove splits are stable and that
   identified duplicate groups never cross splits.

## Phase 3 — First genuine AI training system (highest priority)

Train a real model in the browser and show exactly what changed.

Approach (implemented, see Architecture "Training lab"): a **frozen** pretrained image embedder
turns each image into 1,024 numbers; a **small trainable classifier** (softmax regression; the
optional hidden layer is deferred to Phase 4) learns to map those numbers to your labels. The
classifier is written in plain TypeScript so every weight, gradient and update can be shown and
tested. This is type 2 above, honestly labelled.

Scope:

- Choose which labels/examples to train on.
- Adjustable learning rate and number of epochs; fixed random seed for reproducibility.
- Live training progress: loss per epoch (training and validation), training and validation accuracy.
- "What learns / what stays frozen" panel: weight count, a view of weights changing, embedder frozen.
- Before-and-after predictions on the same validation images.
- Save and reload a trained model locally, with a compatibility check (same embedder, same labels).
- Evidence that training changed the model: weights differ from their starting values, and
  training and validation loss and accuracy are shown before and after.

Learning is **demonstrated** on a controlled fixture: the generated example dataset, where the
expected outcome is known. On your own photos the app **reports** what happened, whatever it is.
Your model may start above or below chance, the loss may stall, and validation accuracy may not
improve (too few images, labels that look alike, or a frozen embedder that cannot separate them).
The app shows that honestly instead of treating it as a failure of the training code.

Done when, in plain terms:

1. On the example dataset, training loss falls and validation accuracy rises well above chance,
   both in the app and in automated tests.
2. You can train on your own dataset and see training and validation loss and accuracy, reported
   honestly even when they do not improve.
3. The same validation images are predicted before and after training, side by side.
4. Reloading the page and reloading the saved model gives the same predictions.
5. Automated tests prove the maths is correct (gradient check) and results are reproducible with
   the same seed.

## Phase 4 — Learning and evaluation laboratory

**Closed by explicit owner approval on 2026-11-16, with documented limitations.** The slices below
record implementation history and their scope boundaries at the time; current Phase 5 authority
is recorded in its section.

Explore what "good" means for a model.

First implementation slice: validation confusion matrices and per-label precision/recall in the
existing Training lab, including saved-model checks after their independence filter. Counts and
zero-denominator "Not measured" values are explicit. This is partial Phase 4 delivery, not
completion: later slices cover recorded comparisons and controlled learning lessons; final test
evaluation remains planned. Test photos stay sealed; no new model, storage schema or deployment is introduced.

Second slice: a visible training seed, versioned ordered run manifests, guarded restoration of
saved-run settings and side-by-side recorded validation comparisons. Comparisons require the same
dataset/version, encoder, classes, split seed and exact ordered examples. Changed snapshots and
legacy records without a manifest cannot be presented as controlled comparisons. Full experiment
export, new learning methods and final held-out evaluation are still planned.

Third slice: bounded synthetic numeric lessons reuse the actual softmax optimiser to demonstrate
useful learning, memorisation of random labels (overfitting), and an insufficient linear model on
a nonlinear task (underfitting). Separate training/validation examples and measured curves explain
each result. These are deliberately different tasks, not an algorithm comparison or evidence of
real-image generalisation. No camera, encoder, dataset writes or saved models are involved. Final
test photos remain sealed. Manual acceptance is optional; numerical and browser tests cover the
lesson logic and lifecycle.

Fourth slice: explicit local JSON reports for saved runs, containing settings, recorded histories
and ordered training/validation references. Class names are omitted by default and require an
opt-in. Reports disclose that IDs and image fingerprints remain linkable. They exclude photos,
embeddings and model weights, are not backups, and cannot be imported. Reproduction still needs
the original dataset snapshot and compatible encoder/implementation. Final-test evaluation,
additional learning methods remain deferred; the next slice covers dataset-size comparisons.

Fifth slice: explicit **Training set size** mode compares completed saved runs with identical
validation examples, dataset/version, labels, encoder, split seed and optimiser settings. Only the
per-label cap changes. The smaller run must match the seeded nested subset of the larger run.
The default same-training-data comparison stays strict. This compares saved measurements without
inference or new storage. Fixed epochs can mean different batch sizes/update counts, so this is
not an equal-compute benchmark. One seed or small validation set cannot prove general improvement.
Final-test evaluation and additional learning methods remain deferred.

Sixth slice: an explicit final held-out check locks one saved, completed classifier per dataset
before computing test embeddings. Metadata must match the trained snapshot, and detected exact/
near-copy overlap is refused. One durable choice/result is stored atomically across tabs in database
v3. Cancel/failure retries may use only that same model and unchanged snapshot; completed results
cannot be overwritten. Test embeddings are never cached. Ordinary training/validation never access
test pixels through this path. Results are shown only after the complete result is saved.

This is a local workflow guard, not an access-control or scientific-independence guarantee: clearing
storage loses its history, and fresh identifiers do not make previously used test images untouched.
Further tuning needs fresh held-out data for a new final claim. Final reports can be removed by
deleting their dataset. Additional learning methods/regularisation remain deferred; this slice does
not itself declare Phase 4 or the project closed, or authorize Phase 5.

Seventh slice: compare a saved softmax classifier with a fixed 1-nearest-neighbour baseline on
the same validation images/embeddings. Both use the saved run's original capped training images,
class order, encoder key and dataset snapshot. Known training copies are excluded from validation
for both methods. The baseline updates no weights; it remembers labelled training features and
uses squared L2 distance, with deterministic first-in-recorded-order ties. It has no probability
or cross-entropy output. Metrics, not distances/confidence, measure correctness.

Missing train/validation embeddings may be computed/cached locally; tests never enter this path.
Comparison results are page-memory only and cleared on reload or the next refresh after relevant
data/model edits. Current shared embeddings are used for validation; historical training embeddings
regenerated on another runtime need not match bitwise. Neural-network method comparison remains deferred; the next slice adds regularisation. No final-test result is reused, and no Phase 5 work is included.

Eighth slice: optional L2 regularisation (strength 0–1, default 0) adds `lambda / 2 × sum(W²)`
to the classifier's mean training cross-entropy; biases are not penalised. This changes what the
classifier optimiser prefers, not the frozen image encoder or its embedding normalisation. The
curves and validation/final losses remain prediction cross-entropy; the penalised training objective
is separately reported and stored. Different penalties define different objectives, so use shared
validation prediction loss/accuracy to choose settings rather than ranking objective values.

Missing strength means legacy zero; default runs keep their original algorithm tag and numerical
trajectory. Positive L2 uses `softmax-sgd-f64-l2/v1`. Saved configurations, exact replay, comparisons,
reports, nearest-neighbour comparison and the final-check path support it. Dataset-size comparisons
hold strength fixed. No schema migration or new dependency is needed. Improvement is not promised:
strong penalties can underfit and poorly chosen steps can oscillate. Neural-network method
comparison remains deferred, and this does not authorize Phase 5 or close the project.

Ninth slice: compare softmax regression with a tiny two-layer neural network on the same existing
synthetic XOR-style task. The network has 2 inputs, 8 tanh hidden units, 2 outputs and 42 trainable
parameters; all start from seeded random values (biases zero). Both layers learn by backpropagation
and mini-batch SGD. Show measured training/validation curves, accuracy and parameter changes.
Use identical data, seed, batch size, learning rate and epochs, with distinct disclosed initialisation
schemes. Equal epochs do not mean equal compute. Results stay in page memory, with cancellation
and no camera, dataset, encoder, test-split or storage access. This teaching result does not establish
superiority on photos. Neural-network comparison on photo embeddings and compatible saved network
models remain deferred; Phase 4 remains in progress and Phase 5 is not authorized.

Tenth slice: an explicit **Compare training methods** action beside a completed saved run freshly
trains softmax and an 8-unit tanh network on exactly the same current frozen image embeddings.
Reuse the original snapshot, capped training order, class order, copy exclusions and optimiser
settings; test pixels remain sealed. Both use the same independent validation images. Show CE,
accuracy, precision/recall, confusion matrices, curves and actual network parameter changes.
Equal epochs are not equal compute; initialisation and capacity differ. The saved source model
provides configuration/provenance, not either method's new weights or result. Results remain in
page memory; compatible network saving and neural-network final-test evaluation remain deferred.
This is classifier training from random weights on frozen features, not encoder fine-tuning or
detector retraining. Phase 4 stays in progress; no Phase 5 authorization is implied.

Eleventh slice: explicitly export a completed photo-comparison network as a versioned model file
and reload it for fresh validation inference. The file contains both learned matrices/biases,
settings, history, encoder key and dataset/label/training provenance; optional label names default
off. No photos or embeddings are included. Strict 1 MiB/shape/finite-number/metadata checks precede
inference. Original encoder/dataset/labels must match; changed snapshots warn and known training
copies are excluded from current validation. Imported provenance/history is file-supplied, not
independently verified. Show current measured metrics separately. Model-file export is distinct
from existing metadata-only run reports. There is no database migration, automatic persistence or
network final-test path. Clearing app data does not remove downloaded files. Phase 4 remains open.

Twelfth slice: final testing can select either a saved softmax classifier or the neural network
from a completed in-session comparison. Imported files remain ineligible. Both methods share the
same durable one-choice-per-dataset lock, committed before test pixels are read. Neural identity
includes its method, exact parameters, history and actual training/validation references. Confirmed
network parameters are retained with the local final history until dataset deletion, allowing a
cancelled check to retry after reload without retraining. Its saved source must still exist and the
snapshot must be unchanged. No test features are cached, no parameters learn, no partial results
are published and completed scores cannot be replaced by changing method, settings or splits.
Legacy softmax identities and existing locks remain unchanged; no schema migration is needed.

The intended **functional Phase 4 scope is complete and was closed by explicit owner approval
on 2026-11-16**. See [Phase 4 closeout](docs/phases/PHASE_4_CLOSEOUT.md) for evidence and retained
limitations. The owner separately authorised Phase 5 development on the same date. No additional
stretch feature or routine device-testing round is required for that closed scope; deployment
still requires separate approval.

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
2. You can run two settings on the same data and compare them on the validation split; the test
   split is used once, for the final chosen setting.
3. Every reported result can be re-run with the same settings and dataset version.

## Phase 5 — Active learning

**Authorised by the owner on 2026-11-16, after explicit Phase 4 closeout.** First slice: score at
most 50 eligible, independent unlabelled/unsplit photos using a completed saved softmax classifier
from the exact current dataset snapshot. Exclude known protected-data copies and near-duplicate
pool groups. Display up to 10 suggestions in small-margin or seeded-random review order, with
actual confidence/margin/entropy and page-memory accept/correct/skip decisions. No test pixels,
label/split changes, annotation persistence or retraining happen in this slice. Newly computed
review features are temporary too; no review cache records are written. Random review
ordering is not an evaluated learning baseline. Import the pool before training/saving the source;
new imports after training require a refreshed source snapshot for now.

The merged promotion slice adds a consent-gated atomic training-only approval commit, with per-image source,
encoder, approved/proposed label, time, seed and review-order provenance. Existing evaluation
assignments remain fixed; skips stay unlabelled. No automatic retraining or improvement claim.

The measured-round slice trains a fresh same-data control and a fresh expanded classifier after
one approved batch, using the same current features, initial seed, settings and unchanged validation
cohort. It also re-evaluates the saved source on those features. The expanded classifier can be
saved explicitly. Comparison results remain temporary. This first round requires an uncapped source
and no dataset edits since the single approval commit. Equal epochs do not imply equal compute.

The comparison slice adds a generated-shapes oracle simulation: fixed generator seed `502026`
(distinct from the Dataset lab's `2026`), two initial examples and four validation examples per
class, then six-label-total acquisition budgets for uncertainty and seeded random
selection (no per-class acquisition quota). The selector never receives pool labels. Both heads retrain from the same seed,
features and settings on equal-sized training sets. This is a teaching experiment, not human
approval or evidence of general superiority on personal photos. Existing personal rounds still
compare their original-data control, not a paired random-selection learning arm.

Saving an expanded classifier also saves allowlisted original/approved/validation cohort references
and source/control/expanded measurements. Existing local reports include this evidence; the
generated experiment has its own numerical download. Original photos, encoder and compatible code
are still needed to reproduce; reports are not backups and cross-runtime bits need not match.

**Closed by the owner on 2026-11-16:** see [Phase 5 closeout](docs/phases/PHASE_5_CLOSEOUT.md).
The revised educational core is functionally complete with documented limitations. PR #39 merged
as `03e118e32472ded3eb13cd67165e3fbfeef32a52`; exact-head CI 43964979223 succeeded.
Unresolved reports and final-test reuse rules remain. Stretch targets and unimplemented original
master-spec features remain optional; no further development or production deployment is authorised.

Build a human-feedback learning loop and measure its effects.

1. Run the trained model on unlabelled images.
2. Rank images by uncertainty (e.g. lowest top-score margin or highest entropy).
3. Ask you to review a small batch: approve, correct or skip.
4. Add approved examples to the training split (never to validation or test).
5. Retrain.
6. Measure the change on the **validation** split, against a random-selection baseline.

**Test-set reuse rule.** If test results guide later rounds (which batch to pick, when to stop,
which settings to keep), the test set has influenced the model and no longer measures unseen
performance. So every round uses validation results only. The test split is evaluated once, after
the rounds are finished, and each test evaluation is recorded. If the test set is looked at again
after further changes, the app labels those results as no longer independent.

Done when, in plain terms:

1. One loop of review → retrain → re-evaluate (on validation) works end to end.
2. The app shows validation results before and after each round, not confidence scores, and a
   single final test-set result at the end.
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

See [docs/WORKFLOW.md](docs/WORKFLOW.md). Since the owner's 2026-11-07 update, Codex owns
development and a distinct, explicitly labelled self-review using three stages: scope, build/test,
review/fix/verify. Continue autonomously within approved milestone scope; defer optional work and
preserve the roadmap's learning objectives and completion criteria. The owner approves new scope,
merges and deployments. Ask for at most one focused manual session per milestone where practical,
only for a justified gap. Milestone implementation still requires owner scope authorisation; current approvals are recorded above.
