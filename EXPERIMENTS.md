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

## Future experiment records

Record experiment ID/date, model/runtime/WASM versions and hashes, input provenance/consent,
threshold, inference settings, dataset/split version, browser/OS/hardware, warmup, sample count,
latency distribution and completed-frame FPS. Separate asset loading from inference timing.
Retain errors and unsupported combinations. Comparisons require identical inputs and conditions.
Accuracy needs labelled held-out ground truth and an appropriate metric; classifier training
must never be represented as detector fine-tuning.
