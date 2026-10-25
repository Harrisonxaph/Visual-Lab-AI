# Phase 2 planning review response — 2026-10-25

Source: numbered findings supplied by the user for PR #9. This responds to the planning documents;
it is not implementation, execution of the proposed tests, a new Claude invocation or permission
to bypass the later Task 3 review stop.

| Finding | Planning correction |
| --- | --- |
| 1. Low-score track pressure | Added TrackerConfig.trackingFloor default .25, distinct from .05 model floor and display slider. Both association and births require the tracking floor; raw lower-score results remain honestly inspectable. Internal tentative keys never consume public IDs; IDs allocate on two-match confirmation. Counts expose below-floor exclusions, candidate churn, public IDs and capacity. Above-floor false tracks remain possible. |
| 2. Late lifecycle risk / incremental UI | Same Phase 2 branch/PR, mandatory push-and-review stop after Task 3 with exact SHA, Phase 1/lifecycle regressions and CI. No Tasks 4–6 until checkpoint approval is supplied; CI alone/self-review is not that approval. Task 3 already delivers tracked video/list. Reading order: video/list, inspector/chart, then explorer, notes, benchmark. Phone-width viewports (≤600 CSS px) stack full-width views; wider screens pair only with ≥616 CSS px available content and readable minimum widths. Controls remain ≥44px. |
| 3. Storage implementation | Chose localStorage under `visual-labs.phase2.failure-notes.v1`, guarded property/getItem/setItem/removeItem, no blanket clear of unrelated settings. Same 100-entry/256KiB logical bounds apply to RAM, loaded and unsaved fallback, and persistence. Safari refusal remains accepted but physically untested; Phase 2 automated store tests are its only planned refusal-path evidence. |
| 4. Segment surprises | Planned prominent on-video New tracking segment notice with actual reason and a segment chip on Resume/intrinsic geometry/analysis gap, not only an inspector message. It must not obscure camera controls or suggest re-identification. |
| 5. Synthetic benchmark | Retained numeric labelled fixtures, no bundled clips. Current Phase 1 production smoke runs a real fixed image through detector/overlay; a tracker does not yet exist. Task 6 explicitly extends that smoke through tracking. Recorded clips/replay remain stretch scope, not an existing test or Phase 2 commitment. |
| 6. Diagnostic copy / plain-link note | Planned opt-in Copy log in Task 4: full bounded JSON snapshot, accurate success or selectable-text fallback, existing redaction, explicit clipboard action and no camera/network activity. The user supplied O6: recorded the plain-link Phase 1 comparison in the focused ledger and linked it from README Checks, retaining unspecified device, unconfirmed tab closure and no diagnostic request/network evidence. This completes the documentation correction without a new test run. |
| 7. Defined churn rule | Synthetic 300 frames ×50 returned boxes (one stationary .80 cup plus 49 noise .05–.24). At tracker floor .25: one candidate/confirmation/public ID, first-frame ID absent, same ID from frame 2 through 300, zero loss/expiry/drop, peak live 1 and 14,700 excluded noise results. Above-floor one-frame candidate churn cannot advance public IDs unless confirmed. Counts are fixture assertions, not measured real-probe results. |

References: [design](../superpowers/specs/2026-10-25-phase-2-tracking-design.md),
[implementation plan](../superpowers/plans/2026-10-25-phase-2-tracking.md),
[acceptance checks](../phases/PHASE_2_TESTING_PLAN.md).

No application/test code, assets, dependencies, CI or deployment settings change in this response.
Proposed regression cases must be implemented and run only after explicit implementation approval.

## Portrait-phone correction

The user deferred runtime Tasks 1–3 until after PR #9. This correction is documentation only:
full-width stacked video/list and inspector/chart on phone-width viewports replace the earlier
338 px pairing rule. The optional continuing-track floor is not introduced; the reviewed .25
floor still applies to births and associations. Runtime work requires the later implementation step.
