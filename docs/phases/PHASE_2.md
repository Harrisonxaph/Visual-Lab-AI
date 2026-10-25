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
| 2 | Bounded deterministic association and lifecycle/history | Known synthetic motion/loss/gates/expiry/capacity outcomes; no ground-truth claims on live data. |
| 3 | Accepted-frame/lifecycle bridge and tracked overlay | No duplicate processing on threshold/render; cancellation, geometry and Pause/Stop retain privacy. |
| 4 | Selectable inspector, trajectory/confidence chart, explorer/near-band view | Real observed histories, gaps and accessible mobile controls; no fabricated predictions. |
| 5 | Local metadata failure notes and consent/storage handling | Default memory-only, explicit save, validated bounds/corruption/quota/deletion, no footage. |
| 6 | Labelled synthetic tracking benchmark and final device/evidence gate | Independent metric tests, actual worker/CSP smoke, profiling and separately attributed device results. |

Future runtime work stays in one Phase 2 branch/PR with staged commits; this explicit planning PR
is separate. No checkpoint is authority to merge/deploy, change accepted limitations or add Phase 3.

## Key proposed choices for Claude/user review

- Gated one-to-one minimum-cost association with bounded motion prediction, rather than greedy
  matching or an appearance/re-identification stack. Proposed numeric defaults are not validated
  tuning; review their gate, tie, expiry and capacity behavior before implementation.
- Track returned valid detections independently of the display threshold. Two consecutive matches
  confirm an ID; a brief loss can reassociate, expiry/control/intrinsic-geometry boundaries break
  continuity explicitly. No claim of stable identity across every crossing or pause.
- Local notes default to memory; saving metadata requires explicit opt-in, with 100-entry/256 KiB
  bounds and deletion/error handling. No media, uploads, dataset/training or import/export workflow.
- Current adapter exposes no alternatives. Genuine returned near-threshold results are available
  within model floor/cap; do not invent discarded boxes or class rankings.
- Live duration/loss/variability are descriptive. Fragmentation/ID changes/occlusion recovery need
  labelled evidence; bundled synthetic numeric sequences evaluate association separately from
  real inference. No detector-accuracy or held-out improvement claim.

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
