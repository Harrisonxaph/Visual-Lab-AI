# Development, review and testing — roadmap reset

Effective 2026-10-26 UTC. Claude is developer; Codex is independent reviewer. The owner authorizes
scope, merges and deployments. This replaces the old developer/reviewer assignment and routine
manual-testing gates; historical reviews and observations retain their original authorship and limits.

## One practical milestone cycle

1. Claude inspects current code, instructions and relevant evidence; proposes a short plan with scope,
   approach, tests and completion criteria. Owner approves implementation scope.
2. Claude works on a separate scoped branch, preserving working features. Use failing regression tests
   for reproduced defects and meaningful automated ML/dataset tests. No speculative repair.
3. Claude runs available automated checks, opens a PR and provides exact source SHA and results.
4. Owner supplies the PR link and developer handoff to Codex. Codex reviews code and evidence
   independently, distinguishing material defects from optional improvements and stated limits.
5. Claude fixes material findings. Owner supplies the updated exact commit to Codex; Codex verifies
   relevant fixes, reusing unaffected evidence. No arbitrary number of review rounds or docs-only PRs.
6. If necessary, one focused acceptance session is proposed with a clear reason. Prefer short in-app
   descriptions and Pass / Fail / Skip; no routine app-switching questionnaire or elaborate harness.
7. Owner decides merge and separately any deployment. Approval of accurate records is not acceptance
   of risk. Merge does not authorize production, aliases, public sharing or project-setting changes.

Neither agent automatically messages the other. Do not claim independent review of one's own changes.
Codex authored this explicitly requested documentation reset; Claude can check its scope/feasibility,
and the owner decides adoption. Subsequent Claude feature PRs receive independent Codex review.

## Handoff template

```text
PR URL / exact head SHA / base SHA:
Approved milestone and what changed:
Automated checks: commands, counts/results, exact tested source and CI link:
ML evidence: dataset/split version, preprocessing/extractor/model, seed/config,
  baseline, metrics with denominators, parameter-change and save/reload evidence where relevant:
Essential manual checks, if any, and why automation is insufficient:
Known limitations / deferred checks / material blockers:
Specific review questions:
```

Reviewer response: ranked findings with file/line, reproduction/evidence, impact and required fix;
then nonblocking suggestions and remaining evidence limits. Do not require broad manual validation
for untouched paths. If no material findings, say so without implying every platform is verified.

## Proportionate checks

| Change                     | Automated evidence                                                                                                         | Owner involvement                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Documentation only         | Local links, consistency, diff/format; observe existing CI                                                                 | None                                         |
| Dataset lab                | Decode/limits/storage faults, labels, duplicates, split integrity, touch/file-picker UI tests                              | At most one focused upload session if needed |
| Training                   | Correct gradients/parameter updates, deterministic learnable fixture, real extractor smoke, cancellation, model round-trip | Optional short train/save/reload acceptance  |
| Evaluation/active learning | Known confusion matrices, split isolation, version/config reproducibility, approval and held-out exclusion                 | One focused feature session if useful        |
| Camera/runtime defect      | Reproduction and affected lifecycle/overlay regressions; preserve existing suite                                           | Only targeted device evidence if necessary   |

Existing commands remain in README: types, formatting, unit, browser, build and production smoke.
Runtime PRs should keep the suite green; do not repeatedly rerun identical evidence without a change,
failure or unresolved concern. Existing CI may run the full suite even on docs PRs; this reset does
not modify CI or install a new testing system. Tiny synthetic/generated fixtures establish numerical
correctness, not real-world accuracy. Actual pretrained-feature integration must have separate evidence.

No routine battery percentages, warmth checks, timed camera endurance runs, permission walkthroughs
for unrelated changes or extensive unchanged-browser testing. Automated viewport tests do not certify
physical devices. Skips remain skips; actual storage refusal is not established by Private Browsing.

## Standing limitations and scope

[Phase 1 closeout](phases/PHASE_1_CLOSEOUT.md) remains accepted. The
[legacy tracking ledger](validation/PHASE_2_DEVICES_2026-10-26.md) is partial, not a new dataset-lab
acceptance record. D12–D14 remains unexplained; D16/D17 does not explain it. No physical iPad legacy
Phase 2 pass exists. Old M2 worksheets are historical references and are not a prerequisite for an
independent upload/training milestone. This deferral changes work priority, not the facts or risk status.

Material security, privacy and ML correctness defects must be addressed. Noncritical compatibility
limits can be documented and proposed for owner acceptance without inventing Not applicable reasons.
Dataset labels/images stay local and outside GitHub; explicit example fixtures need suitable rights.
