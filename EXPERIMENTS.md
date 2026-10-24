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
