# Development workflow and testing approach

This is a personal learning project, not a commercial product. Process exists to protect
correctness, privacy and data integrity, not to generate paperwork.

## Roles

| Role | Owns |
| --- | --- |
| **Claude — lead developer** | Architecture, plans, implementation, automated tests, training/evaluation code, documentation, branches and PRs, responses to valid review findings. Runs all available automated checks before handing a PR to Codex. |
| **Codex — independent reviewer** | Reviews Claude's PRs for functional bugs, architecture, training/evaluation correctness, data leakage, privacy/security and missing critical tests. Separates critical defects from optional improvements. Does not implement changes unless explicitly instructed. Does not demand testing disproportionate to the feature's risk. |
| **Project owner** | Decides features, reviews summaries, performs occasional focused manual acceptance, approves merges and deployments. |

Claude and Codex do not talk to each other automatically. The owner passes handoffs between them,
so every handoff must be self-contained (template below).

## Sequence per milestone

1. Claude inspects the repository and writes a short scoped plan (in the PR or a chat message, not
   a separate documentation PR unless asked).
2. The owner approves the plan.
3. Claude implements on a branch, adds tests, runs checks, opens a draft PR.
4. Claude posts the Codex handoff.
5. Codex reviews; Claude fixes material findings on the same PR.
6. Codex verifies the fixes.
7. The owner approves merge and any deployment.

Avoid documentation-only PRs that only record merges or CI runs; record such facts in the next
substantive PR or not at all. The Git history is the record.

## Testing philosophy: automate by default

Claude runs, before handoff:

- `npm run check`, `npm run format:check`, `npm test`, `npm run test:browser`, `npm run build`,
  `npm run test:production` (Chromium).
- Machine-learning checks where relevant: numerical gradient checks, seeded deterministic training,
  loss-decreases tests, split-integrity and leakage tests, metric correctness against hand-worked
  examples.
- Investigation of any failure with logs and reproducible tests before asking for manual work.

Manual testing is requested only when a real device is genuinely needed (for example, picking
photos from the iOS photo library). Then:

- At most one focused acceptance session per new feature.
- Instructions live **inside the app** (an acceptance checklist panel with short steps and
  Pass / Fail / Skip), so you do not switch between apps. The panel produces one summary to copy.
- No routine battery, warmth, five-minute sessions, permission walkthroughs or cross-browser
  rechecks of unchanged functionality.
- Re-test only behaviour a change could affect, and say why.

Never mark an incomplete or skipped check as passed. Do not add testing infrastructure more complex
than the feature it tests.

## Milestone report format

Every milestone report (in the PR description) has four short sections:

1. **Automated checks completed:** commands and counts, ML evaluation results.
2. **Essential manual checks:** none, or the in-app checklist items and why a device is needed.
3. **Known limitations and deferred non-critical checks.**
4. **Material blockers requiring action.**

## Codex review handoff template

```text
Codex: please review PR #<n> in Harrisonxaph/Visual-Lab-AI.
Link: https://github.com/Harrisonxaph/Visual-Lab-AI/pull/<n>
Head commit: <sha>   Base: main at <sha>

Scope: <one or two sentences>
Out of scope: <what this PR deliberately does not do>

Automated evidence (run by Claude): <commands and counts>
Highest-risk areas to check: <e.g. split leakage, gradient maths, storage deletion>

Please report:
- Critical defects (would give wrong results, leak data, break privacy, or break existing features)
- Important issues (should fix in this PR)
- Optional improvements (may be deferred)
Do not implement changes; review only.
```

## Boundaries

- Free and open-source tools only; no paid APIs, compute or infrastructure without owner approval.
- No merge, deployment, production or settings change without explicit owner approval.
- Preserve privacy: images and datasets stay on the device unless the owner explicitly chooses
  otherwise.
