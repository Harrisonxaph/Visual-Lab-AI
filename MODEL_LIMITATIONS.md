# Model and platform limitations

## What learns and what does not (roadmap reset, 2026-10-26)

- The EfficientDet-Lite0 detector is **pretrained and fixed**. It never learns from camera input,
  failure notes or user corrections. Its 80 COCO categories cannot be extended in this app.
- Phase 3 training (Training lab) updates only a **small new classifier** (one weight per
  embedding number per label, plus one bias per label) on top of a **frozen** image embedder. That
  is transfer learning (training on pretrained features), not detector retraining and not
  fine-tuning of the embedder.
- Classifier accuracy on small personal datasets can be misleading. Phase 4 adds held-out test
  evaluation, precision/recall and overfitting checks; confidence is never treated as accuracy.

## Training lab limitations (Phase 3)

- Learning is demonstrated on the generated example dataset (automated test, four runs: validation
  accuracy from near chance, between 33% and 67%, to 100% on 9 validation photos; training loss 1.10 → 0.27
  in 50 epochs). Those earlier runs used a new random seed; current runs expose a seed control. Generated shapes are
  easy; on personal photos the app reports whatever happens, including no improvement.
- Validation sets are small (15% of each label), so one photo can move accuracy by many points.
  Accuracy is never shown as a reliable measure; precision, recall and test evaluation are Phase 4.
- The model's "sure" percentage is its own confidence, not its accuracy, and is not calibrated.
- The encoder stretches every photo to 224 × 224 (no crop), which distorts very wide or tall
  photos. Everything about a photo that the frozen encoder does not capture cannot be learned.
- No regularisation, early stopping or learning-rate schedule yet (Phase 4). With length-1
  embeddings the allowed learning rates (0.01–2) cannot make the numbers overflow; the
  non-finite guard is tested directly with out-of-range values.
- Training runs on the main thread between frames; very large selections on slow phones may make
  the page briefly less responsive. The encoder file (about 4 MB) downloads on first training.
- **Device status: untested.** The encoder has run only in desktop Chromium (automated tests). It
  uses the same MediaPipe runtime and worker loader as the detector, which has run on iPhone, so
  Safari compatibility is plausible, but this encoder has not been run on a physical iPhone or in
  Safari. A device check is not required to use or review this phase.
- Saved models record which photos they learned from. When a saved model is loaded after a
  re-split or other changes, current validation photos it learned from, the same file imported
  again, or likely near-copies (difference-hash rule) are left out of its check, and the app says
  how many. Similar photos the hash cannot detect may still overlap, as in the Dataset lab.
- A dataset deleted while training runs (from another lab tab or "Delete all") cancels the run and
  discards its results; storage also refuses, in the same transaction, any model or embedding whose
  dataset or photo no longer exists.
- Saved models refer to labels by id: renaming a label keeps the model usable; deleting one makes
  it unloadable.

## Dataset lab limitations (Phase 2)

- Similarity detection is a 64-bit difference hash with a 6-bit threshold. It finds exact copies,
  re-saved and resized copies and small brightness changes. It misses crops, rotations and new
  viewpoints, and it is unreliable for very plain images: flat areas give identical bits, so
  unrelated plain images can be wrongly grouped (use "Not related"). Identified groups always stay
  in one split; undetected similar photos can still leak across splits.
- Exact-duplicate detection compares the original file bytes. The same photo exported twice with
  different encoding is not an exact duplicate (the near-duplicate check may still flag it).
- Data lives only in this browser. Safari may delete stored data for a site unused for about a
  week; clearing website data deletes it. `navigator.storage.persist()` is requested but may be
  refused. Export/import is not available yet.
- HEIC photos decode in Safari but not in desktop Chromium; automated tests use PNG/JPEG. Very large
  photos are fully decoded before downscaling, which can use a lot of memory on older devices.
- Two tabs editing the same dataset at once are not coordinated; the last write wins.

## Verified combination

EfficientDet-Lite0 float32 / v1, MediaPipe Tasks Vision 0.10.32, CPU/WASM in a module worker.
Verified on Chromium 154, Linux x86_64 using a fixed image and synthetic camera video stream,
in both development and production builds (production test disables GPU acceleration).
Physical-camera operation on the user-reported iPhone 15 Pro (iOS 27.0.1, Safari) and iPad Pro
11-inch, 3rd generation (iPadOS 26.6.2, Safari) has user-reported evidence in the device ledgers.
That is not comprehensive Safari/platform validation. macOS Safari and Android remain untested.
Do not interpret responsive viewport screenshots as device inference evidence.

Module workers, OffscreenCanvas, transferable ImageBitmap and WebAssembly are required.
SIMD is detected by MediaPipe; SIMD and non-SIMD binaries are included, but the non-SIMD
path has not been separately forced and validated. Missing capabilities fail visibly.
The tested vendor module-worker loader adaptations are documented in THIRD_PARTY_NOTICES.md.
No assumption of universal GPU acceleration is made; the selected inference delegate is CPU.

## Lite2 investigation

The user-supplied Phase 1 review reports successful EfficientDet-Lite2 float32 / v1 inference
in the same worker without code changes: both cat and dog were detected in the fixed image.
The review's single cold runs were 760 ms (Lite2) and 316 ms (Lite0), on Chromium 153 as reported.
This is compatibility evidence only, not a benchmark or evidence of comparative accuracy.
See EXPERIMENTS.md for provenance and the independently verified versioned-artifact checksum.
The review run’s hardware details and original artifact checksum were not supplied. Lite0 remains the
shipped default; no Lite2 asset, model selector or comparison lab is added to Phase 1. No Lite2
claim is made for Safari, iOS, other devices, sustained performance or accuracy.

## Detector interpretation

Confidence is an uncalibrated model score, not measured accuracy or a guaranteed probability.
Lighting, blur, scale, pose, background, occlusion and domain shift can change results or produce
false positives/negatives. This is an educational tool, not a safety-critical perception system.
The 80 named COCO categories are listed in [docs/COCO_LABELS.md](docs/COCO_LABELS.md).
The embedded label file has 90 entries including placeholder gaps; IDs are not assumed contiguous.
The detector cannot identify arbitrary objects, specific people or unsupported custom classes.

Runtime preprocessing resizes to the detector's 320×320 input. UI boxes use returned frame pixels.
The app receives postprocessed results, not raw class logits. The fixed 5% output floor and
50-result cap can omit results. The slider cannot recover omitted detections. Displayed detection scores are rounded and capped at 99% to avoid suggesting certainty;
filtering still uses unrounded scores. Only drawable, clipped results contribute to the visible count.
No alternative
class probabilities or discarded proposals are invented or exposed in this phase.

## Performance and privacy

Inference time measures the synchronous detection call inside the worker. Processing FPS measures
completed frames in the latest 2-second rolling window, including capture/transfer/scheduling.
Before two seconds have elapsed, it uses elapsed session time. It is not camera FPS, a latency
percentile or accuracy. Processing is capped at 10 FPS and only
one frame is in flight. Earlier five-minute physical sessions include user-reported battery,
endpoint performance and subjective warmth observations; no controlled energy/thermal benchmark
or measured throttling result exists. See the original device ledger for conditions and limits.

Permission is requested only after Start. Pause retains camera preview, Stop releases tracks.
Backgrounding pauses inference; camera preview may still be active until Stop or page exit.
Only the threshold is optionally persisted. Frames and detections remain transient and local.
The model is served locally after initial setup; no offline/PWA guarantee exists yet.

No tracking, identity persistence, active learning, training, retraining, ground-truth evaluation
or model comparison is implemented. Corrections cannot improve this detector in Phase 1.

## Diagnostic and CSP change

PR #4 adds opt-in local camera-call metadata diagnostics and a restrictive response CSP.
Merged commit `edea505` has one authorized temporary preview and user-reported physical Safari
checks on both devices, recorded in the
[privacy-preview ledger](docs/validation/PHASE_1_PRIVACY_PREVIEW_2026-10-24.md).
Remaining lifecycle, network and authenticated deployed-header/HTML checks are not complete.
Same-origin requests are allowed,
so CSP is not proof of no uploads. WASM execution requires the explicit `wasm-unsafe-eval` allowance;
older browsers may reject compilation and must fail visibly. See
[privacy investigation](docs/phases/PHASE_1_PRIVACY.md) for coverage and retest requirements.

## Initialization failure guidance

The offline-error follow-up distinguishes worker failure before ready from a crash during
inference. Initialization guidance mentions possibly unavailable app/model/runtime files and
connection checks, retaining reported detector details; it does not diagnose every failure as
network-related or use navigator.onLine as proof. Generic runtime and missing-capability errors
remain distinct. PR #6 is merged; an authorized preview of `063a97a` is READY for a
focused retest. Both devices have user-reported passes for revised wording, indicator-off state
and explicit retry recovery; these do not complete broader validation or inspect network/track
internals. See
[offline guidance and remaining validation decisions](docs/phases/PHASE_1_OFFLINE_ERROR.md).

## Closeout disposition — 2026-10-25

The [supplied closeout review](docs/reviews/PHASE_1_CLOSEOUT_REVIEW_2026-10-25.md) records user
acceptance of limitations 1–5 on 2026-10-25: model-loading interruption coverage, permission-modal
Stop coverage, uninspected network/headers/HTML, untested external interruption and unexplained
historical S1/S2. Those are accepted limits, not new physical test passes. On the same UTC date, the user directly
accepted limitations 6 and 7 (actual Safari storage denial remains untested, and diagnostic
coverage/log provenance is limited), approved retaining opt-in diagnostics for device testing,
and approved Phase 1 closeout. This does not explain S1/S2 or establish absence of uploads.
See the [recorded decisions](docs/phases/PHASE_1_CLOSEOUT.md). Phase 2 remains separately gated;
production diagnostic inclusion must be decided before the first production deployment. No merge,
deployment or protection/automatic-deployment change is authorized by those decisions.

## Phase 2 proposed interpretation — not implemented

Planning proposes geometric, session-scoped association, not appearance/person re-identification.
IDs may change at control/geometry boundaries or when motion/occlusion prevents matching. Current
Detection output has one primary class/score; alternative scores are unavailable unless a verified
adapter capability later exposes genuine same-box outputs. Near-threshold inspection can show
only returned detections within the fixed output floor/cap. The proposed separate .25 tracking
floor excludes lower scores from association/birth even when the display slider shows them;
confirmation, not tentative creation, allocates public IDs. Above-floor false tracks remain possible.
Live tracking counters/variability
are not accuracy; labelled synthetic identity metrics evaluate association, not detector quality
or real-camera identities. See the [proposed design](docs/superpowers/specs/2026-10-25-phase-2-tracking-design.md).
Accepted Phase 1 limitations remain in force and are not new Phase 2 device passes.

## Phase 2 Tasks 1–3 checkpoint

Geometric tracking was introduced at the Task 3 checkpoint and merged through PR #11;
this is not full Phase 2 physical acceptance. See [checkpoint evidence and risks](docs/phases/PHASE_2_TASK_3_CHECKPOINT.md).
No new physical Safari tracking evidence or measured ground-truth accuracy is supplied.

## Phase 2 inspector, notes and synthetic evaluation

The Phase 2 runtime merged via PR #11 at `efdb1d9` on 2026-10-26 UTC; it is not yet accepted on physical devices.
Current association evidence explains geometric matching, not the model's internal reasoning.
The near-threshold band contains actual returned boxes only; alternatives remain unavailable.
Tracks can switch identities in crossings, expire during low scores or occlusion, and reset at
analysis/control boundaries. No appearance re-identification or live ground-truth ID metric exists.

Notes store metadata and user-entered text only; users may put personal information in that text.
Storage is not encrypted, durable or universally available. Page-RAM and saved serialized content
are capped at 100 entries / 256 KiB; JS heap overhead is larger than serialized bytes. Real Safari
storage refusal remains untested. Notes never automatically retrain or correct the detector.

Synthetic reports evaluate known numeric inputs, not detector accuracy or held-out improvement.
Initial confirmation misses count. Missing recovery denominators show Not measured. Recovery
requires the same first returning ID in a bounded labelled interval; later return cannot rescue
an earlier wrong-ID recovery. Raw confidence is not accuracy. See implementation/profiling notes.

Copy log is opt-in within diagnostics and copies the complete bounded JSON snapshot. Clipboard
content and OS sync are outside page memory; Clear removes page records/fallback text and invalidates
pending UI callbacks, but cannot revoke an already initiated clipboard write. Production inclusion
of diagnostics still requires a decision before the first production deployment. Historical S1/S2
and every other accepted Phase 1 evidence limitation remain unchanged.

The [on-device synthetic stress profiler](docs/phases/PHASE_2_STRESS_PROFILE.md) makes tracker/copy
timings measurable from the app, independently of model inference. It uses no camera and cannot
establish real-scene accuracy, battery/thermal safety or absence of uploads. Physical results and
the inconsistent 8 ms investigation budget remain unresolved. Unsupported long-task observation
is explicitly unavailable; whole overlapping task durations may include unrelated main-thread work.


## Phase 4 validation metrics — first slice

Per-label precision/recall and confusion matrices describe only the labelled photos in the displayed
check. Precision has no measurement when no photos were predicted as a class; recall has no
measurement when no actual photos of that class were checked. These appear as Not measured, never
as fabricated zero/perfect scores. Counts and denominators accompany percentages. Small samples,
wrong labels, imbalance and undetected similarity can make these results misleading.
Loaded-model metrics reuse the existing independence exclusions and unknown-provenance warnings;
they do not independently establish absence of leakage. Recorded comparisons are described below;
ordinary validation keeps the test split sealed. The dedicated final path described below is the
only exception; this first slice alone does not complete Phase 4.


## Reproducible runs and recorded comparisons

New runs default to seed 42; earlier runs used a new random seed. Holding the seed, selected data,
algorithm and cached embeddings constant reproduces the classifier's weights in the tested runtime.
Identical bits across other browsers, hardware or re-computed embeddings are not guaranteed.
Run metadata cannot recreate deleted photos: restore refuses changed dataset versions or selections.
Renaming a label also changes the version, so this refusal can be conservative. Old saved models
still load as before, but records without a run manifest cannot be restored or compared as controlled
experiments. No destructive migration is performed.

Comparisons show saved validation results on exactly the same recorded examples, not fresh results
on the current dataset or a final held-out score. Training and validation selections must both match by default;
the default same-data comparison remains strict. The explicit size mode below relaxes only the
training-subset requirement under additional checks. Multiple changed settings do not isolate a cause,
small samples can exaggerate differences, and repeated validation tuning can overfit validation.
The existing near-duplicate and label-quality limits remain. Export, final-test evaluation and
additional algorithms are not implemented by this slice. No extra device validation is claimed.

## Controlled numeric learning lessons

These lessons run real optimisation on seeded synthetic features, not photos or pretrained
embeddings. The easy task, random-label memorisation task and nonlinear task deliberately use
different data; their scores must not rank algorithms or predict personal-image accuracy. The
random-label task can fit its small training set without learning a useful relationship for unseen
examples. The nonlinear task cannot be solved by this linear head. Both are teaching examples,
not automatic diagnoses of a user's dataset. Check labels, leakage, sample size and variability
when interpreting real-photo curves.

Lessons are bounded and cancel between epochs. Cancellation reports only completed epochs;
leaving or hiding the page suppresses pending results. No lesson model is saved. Physical Safari
execution of these new lessons has not been checked; existing accepted device/privacy limitations
remain unchanged. Automated numeric and Chromium tests are evidence only for their tested paths.

## Saved-run JSON reports

Reports describe recorded training/validation results, not a fresh evaluation or final test.
They omit class names by default; selecting the checkbox includes the names from training time,
which may contain personal information. Model/dataset names, photos, embeddings and weights
are excluded. Local IDs, timestamps and original-file SHA-256 fingerprints are included for
reproducibility: matching fingerprints can link files, so omission of names is not anonymisation.
Review a downloaded file before sharing it. The app does not upload it.

A report is not a dataset backup or reloadable model; there is no report import. Reproduction
requires the original images/labels/splits, compatible encoder and training implementation.
Legacy runs without manifests explicitly lack exact-replay metadata. Invalid records are refused
instead of exporting misleading values. Export does not establish absence of near-duplicate
leakage or certify labels, and repeated validation tuning can still overfit validation.
Browser download preparation is tested in Chromium under the current CSP; actual file saving
in physical Safari remains untested. A success message means a download was requested, not that
the browser saved the file. Object URL release is scheduled after 30 seconds; background timer
throttling can delay it. Historical browser/hardware details were not recorded and cannot be
recovered by exporting a run. Existing accepted
privacy/device limitations and unresolved reports remain unchanged; no new manual session is
required for this slice.

## Controlled training-set-size comparisons

The explicit size mode permits only a different deterministic nested per-label training cap while
keeping validation references, dataset version, labels, encoder, seed and other settings fixed.
Both runs must finish. It does not claim that more photos improve accuracy: it shows the stored
scores, including worse or unchanged results. Training loss is measured on different training
photos, so use the shared validation measurements to investigate generalisation. The same epoch
count can imply different batch sizes or update counts, and is not an equal-compute comparison.

One seed and one small validation set cannot establish a general effect. Repeated tuning may
still overfit validation. Hash checks reject exact train/validation overlap, but do not prove that
all near-copies or correlated examples were found. Historical saved results are not a fresh
check of the current dataset. No new physical-device evidence or final-test access is claimed.

## Final held-out checks

Only the explicit final-check action can compute test embeddings. You choose a saved completed
model and confirm its one-time lock before pixels reach the encoder. A final record is per dataset,
not per version or label subset. Failed/cancelled checks may retry only that locked model on the
unchanged snapshot; completed results cannot be rerun/overwritten through the app. Even a rename
or unrelated dataset edit can conservatively prevent a locked incomplete check from finishing.
A deleted chosen model cannot retry because its weights are not duplicated in final storage.

Exact/near-copy screening covers both training and validation and ignores manual Not related
exceptions, conservatively refusing likely copies. It can reject genuinely different photos and
cannot identify every correlated example. No heuristic or saved manifest proves ground-truth
independence or correct labels. Small or generated test sets do not establish real-world accuracy;
results measure the stated locked classifier/test selection, not an improvement over a baseline.
The unchanged training/validation code never embeds tests. Test vectors remain in memory only,
and no partial predictions/metrics are published if storage, encoding or cancellation fails.

Further tuning after reading test scores makes those scores part of model selection. Use fresh
held-out images for any new final claim. Local IndexedDB is not tamper-proof: clearing/evicting
storage loses locks, and reimporting the same images does not restore independence. This personal
lab does not retain an undeletable global image-history ledger. A final report stores labels,
settings, file fingerprints and results locally; delete the dataset or Delete all to remove it.
Deleting just a saved model leaves its disclosed historical report (and no duplicate weights).

Automated evidence covers numerical/planning guards, cross-connection atomic choice, immutable
completion, cancellation/retry, migrations and real-encoder integration in Chromium. New physical
Safari behaviour remains untested; existing accepted device/privacy limits and unexplained reports
remain. No additional manual camera, battery or cross-browser walkthrough is required by this slice.
