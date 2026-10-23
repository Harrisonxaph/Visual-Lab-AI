# Third-party assets

The Visual Labs AI application source is MIT licensed. Its MIT license does not replace
third-party terms. Dependencies are pinned in package-lock.json.

## MediaPipe Tasks Vision

Google / MediaPipe contributors, @mediapipe/tasks-vision 0.10.32, Apache-2.0 per package metadata.
Source: https://github.com/google-ai-edge/mediapipe
License text: licenses/Apache-2.0.txt.

The application bundles the vision module and serves WASM files from the installed package.
Asset preparation copies the vendor JS loaders and appends only
`globalThis.ModuleFactory = ModuleFactory;` to expose the factory in module scope.
The worker provides the vendor loader's dynamic-import and debug hooks. These adaptations
are application changes, not upstream fixes. Original WASM binaries are unchanged.
Both SIMD and non-SIMD variants are retained; the runtime selects the applicable variant.

## EfficientDet-Lite0

Publisher: Google MediaPipe. Artifact: float32, version 1, 13,836,895 bytes.
Source: https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float32/1/efficientdet_lite0.tflite
SHA-256: `40338edf5ec70d43e318b0a716a84d4564cd1802759a7a07170c7e43796dbf58`.
Model documentation: https://ai.google.dev/edge/mediapipe/solutions/vision/object_detector
Upstream EfficientDet implementation: https://github.com/google/automl/tree/master/efficientdet (Apache-2.0).
The downloaded model metadata has no standalone license notice; its provenance is recorded here
separately from the runtime's package license. Do not represent model weights as this project's MIT work.

## Test image

Google MediaPipe Object Detector example, used only as a fixed automated-test input:
https://storage.googleapis.com/mediapipe-tasks/object_detector/cat_and_dog.jpg
SHA-256: `cfa90c34bb93021165e48bd22cfc20dbbb0440ff638a54878939bf30d362e824`.
No test image is copied into the application's public directory or production build.

Builds copy these notices and the Apache-2.0 text into the public assets alongside the runtime.
