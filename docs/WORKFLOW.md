# Development workflow and testing approach

Updated by the project owner on 2026-11-07 UTC. This is a personal learning project.
Codex develops and reviews its own work using three distinct stages. Claude is optional, not
a required relay or reviewer. Historical Claude/Codex reviews retain their original attribution.
Self-review does not establish independent assurance.

## Stage 1 — Scope

Inspect current main, instructions, relevant code and available CI. Select the smallest useful
task within the owner-approved roadmap milestone. State its outcome, boundaries and completion
criteria briefly in chat or the PR; no separate planning PR unless the owner requests one.
Reuse prior decisions and evidence. Choose routine reversible implementation details autonomously.
A new milestone or scope expansion still requires owner approval; this policy does not itself
authorize Phase 4 implementation.

Keep the critical path visible. Use deadlines supplied by the owner, without inventing dates.
Leave stretch targets, unrelated refactors, additional algorithms and optional polish deferred.
If scope threatens a supplied deadline, report one concrete trade-off instead of silently
expanding the work or weakening essential correctness.

## Stage 2 — Build and test

Work on a scoped branch and draft PR. Preserve functioning camera, datasets, training and tests.
Implement the approved task and meaningful regression/numerical tests. Reproduce material bugs
before fixing them. Run available checks appropriate to the changed paths, inspect failures and
correct their causes. Do not add dependencies or infrastructure merely to simplify the process.

Existing commands remain: `npm run check`, `npm run format:check`, `npm test`,
`npm run test:browser`, `npm run build`, `npm run test:production`.
Runtime changes must preserve the existing suite; documentation-only work needs documentation
checks and observation of existing CI, not a new hardware session. Do not repeat unchanged tests
without a change, failure or unresolved concern. If the environment cannot run a check, state
that limit and use available CI evidence without claiming a local pass.

ML checks follow the feature's risk: finite-difference gradients, deterministic learning fixtures,
metric results against hand-worked examples, split/provenance isolation, real-encoder integration,
model round-trips, cancellation and atomic storage. Confidence is not accuracy. Preserve final-test
sealing and test-reuse rules until the approved evaluation path deliberately handles them.

## Stage 3 — Review, fix and verify

Before declaring ready, inspect the diff as a reviewer against the approved requirements.
Check edge cases, lifecycle/cancellation, storage/deletion, privacy, leakage, numerical correctness
and missing critical tests. Separate material defects from optional improvements.

Fix material findings on the same branch. Rerun affected checks and broaden only when the change
or a remaining concern justifies it. Verify CI on the exact final commit. Repeat the fix/verify
part only while a material issue remains. Once completion criteria pass, stop; do not manufacture
extra review rounds, process artifacts or optional scope. If a blocker remains, report its evidence
and one bounded next action or decision.

Label the result **Codex self-review**. Do not claim a separate agent or person reviewed it unless
that actually happened. Automated tests and self-review provide different evidence; neither proves
every platform works. No separate reviewer agent or new review infrastructure is required.

## Minimal owner involvement

Proceed autonomously within approved scope. Keep the owner informed at meaningful checkpoints,
not through a stream of routine choices or agent-to-agent handoff prompts. Ask only when:
- a genuinely missing decision blocks progress or the approved scope needs to expand;
- a material privacy, security or ML-integrity trade-off needs the owner's decision;
- paid services or external actions lack authorization;
- merge or deployment approval is needed after the concrete result is ready.

Manual tests require a specific device-only reason. At most one focused session per milestone
where practical; prefer short in-app Pass / Fail / Skip guidance when useful. Reuse completed
observations. No routine battery, warmth, five-minute camera runs, unchanged permission flows
or extensive unchanged-browser checks. Investigate logs and reproducible tests before asking
for more manual work. Untested and skipped checks never become passes.

## Delivery report

One concise report and draft PR should contain:
- approved scope and completed outcome;
- exact commit, PR link, automated commands/results and exact-head CI status;
- Codex self-review findings, fixes and any remaining material blockers;
- known/deferred limitations and essential manual checks, if any;
- the single owner decision needed next, usually merge approval.

Do not create documentation-only PRs solely to record merges, CI or routine review history.
Fold necessary records into the substantive change. This owner-requested role-policy update is
a documentation change, not authorization for new application features.

## Boundaries

The training-first roadmap and its completion criteria are unchanged. Existing evidence, accepted
Phase 1 limits, unexplained D12–D14/S1/S2 and encoder/Safari device gaps remain as documented.
The owner approves merges and deployments separately; never push directly to main.
No production, protection, project-settings, automatic-deployment or public sharing/bypass-link
changes without explicit approval. Keep automatic Git deployments disabled and the consumed
preview authorization unchanged. No paid APIs, compute or services without approval.
Images, labels and models remain local by default; do not upload private data without explicit
authorization. Preserve essential security, privacy and ML correctness regardless of deadline.
