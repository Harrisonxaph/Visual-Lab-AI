# Phase 4 — functional closeout for owner decision

Status: functional scope implemented in this change; **owner closeout pending**. Based on PR #34
merge `9c78da8f86c55aeb0437abd0b684e2ac3d1f41c8` (merge CI 43926119518 succeeded). The functional
PR and delivery report record its exact final head, automated counts and exact-head CI result.
This document neither approves a merge/deployment nor starts Phase 5.

## Completion against the roadmap

| Beginner-friendly outcome | Implementation/evidence |
| --- | --- |
| Understand overfitting from measured curves | Separate training/validation CE and accuracy; controlled learnable, random-label and nonlinear lessons with real optimisation |
| Compare settings on the same data | Versioned saved manifests, settings restoration, seeds, strict comparisons and controlled dataset-cap comparisons |
| Compare learning methods | 1-NN on shared frozen features; freshly trained softmax and an 8-unit tanh network on identical ordered photo features/settings; nonlinear numeric demonstration |
| Know what learned | Actual weight changes, gradient tests, explicit frozen encoder/detector, distinct objectives and prediction losses |
| Keep/reload compatible results | Saved softmax models, bounded metadata-only run reports and explicit neural parameter files with compatibility/provenance limits |
| Make one final evaluation after choosing | Shared durable softmax/neural choice per dataset; commit before pixels; immutable exact parameters; no test cache, retraining, partial result or method-switch reset |
| Reproduce compatible experiments | Source snapshot, ordered selections, class order, encoder/preprocessing, settings, seed and histories; neural parameters/provenance preserved for locked retries |

Final results are historical and immutable, not an invitation to rescore the test set. Retrying
an incomplete choice is allowed only for the same model and unchanged snapshot. A later independent
claim after test-guided decisions needs fresh held-out data.

## Automated evidence

Evidence is automated desktop Chromium and Node/Vitest, not physical Safari:

- Numerical gradients, seeded learning, finite-number guards, validation-label isolation and
  actual parameter changes, including both neural layers/biases and optional L2.
- Saved-model/file round-trips, bounded untrusted JSON, compatibility, provenance/copy checks,
  safe text, opt-in names and current-versus-file-reported metrics.
- Real pinned encoder under development and production CSP; existing camera/privacy regressions.
- Neural final inference against direct evaluation; changed weights rejected before pixels;
  softmax/neural transaction competition; cancel/reload/retry with identical durable weights;
  imported files ineligible; no cached test features; completed results not replaced; dataset
  deletion removes final history and retained neural parameters.
- Existing softmax final locks, signatures, storage-error paths and source/data integrity checks
  remain covered. No schema migration or new dependency is introduced.

Final counts and CI must be read with the exact PR head; earlier-head checks are not substituted
for final-head verification. Codex performs self-review, not independent assurance.

## Remaining limitations and dispositions

| Item | Disposition |
| --- | --- |
| Physical Safari training, file picker/download and performance | Untested; retain as a visible limitation for owner closeout. No routine device session is requested without a material failure or device-only question. |
| Automated WebKit unavailable in prior investigation | Not a physical pass; retain prior evidence and limit. |
| Small/generated datasets, uncalibrated confidence and heuristic similarity | Disclosed; do not claim general improvement or guaranteed leakage detection. |
| Imported model history/provenance | Unverified; current validation screening is conditional on recorded references. Imported files are excluded from final-test choice. |
| Browser storage loss and absent dataset backup | Retain existing limits. Model files need the original dataset/label IDs and are not dataset backups. |
| Neural parameters retained in final history | Explicit consent at final choice; retained until dataset/all-data deletion. Source deletion does not remove this copy; downloads are separate. |
| Source deletion or dataset changes during an incomplete final check | Refuse retry/reset; preserve locked exposure. Original source and snapshot are required. |
| Prior accepted Phase 1 limits and unexplained S1/S2/D12–D14 | Preserve prior dispositions; this work neither explains nor silently closes them. |
| Authenticated deployed HTML/headers/network inspection | No new inspection or absence-of-uploads claim; preserve prior stated limitations. |

No new material runtime blocker is known after the scoped checks; the delivery must still report
any failing required check. No stretch feature, new framework, additional algorithm or routine
manual battery/heat/camera walkthrough is required to finish this Phase 4 scope.

## Owner decisions

1. Decide the functional PR's merge after its concrete evidence is ready.
2. Approve Phase 4 closeout with documented limitations, or identify a specific material blocker.
3. Separately authorize Phase 5 scope if desired. Nothing here authorizes implementation or deployment.

There is no separate documentation-only PR or repeated manual-testing round required for this
closeout decision. No merge, deployment, production/protection/settings or automatic-Git changes
are performed by this work.
