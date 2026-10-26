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
