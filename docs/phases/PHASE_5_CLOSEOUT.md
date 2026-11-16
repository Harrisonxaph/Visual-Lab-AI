# Phase 5 — completion candidate

Status: **not closed; owner decision required after the functional PR is reviewed and merged**.
Base: PR #38 merge `65d843a922bb1eecce3258d28b7a7f8ecacea5c9`, merge CI 43960863521 succeeded.
The functional PR records the exact proposed source head and its CI results.

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

Only the softmax classifier learns on frozen pretrained features (learning type 2). EfficientDet
and the encoder are not retrained or fine-tuned. The core project can be considered functionally
complete if the owner approves this implementation and its documented limits; stretch targets are
optional and no further phase is automatically authorised.

## Evidence

Automated: numerical/determinism/budget/split tests, real-encoder browser integration, persistent
model/evidence round-trips, export validation, cancellation/background/stale-source handling,
390 px layout, CSP and no off-origin feature requests. The generated experiment test forbids stored
blob access and dataset writes; a reproduced fingerprint-overlap defect was fixed with a separate
fixed generator seed. Exact-head CI is recorded in the PR, not inferred from local results.

Physical: no new iPhone/iPad observation is claimed. Previously accepted limitations and unexplained
reports remain. No routine camera, battery or repeated device walkthrough is required here.

## Limits and proposed dispositions

- Personal rounds require a completed uncapped source, one approval commit and no later dataset
  edits. Proposed: accept the bounded workflow; general history reconstruction is a stretch target.
- Personal feedback uses an original-data control. Paired random acquisition is demonstrated only
  on generated data with simulated labels. Proposed: accept for the educational core, not claim
  superiority on personal images or genuine human annotation-cost evaluation.
- The example uses one fixed seed and 12 validation images; either acquisition method can lose,
  and repeated validation tuning can overfit. Proposed: accept the honest teaching experiment;
  broader scientific evaluation is optional, not evidence already collected.
- Saved numerical evidence needs original photos/compatible encoder/code for reproduction; reports
  are not backups. Control weights are not saved and deleting the source can prevent replay of its
  historical-weight reference. Proposed: accept this explicit storage boundary.
- New training/report flows remain physically unverified on Safari. Existing automated coverage
  and accepted storage/privacy/network limitations remain distinct. Proposed: accept as a known
  limitation or request one focused device-only check if there is a concrete concern.
- Historical S1/S2 and D12–D14 remain as recorded; they are not explained by this work. Deployed
  network/header observations are not inferred. Existing prior acceptance remains unchanged.

## Decisions still needed

The owner approves the functional PR's merge separately. After review/merge, explicitly decide
whether to close Phase 5 and the educational core with the limitations above. Ledger accuracy or
merge approval alone is not risk acceptance. Production deployment remains unauthorised. Existing
opt-in diagnostics are unchanged; their production inclusion still needs a decision before the
first production deployment. No deployment/settings/automation changes are part of this closeout.
