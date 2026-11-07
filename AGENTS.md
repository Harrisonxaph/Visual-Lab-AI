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
reports remain unchanged. The next planned milestone is Phase 4 evaluation; its implementation
scope still needs owner approval. This workflow update authorizes documentation only and does
not restart Phase 3, implement Phase 4, merge or deploy.

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
