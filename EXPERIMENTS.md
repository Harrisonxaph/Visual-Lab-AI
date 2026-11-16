# Experiment evidence

## Phase 1 compatibility record — VL-P1-20261023-CPU

This is a compatibility smoke test, not an accuracy benchmark or model-comparison experiment.
Date: 2026-10-23 UTC. Model: EfficientDet-Lite0 float32 / v1, MediaPipe Tasks Vision 0.10.32,
explicit CPU delegate, VIDEO mode, output floor 0.05, result cap 50. Model input is 320×320 internally;
MediaPipe handles preprocessing and returns boxes in submitted-image pixels.

Model SHA-256: `40338edf5ec70d43e318b0a716a84d4564cd1802759a7a07170c7e43796dbf58`.
Fixed input: `tests/fixtures/cat-and-dog.jpg`, 640×416, Google MediaPipe example.
Input SHA-256: `cfa90c34bb93021165e48bd22cfc20dbbb0440ff638a54878939bf30d362e824`.
No user footage or training dataset was used. No ground-truth bounding-box dataset is present.
Hardware: cloud VM, 3 exposed x86_64 CPUs, AMD EPYC 9V74; Linux 6.18.55.
Node 24.19.0; Chromium 154.0.8037.57, headless. Hardware load and frequency are uncontrolled.

Actual isolated-worker output:

| Label | Score | Pixel box (x, y, width, height) |
| --- | --- | --- |
| cat | 0.7803767 | 72, 162, 252, 191 |
| dog | 0.7627290 | 303, 27, 249, 345 |

First recorded detection call: 294.6 ms; another verification run: 222.1 ms. These are single calls,
not warmed statistical benchmarks. Differences do not establish performance improvements.
Score is not accuracy. No mAP, precision, recall, tracking quality or improvement claim is made.

Additional evidence: complete app control flow used a synthetic camera stream containing this
fixed image, actual worker/model inference and a nonempty rendered overlay. Changing threshold to
1 cleared results; Stop removed the stream. Only same-origin GET requests were observed.
The built application passed this test with `--disable-gpu`. Neither test uses a physical camera.

Reproduce: `npm ci && npm run assets`, install Chromium through Playwright, then run
`npm run test:browser` and `npm run build && npm run test:production`. Runtime tests print
actual outputs/configuration; latency is expected to vary. CI is configured but a remote CI run
must be inspected independently before claiming it passed.

## Reviewer-supplied Lite2 compatibility evidence

Source: the user-provided Phase 1 review, received 2026-10-23, for the existing worker path.
The reviewer ran **EfficientDet-Lite2 float32 / v1** (approximately **23.1 MB as reported**)
against the same cat-and-dog test image with no worker code changes. It returned both cat and dog.
The review reports Chromium **153** for its run and CI, separately from the local Chromium 154
record above. The reported cold detection-call times were:

| Model | Single cold call (reviewer-reported) |
| --- | --- |
| EfficientDet-Lite0 float32 / v1 | 316 ms |
| EfficientDet-Lite2 float32 / v1 | 760 ms |

This establishes **compatibility evidence for the existing CPU/WASM worker**, not a speed or
accuracy benchmark. There was no warmup, repeated-sample distribution or labelled accuracy
measurement. Full browser patch version, exact hardware/load and the reviewer-run Lite2 checksum were not supplied;
these timings are attributed to the review and were not independently reproduced in this session.
No inference speed ratio or accuracy improvement is claimed. Lite0 remains the default asset;
Lite2 is not downloaded by the app. Controlled side-by-side comparison remains Phase 3 work.
Model source: https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite2/float32/1/efficientdet_lite2.tflite

## Independently verified Lite2 artifact — 2026-10-24

Downloaded the versioned Google MediaPipe artifact URL below into temporary validation storage;
no Lite2 asset was added to the application or production build, and inference was not run in
this checksum check.

- Artifact: EfficientDet-Lite2 float32 / version 1.
- URL: https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite2/float32/1/efficientdet_lite2.tflite
- Size: **23,096,891 bytes** (23.096891 MB; approximately 22.0269 MiB).
- SHA-256: `ad2abbf2b4e10585e15176fd7b5ef03c28dda959ae26fc142549fdd1814db91d`.
- File identifier: `TFL3` at bytes 4–7.
- Method: HTTPS download from the versioned source; Python hashlib.sha256 over the complete file.

This independently identifies the artifact retrieved on this date. The reviewer did not supply
its run's checksum, so this does not retroactively prove byte identity with the artifact used for
the reported 760 ms cold call. Timing evidence remains attributed to that review; no benchmark,
accuracy result or additional platform compatibility claim is established by checksum verification.

## Review-fix configuration checks

The worker client now receives a typed detector configuration, including model/asset paths,
metadata, score floor and result cap. The worker no longer imports a default model constant.
A real-worker regression uses the pinned Lite0 image at floors 0.05 and 0.9: the former returns
cat and dog; the latter returns an empty result. This validates configuration propagation; it is
not a model comparison. UI tests replace metadata with a test configuration to check that stage,
version, runtime, coverage, size and output-limit text all follow the supplied configuration.

## Future experiment records

Record experiment ID/date, model/runtime/WASM versions and hashes, input provenance/consent,
threshold, inference settings, dataset/split version, browser/OS/hardware, warmup, sample count,
latency distribution and completed-frame FPS. Separate asset loading from inference timing.
Retain errors and unsupported combinations. Comparisons require identical inputs and conditions.
Accuracy needs labelled held-out ground truth and an appropriate metric; classifier training
must never be represented as detector fine-tuning.

## Phase 2 numeric association evaluation (2026-10-26 UTC)

PR #11 merged as `efdb1d98825d4960e91882156f08b3f1067abe91`, from final PR head
`c4f7312ebd015b3fb6f76befaf874d6662cc15c3`. Merge CI
[40311618092](https://github.com/Harrisonxaph/Visual-Lab-AI/actions/runs/40311618092) succeeded.
Approved design baseline: `559bd64`.
Built-in fixture version 1 uses numeric boxes/labels/scores with separate annotated truth; detector
inference is **not run**. These are developer fixtures, not held-out detector evaluation.
Configuration: model floor .05, tracking floor .25; display threshold does not affect matching.
Each fixture has 40 frames at 100 ms intervals. Initial confirmation misses are included.

| Fixture | Visible truth observations | Misses | Fixture ID changes | Fragments | Same-ID recovery |
| --- | --- | --- | --- | --- | --- |
| Single motion | 40 | 1 | 0 | 0 | Not measured (no eligible occlusion) |
| Crossing | 80 | 2 | 0 | 0 | Not measured |
| Stationary/class flip | 40 | 1 | 0 | 0 | Not measured |
| Short occlusion | 35 | 1 | 0 | 0 | 1 / 1 |
| Long expiry | 20 | 2 | 1 | 1 | 0 / 1 |
| Empty/invalid | 0 | 0 | 0 | 0 | Not measured |

Long-expiry failure is preserved: the configured retention policy expires identity and a later
candidate confirms with a new ID. This crossing fixture's zero changes does not prove real-scene
identity stability. Metrics are fixture-defined, not standard MOT scores or detector accuracy.
Reports include actual config, source/version, processing versus elapsed time, browser-reported
environment and build ID (Unknown unless supplied). UI reports are local and transient; no saved
experiment/dataset system is implemented in Phase 2.

Profiling the 100-live/50-result path, including returned snapshot and an explicit extra copy,
found generic clone overhead. Typed defensive copies, once-per-track prediction and fewer UI
copies reduced it. Final shared-Linux Chromium runs varied: update p95 4.7–8.5 ms, extra copy
p95 .6–1.9 ms, combined p95 5.5–9.8 ms; no observed long tasks in those measured intervals.
The 8 ms update budget is not consistently met. See the full conditions and initial/final table
in [Phase 2 implementation notes](docs/phases/PHASE_2_IMPLEMENTATION.md). These are not mobile,
battery, thermal or end-to-end camera measurements; real-device profiling remains Pending.

## On-device stress-profile capability (2026-10-26 UTC)

The [follow-up engine and device procedure](docs/phases/PHASE_2_STRESS_PROFILE.md) moves 100-live ×
50-result timing into the application. App and browser test now use the same fixture v1 engine:
184 warmups, 50 measured updates, 50 active/50 lost, 10,150 retained samples including gaps.
No camera or detector is used. It records median p50, nearest-rank p95 and max separately for
update with returned copy, extra snapshot and combined cost. Metadata/config and long-task
support/drops accompany the numbers. Older developer-driver results above remain historical.
One local Chromium run measured update p95 8.20 ms and extra-copy p95 1.80 ms; the investigation
flag correctly reported the 8 ms budget exceeded. This is not evidence from iPhone or iPad.
All physical-device timing results remain Pending, and no preview deployment is authorized here.

Independent review profiling, supplied by the user: Chromium 153, 4 cores as reported, update
p95 6.5 ms, extra snapshot-copy p95 1.0 ms and combined approximately 7 ms. Raw samples, hardware
model and full test conditions were not supplied. This is another shared-desktop observation,
not a controlled comparison or mobile evidence. It does not resolve the inconsistent 8 ms budget.

## Local saved-run report format (Phase 4)

Use **Download run report (.json)** beside a saved Training lab model. Reports contain settings,
ordered run references when available, encoder/preprocessing key, dataset/version and epoch
history. Accuracy is a fraction in [0, 1]; loss is mean cross-entropy. Epoch 0 is the untrained
starting point. Null validation metrics mean not measured, not zero. Planned epochs and completed
epochs are separate, including cancelled runs. No evaluation is rerun during export.

Schema: `visual-labs.run-report/v1`. Class names are opt-in; local IDs and file fingerprints
remain included and linkable. No photos, embeddings or model weights are exported. This is a
report rather than a backup, and cannot be imported. Retain the original dataset snapshot to
repeat settings in the app; results across different runtimes/hardware need not match bitwise.
Legacy manifests may be absent, explicitly marked unavailable. Test photos stay sealed.

## Comparing training-set sizes

Train and save two complete runs on the same dataset snapshot, changing only the per-label photo
cap. Keep learning rate, seed, batch size and epochs fixed. Select **Training set size** in the
saved-run comparison. The smaller manifest must match the deterministic seeded subset of the
larger run. Validation references remain identical. Arbitrary subsets, changed snapshots, stopped
runs and changed training settings are refused. Normal same-data comparisons remain available.

Read the stored validation loss/accuracy rather than comparing training loss on different photos.
The table shows actual photo counts, planned/completed epochs and SGD batch updates. Equal epochs
are not equal compute; the number and size of batches can differ. Repeat experiments across seeds
before generalising, and retain an untouched final test set for the final choice. This feature
neither reruns evaluation nor opens test photos.

## Final held-out test protocol

Use validation to choose settings and a saved completed model first. In **Final held-out test**,
select that model and confirm the lock. Preflight reads metadata only; exact/near-copy overlap is
refused and each selected label needs test examples. A durable lock is committed before encoding
any tests. Cancellation/encoding/storage failure shows no partial score; retry preserves that same
model and unchanged snapshot. Complete results are saved once before displaying loss, accuracy,
precision/recall and the confusion matrix. No weights learn during this check.

The result is historical and cannot be overwritten. Do not use it to select later settings and
then claim the same test set is untouched: obtain fresh held-out examples. Clearing local storage
or creating another dataset does not undo having seen test outcomes. Labels, settings, fingerprints
and metrics remain on-device until the dataset is deleted; no test embeddings are cached. Training,
validation, lessons and saved-run comparisons still do not access test pixels. Existing run-report
JSON contains training/validation history only; final reports are currently viewed in the app.

## Fixed 1-nearest-neighbour validation baseline

Train/save a classifier, then choose **Compare with 1-nearest neighbour** beside it. The original
snapshot, class order, capped training subset, encoder key and provenance must still match. Both
methods receive the same current validation embeddings and ground truth, after the existing
independence exclusions. The classifier is frozen. 1-NN uses squared L2 distance and first-in-
recorded-order exact ties; validation truth is never used to choose a neighbour.

Read each method's accuracy counts, precision/recall and confusion matrix. Do not treat neighbour
distance as confidence or compare a fabricated probability loss for its hard labels. The baseline
does not update weights; the saved classifier learned weights in its earlier training run. Missing
train/validation features may be cached; test images and final locks are never used or altered.

Results are intentionally page-memory only. Repeat with the same snapshot/model/cap/order to check
determinism. Recomputed embeddings can differ across runtimes; small validation sets and repeated
tuning do not prove superiority. If final-test outcomes already guided choices, use fresh held-out
images before making a new final claim. Model-run JSON exports still contain only saved classifier
training/validation history, not this ephemeral comparison.

## L2 weight-penalty experiments

Keep dataset/version, encoder, cap, seed, learning rate and epochs fixed; vary only **L2 strength**
(0 disables, 0–1 accepted). Train/save each run and use the same-data comparison. The learner
optimises mean training CE + lambda/2 sum(W²); it does not penalise biases or change the frozen
encoder. Curves and validation/final losses show prediction CE. The separately reported training
objective includes the penalty and should not be ranked across different strengths as if it were
the same measurement. Report better/unchanged/worse validation results honestly.

Missing strength is legacy zero. Positive runs use `softmax-sgd-f64-l2/v1`; zero retains the
original tag/behaviour. Reports optionally add `settings.l2` and per-epoch `trainObjective` without
changing existing loss definitions. Exact restore copies strength; old runs restore 0. Size
experiments require strength to stay fixed. Neighbour comparison uses the actual saved weights;
the final test evaluates prediction quality without adding the training penalty. No final locks
are reset and no test data enter optimisation. Further tuning after viewing final scores requires
fresh held-out images before a new independent final claim.


## Comparing linear and nonlinear capacity

In Training lab → Learning patterns, choose **Compare linear model and tiny neural network**.
No dataset or camera is needed. Both train on the same generated matching-signs task using
48 training / 80 validation examples, seed 42, batch size 16, learning rate 0.5, 100 epochs and no
L2 penalty. The fixed 2 → 8 tanh → 2 network starts from random weights, and both layers change.
Compare measured prediction CE and accuracy curves; the app also reports per-layer weight changes.
The linear model's straight boundary cannot capture all four groups. This task deliberately
favours nonlinear capacity; it does not show which method is best for personal photos.

Repeat runs are seeded. Initialisation scales differ between methods and equal epochs are not an
equal-compute comparison. Cancel or leave to discard incomplete comparisons. Results are temporary:
there are no model writes, uploads, image reads or final-test checks. Photo-embedding comparisons
and saved neural networks remain deferred. No improvement claim generalises beyond this task.
