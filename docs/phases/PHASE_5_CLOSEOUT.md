# Phase 5 — closed with documented limitations

Status: **closed by the project owner on 2026-11-16 UTC**. The owner instructed
“Close out p5” after the implementation and limitations were presented. This closes the bounded
training-first educational core; it does not mark untested checks passed or resolve historical defects.

Implemented source: PR #39 merge `03e118e32472ded3eb13cd67165e3fbfeef32a52`;
PR head `220b9c1c1006b24b4716890402e891f953866946`.
Exact-head CI [43964979223](https://github.com/Harrisonxaph/Visual-Lab-AI/actions/runs/43964979223)
succeeded: 229 unit, 109 development-browser and 39 production tests, types, formatting and build.
Merge CI: [43966877179](https://github.com/Harrisonxaph/Visual-Lab-AI/actions/runs/43966877179).
The merge tree is identical to the verified PR head; current CI status is recorded in the closeout
PR. No new runtime code is included in this record.

## Implemented core

- Real saved-classifier predictions rank an eligible unlabelled pool; users approve, correct or skip.
- Explicit consent commits approved labels to training in one protected transaction, retaining
  provenance and all existing validation/test assignments.
- One approved batch can retrain an uncapped source. A fresh original-data control and expanded
  classifier use shared frozen features, configuration and unchanged validation. Actual before/after
  accuracy/loss and parameter changes are shown, including unchanged/worse results.
- Explicit classifier Save retains expanded weights and bounded historical round evidence. Saved
  models display that evidence and existing JSON reports include it with validated allowlists.
- A separately seeded generated-shapes experiment compares equal-budget uncertainty/random
  acquisition with simulated oracle labels. It uses actual embeddings/optimisation and reports
  whichever method wins. Its numerical download supports configuration/cohort inspection.
- Existing final-choice/test-exposure protections remain; no automatic final-test evaluation is added.

In Phase 5 feedback rounds, only the softmax classifier learns on frozen pretrained features
(learning type 2). Phase 4 also contains small trainable hidden-layer networks on numeric/features
inputs. EfficientDet and the encoder are not retrained or fine-tuned. The owner approved closure
of the training-first educational core with these documented limits.
Stretch targets remain optional and no further phase is automatically authorised.

## Evidence

Automated: numerical/determinism/budget/split tests, real-encoder browser integration, persistent
model/evidence round-trips, export validation, cancellation/background/stale-source handling,
390 px layout, CSP and no off-origin feature requests. The generated experiment test forbids stored
blob access and dataset writes; a reproduced fingerprint-overlap defect was fixed with a separate
fixed generator seed. Exact-head CI is recorded in the PR, not inferred from local results.

Physical: no new iPhone/iPad observation is claimed. Previously accepted limitations and unexplained
reports remain. No routine camera, battery or repeated device walkthrough is required here.

## Limitations retained at closeout

- Personal rounds require a completed uncapped source, one approval commit and no later dataset
  edits. Accepted as a bounded workflow; general history reconstruction is a stretch target.
- Personal feedback uses an original-data control. Paired random acquisition is demonstrated only
  on generated data with simulated labels. Accepted for the educational core; do not claim
  superiority on personal images or genuine human annotation-cost evaluation.
- The example uses one fixed seed and 12 validation images; either acquisition method can lose,
  and repeated validation tuning can overfit. Accepted as a teaching experiment;
  broader scientific evaluation is optional, not evidence already collected.
- Saved numerical evidence needs original photos/compatible encoder/code for reproduction; reports
  are not backups. Control weights are not saved and deleting the source can prevent replay of its
  historical-weight reference. Accepted as an explicit storage boundary.
- New training/report flows remain physically unverified on Safari. Existing automated coverage
  and accepted storage/privacy/network limitations remain distinct. Retained as a known
  untested limitation; closure does not establish a physical Safari pass.
- Historical S1/S2 and D12–D14 remain as recorded; they are not explained by this work. Deployed
  network/header observations are not inferred. Existing prior acceptance remains unchanged.

## Relationship to the original master specification

The owner replaced the broader camera/product roadmap with the training-first roadmap on
2026-10-26. Completion here refers to that approved reset, not retroactive fulfilment of all
original requirements.

| Original area | Delivered position |
| --- | --- |
| Live detection, tracking and inspection | Implemented foundation, with documented model/tracking/device limits. |
| Learning, datasets, feedback and evaluation | Substantial implementation: real classifier optimisation, small-network comparisons, split safeguards, metrics, experiments and active-learning teaching loop. |
| EfficientDet-Lite0 vs Lite2 comparison lab | Lite2 compatibility evidence exists; a full paired detector-comparison UI/evaluation lab was not built. Classifier-method comparisons are a different capability. |
| Scavenger hunt, zones/counting, installable/offline PWA | Not implemented; removed from the reset core. |
| Pose, gestures, narrated scenes and detector fine-tuning | Not implemented; optional future scope. Training classifiers does not teach EfficientDet new classes. |

The main deliberate change was from a broad real-time CV product to a bounded ML learning lab.
The earlier testing/review process also became disproportionate to a personal project; the reset
adopted automation and focused manual checks. No percentage of the original feature list is
claimed complete because the roadmap changed and optional ambitions do not have comparable sizes.

## Owner decision and remaining boundaries

Phase 5 and the revised educational core are closed by explicit instruction on 2026-11-16,
not merely by PR #39 being merged. The limitations above remain documented; historical S1/S2 and
D12–D14 remain unexplained, and network/device evidence is not inferred. This is functional
completion against the revised roadmap, not completion of every original master-spec feature.

Production deployment remains unauthorised. Existing opt-in diagnostics are unchanged; their
production inclusion still needs a decision before the first production deployment. Optional
extensions, further development and deployments require a separate owner instruction. No merge,
deployment, settings or automation change is authorised by this documentation record.
