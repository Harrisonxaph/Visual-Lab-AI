# Assistant instructions

Canonical instructions for AI assistants working on Visual Labs AI. `agent.md` and `CLAUDE.md`
point here.

## Purpose

Visual Labs AI teaches how AI models are trained, evaluated and improved, through working
in-browser experiments. Read [PROJECT_ROADMAP.md](PROJECT_ROADMAP.md),
[docs/WORKFLOW.md](docs/WORKFLOW.md), [ARCHITECTURE.md](ARCHITECTURE.md) and
[MODEL_LIMITATIONS.md](MODEL_LIMITATIONS.md) before changes. Explain technical concepts in
beginner-friendly language in code-facing docs, UI text and summaries.

## Roles and three-stage engineering cycle

Updated by the owner on 2026-11-07 UTC. Codex now owns architecture, scoped planning,
implementation, automated tests, documentation, branches/PRs and a distinct review pass.
Claude is optional; no Claude handoff or owner message-relaying is required for routine work.
A review of Codex's own work is self-review, not independent assurance.

Use the three-stage cycle in [docs/WORKFLOW.md](docs/WORKFLOW.md):
1. **Scope:** select the smallest task within the approved milestone and its completion criteria.
2. **Build:** implement and run proportionate automated checks; reproduce defects before fixing.
3. **Review and verify:** inspect the full diff against requirements and ML/privacy/data-integrity
   risks, fix material findings, rerun affected checks and verify CI on the exact head.

Continue these stages without asking for approval of each routine decision already covered by
the approved scope. Stop when the acceptance criteria and relevant checks pass; do not chase
optional refinements or create review-only documentation loops. The owner chooses milestone
scope and still approves every merge and deployment. Escalate only a genuine blocker, a material
risk decision, scope expansion or an action requiring explicit authorization.

## Current scope

The foundation, Dataset lab and first genuine Training lab are implemented and merged through
PR #22, main at `98686c12f48a8f9604cf99b0de949f59bdf14872` when this policy was written.
Implementation is not comprehensive physical-device validation. Accepted limits and unresolved
reports remain unchanged. On 2026-11-15 the owner asked Codex to resume development and
self-review with minimal input. On 2026-11-16 the owner explicitly approved Phase 4 closeout
with its documented limitations and authorised Phase 5 development. PR #35 is merged as
`0302438`; merge CI 43936757329 succeeded. PR #36 added a bounded unlabelled review queue and is merged as `e89ca50`.
PR #37 merged as `32781b3`; merge CI 43956459599 succeeded. It adds consent-gated,
atomic training-only label promotion. PR #38 merged as `65d843a`; merge CI 43960863521
succeeded. It adds measured retraining against a same-data control after one approved batch.
Current Phase 5 scope adds a matched-budget uncertainty-vs-random experiment on freshly generated
shapes (simulated oracle labels, separate generator seed from the stored example). Keep private
and sealed data untouched, use equal label budgets/settings/features/validation, and report actual
outcomes even when uncertainty performs worse. Save allowlisted human-round evidence only with
explicit classifier Save and include it in existing local reports. No Phase 5 closeout is implied:
prepare a concrete completion candidate and retain known limits for the owner's decision.
Preserve accepted limitations, existing weights/locks/schema and privacy. No dependency, merge,
deployment, production/protection/settings or automatic-Git changes are authorised.

Stay strictly within PROJECT_ROADMAP.md and the approved milestone. Preserve existing code and
tests; defer unrelated cleanup, stretch features, new frameworks and speculative optimisations.
Use explicit owner deadlines when supplied; do not invent dates, promise unsupported timelines
or weaken privacy/ML correctness to meet them.

## Rules

- Never push to main, merge, deploy, or change production, protection, project or Git-automation
  settings without explicit owner approval. Use one branch and draft PR per milestone.
- Preserve working functionality: camera, inference engine, model integration, privacy safeguards,
  UI and existing tests. Do not rebuild them without reason.
- Free and open-source tools only. No paid APIs, compute or services, analytics or new
  infrastructure without approval. Pin dependency versions; record model provenance, licence and
  checksum in `THIRD_PARTY_NOTICES.md`.
- Privacy: images, datasets, camera frames and trained models stay on the device by default.
  No upload, capture or persistence without explicit user action. Provide clear deletion.
- Honesty about machine learning:
  - Say which kind of learning is happening (inference / classifier on frozen features /
    fine-tuning / training from scratch / detector fine-tuning). Classifier training is never
    called detector retraining or fine-tuning.
  - Confidence is not accuracy. Improvement claims need held-out evaluation, not training-set
    scores or confidence.
  - Keep test data out of training and model selection; prevent leakage between splits.
  - Never fabricate predictions, metrics, alternatives or platform-support claims.
- Testing: automate by default (see `docs/WORKFLOW.md`). Ask for manual testing only when a real
  device is genuinely needed, at most one focused session per new feature, guided by an in-app
  checklist. Never mark an incomplete or skipped check as passed.
- Investigate failures with logs and reproducible tests before asking for repeated manual work.
- Keep known open issues listed in the roadmap until resolved or explicitly accepted by the owner.
- Keep processes proportionate: no documentation-only PRs just to record merges or CI runs.

## Engineering conventions

- TypeScript, Vite, framework-free DOM UI. Keep camera, inference, tracking, datasets, training,
  evaluation and UI in separate modules with typed interfaces. Heavy work runs in workers.
- Tests live in `tests/` (Vitest) and `tests/browser/` (Playwright). Machine-learning code needs
  numerical gradient checks, seeded deterministic tests and leakage tests where relevant.
- Prioritise iPhone/iPad and desktop: responsive layout, 44 px touch targets, accessibility.
- Milestone reports use the concise evidence and decision format in `docs/WORKFLOW.md`.
