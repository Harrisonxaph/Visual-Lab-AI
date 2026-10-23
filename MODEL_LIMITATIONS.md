# Model limitations

No model has yet been validated in this application. EfficientDet-Lite0 with MediaPipe Tasks Vision
CPU/WASM is proposed; downloaded model availability does not prove runtime compatibility.

Confidence is a model score, not measured accuracy or a calibrated probability of correctness.
Scores vary with lighting, scale, occlusion, blur and domain shift. COCO coverage is limited to its
supported categories; do not describe unsupported objects as detectable. Verify label mapping from
the selected artifact rather than assuming contiguous IDs or presenting background as a category.

Postprocessing can omit results; the UI cannot recover alternatives or discarded predictions that
are not returned. No tracking, identity recognition, training, accuracy benchmark or learning from
corrections exists in Phase 1. Device performance and browser support require measured evidence.
