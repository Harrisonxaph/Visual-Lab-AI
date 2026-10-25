# Phase 2 proposal — tracking and decision inspector

**Status: planning only.** User authorized this design/plan and a draft PR, not runtime features,
merging, deployment, protection/automatic Git changes or Phase 3. Codex proposes, Claude reviews,
then the user explicitly authorizes implementation of the reviewed plan. No proposed feature is
represented as already implemented.

## Verified starting state

Main `19fd168bee3c22f8c2723d3be75f43ff8b922d50`, merge PR #8. Exact-main
[CI 40241503562](https://github.com/Harrisonxaph/Visual-Lab-AI/actions/runs/40241503562) passed all
required checks. [Phase 1 closeout](PHASE_1_CLOSEOUT.md) and all eight accepted limitations/testing
policy remain unchanged. Its runtime is detection only; the new modules described below do not exist yet.

Read the [proposed design](../superpowers/specs/2026-10-25-phase-2-tracking-design.md),
[implementation plan](../superpowers/plans/2026-10-25-phase-2-tracking.md) and
[acceptance/device checklist](PHASE_2_TESTING_PLAN.md).

## Proposed implementation checkpoints

| Checkpoint | Deliverable | Reviewable evidence after implementation |
| --- | --- | --- |
| 1 | Typed frames/geometry/capabilities, supported-label provenance | Geometry/capability/catalog tests and honest unavailable states. |
| 2 | Bounded deterministic association with tracking floor .25, confirmed-only IDs and lifecycle/history | Known motion/loss/expiry/capacity outcomes and defined 300-frame low-score noise/churn counts; no live ground-truth claims. |
| 3 | Accepted-frame/lifecycle bridge, tracked overlay/list and on-video segment notice | No duplicate processing; Phase 1 regression/lifecycle evidence. **Push exact commit and stop for review before Tasks 4–6.** |
| 4 | Inspector/chart, explorer/near-band view and opt-in diagnostic Copy log | Genuine histories/results, full JSON copy/fallback and usable paired-row phone layout; no fabricated predictions. |
| 5 | Local metadata failure notes and consent/storage handling | Default memory-only, explicit save, validated bounds/corruption/quota/deletion, no footage. |
| 6 | Labelled synthetic tracking benchmark and final device/evidence gate | Independent metric tests, actual worker/CSP smoke, profiling and separately attributed device results. |

Future runtime work stays in one Phase 2 branch/PR with staged commits; this explicit planning PR
is separate. **After Task 3, Codex pushes and waits for the designated reviewer's approval of that
exact commit before Tasks 4–6.** Initial implementation approval does not waive this stop. No
checkpoint authorizes merge/deploy, changes to accepted limitations or Phase 3.

## Key proposed choices for Claude/user review

- Gated one-to-one minimum-cost association with bounded motion prediction, rather than greedy
  matching or an appearance/re-identification stack. Proposed numeric defaults are not validated
  tuning; review their gate, tie, expiry and capacity behavior before implementation.
- Keep model floor .05, tracking floor .25 and display slider separate. Only tracking-eligible
  results associate/birth; all valid returned results remain inspectable. Two consecutive matches
  confirm and allocate a public ID; a brief loss can reassociate, expiry/control/intrinsic-geometry boundaries break
  continuity explicitly. No claim of stable identity across every crossing or pause.
- Local notes default to memory; explicit opt-in saves metadata to localStorage, with 100-entry/256 KiB
  bounds and deletion/error handling. No media, uploads, dataset/training or import/export workflow.
- Current adapter exposes no alternatives. Genuine returned near-threshold results are available
  within model floor/cap; do not invent discarded boxes or class rankings.
- Live duration/loss/variability are descriptive. Fragmentation/ID changes/occlusion recovery need
  labelled evidence; bundled synthetic numeric sequences evaluate association separately from
  real inference. No detector-accuracy or held-out improvement claim.

Phone order is video/list side by side, then inspector/chart side by side, then explorer, notes
and benchmark. Narrow content falls back to stacking within each pair without changing that order.
Controls remain usable; New tracking segment notices are prominent on video after continuity resets.

## Planning verification and next gate

This PR verifies baseline CI and documentation consistency/links only. New test names/commands
are implementation requirements, not tests that have already passed. Runtime/model assets, tests,
CSP and application source remain unchanged. All Phase 2 physical checks start Pending and need a
separately approved preview after implementation. Keep the existing opt-in diagnostics for testing
as approved; production inclusion remains a decision before any production release.

Next: Claude reviews scope/contracts/defaults and testability; correct the plan if needed, then
obtain explicit user implementation approval. A planning-PR merge alone is not that instruction.

A separate Codex static builder check found two planning gaps: explicit RAM-note bounds and
deterministic evaluator/recovery definitions. The design/plan now specify both, plus event/stale
time semantics and benchmark cancellation before Start/Resume. This was not Claude review and
no proposed runtime tests were executed.

## User-supplied planning review response

[Findings 1–3 and optional follow-ups](../reviews/PHASE_2_PLANNING_RESPONSE.md) are recorded with
proposed fixes: distinct tracking floor, confirmed-only IDs/churn fixture, mandatory Task 3 review
stop, localStorage, paired phone layout, on-video segment notices and diagnostic Copy log. The
user-supplied O6 plain-link comparison is now preserved in the Phase 1 focused ledger and linked
from README Checks, with its device/tab-closure limits; it is not Phase 2 evidence. All changes remain
planning only; no proposed test has been executed as a Phase 2 runtime test.
