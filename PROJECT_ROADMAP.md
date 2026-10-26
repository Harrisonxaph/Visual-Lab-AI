# Visual Labs AI roadmap

Phase 1 merged into main through PR #1 on 2026-10-23 at 23:17:42 UTC (`a5bb085`).
The merge preceded real iPhone/iPad testing. Those observations and the focused offline retest are
now recorded; the user approved [Phase 1 closeout](docs/phases/PHASE_1_CLOSEOUT.md) with its
documented limitations on **2026-10-25 UTC**. The user separately authorized Phase 2 implementation after approving its plan and Task 3
checkpoint. Tasks 1–6 merged via PR #11 at `efdb1d9` on 2026-10-26 UTC, before Phase 2 physical
acceptance; Phase 2 is not closed. Phases 3–5 and stretch/exploratory targets remain planned.
Deliver each phase in a separate branch and PR into main.
Codex develops; Claude reviews. Never merge, deploy or modify production without user approval.

## Phase 1 — Live object detection

Responsive desktop/iPhone/iPad lab, safe camera permission and live preview, verified on-device
runtime/model, labelled boxes and confidence, threshold slider, pause/resume, loading/errors,
inference time and processing FPS, model panel and confidence education. Keep UI responsive.
Acceptance: actual camera detections, live threshold updates and graceful unsupported states.

## Phase 2 — Tracking and decision inspector

Planning entry: [Phase 2 proposal and scope](docs/phases/PHASE_2.md). The reviewed design and implementation plan remain the baseline; see the
[implementation evidence and pending acceptance](docs/phases/PHASE_2_IMPLEMENTATION.md). No deployment is approved.

Persistent IDs, association, configurable trajectories, confidence histories/charts, entry/exit/loss/
reacquisition events, selectable object history, searchable 80-category COCO explorer where applicable,
local missed/incorrect/unstable detection log. Show alternative predictions and near-threshold results
only when actually exposed. Benchmark duration, fragmentation, temporary loss, occlusion recovery
and stability; report ID switches only with valid evaluation evidence. Separate heuristics from
objective ground truth. Acceptance: stable IDs when conditions permit and understandable histories.

## Phase 3 — Active learning and model comparison

Flag errors, approve/reject corrections, explicitly permitted local examples, provenance/model/version/
annotation metadata, uncertainty review ranking, duplicate/near-duplicate checks, label quality,
training/validation/held-out splits and leakage prevention. Provide an honest supported training
workflow: classifier training is never called detector retraining. Compare Lite0/Lite2 only after
compatibility verification using identical inputs/conditions: speed, latency, size, class coverage,
confidence/output, labelled-ground-truth accuracy where available, hardware/browser/configuration.
Record experiment ID/date, model/version, threshold, inference settings, dataset version, hardware,
results and before/after measurements. Acceptance: reviewable corrections and reproducible comparisons;
improvement claims require held-out evaluation evidence.

## Phase 4 — Interactive modes and practical tracking

Scavenger hunt with random/selected lists, countdown, progress, feedback, score and difficulty;
persistence rules prevent points from unstable single frames. Draw zones/lines; entry/exit and
directional crossings, dwell time, current/historical counts; stable-ID deduplication and correct
coordinates under resizing/aspect changes. Installable PWA where supported; cache suitable app/model
assets, explain network/offline limits, touch controls and camera limitations. Acceptance: working
hunt, movement measurement and supported installation.

## Phase 5 — Advanced AI experiences

Independently configurable pose, gestures, scene understanding, optional narration, movement/activity
summaries, decision visualisation and educational explanations. Identify every producing model and
its limitations; speculative interpretation is not verified observation. No remote/expensive inference
without justification and explicit opt-in. Acceptance: optional modules preserve the core lab.

## Required stretch targets

A. Advanced Decision Inspector: decision histories, genuinely supported alternatives, threshold
sensitivity, uncertainty trends and cross-model decision comparison.

B. Tracking Quality Laboratory: algorithm benchmarks, fragmentation/ID stability, motion/partial
occlusion/recovery tests, labelled sequences and association-strategy comparison.

C. Reproducible Experiment System: named experiments, versioned configurations/datasets, compatible
reruns, comparison reports and structured results export.

D. Uncertainty-Driven Active Learning: review identification/ranking, human label approval,
held-out improvement tracking and a later supported detector fine-tuning pathway.

E. Adaptive Mobile Inference Engine: resolution/cadence adaptation, performance monitoring,
quality/performance presets, workers where feasible, responsive controls, and battery/thermal
considerations where measurable. Do not imply browsers expose universal thermal measurements.

F. Dataset Integrity Laboratory: duplicates, likely split leakage, annotation validation, class
imbalance, coverage/quality, provenance and consent.

G. Privacy-Safe Experiment Sharing: configuration, charts, numerical results, summaries and anonymised
metadata export; raw footage only by explicit choice; strip unnecessary personal data and offer local deletion.

## Exploratory, uncommitted targets

Evaluate only after the core roadmap stabilises: custom-class detector fine-tuning; advanced
multi-object re-identification; recorded video replay with synchronized analysis; side-by-side
tracking algorithms; advanced gesture interactions; guided learning challenges and quizzes.

## Delivery checks

Every phase: inspect, present plan, branch, implement scoped work, add relevant tests/docs, run checks,
open PR, summarize evidence/limits/next action, and stop before merge/deployment. Maintain README,
AGENTS, architecture, experiments, limitations and phase notes. Later phases add interruption tracking,
zone deduplication, split integrity, reproducible configuration and validated import/export tests.
