# Assistant instructions

Canonical instructions for AI assistants working on Visual Labs AI. `agent.md` and `CLAUDE.md`
point here.

## Purpose

Visual Labs AI teaches how AI models are trained, evaluated and improved, through working
in-browser experiments. Read [PROJECT_ROADMAP.md](PROJECT_ROADMAP.md),
[docs/WORKFLOW.md](docs/WORKFLOW.md), [ARCHITECTURE.md](ARCHITECTURE.md) and
[MODEL_LIMITATIONS.md](MODEL_LIMITATIONS.md) before changes. Explain technical concepts in
beginner-friendly language in code-facing docs, UI text and summaries.

## Roles

- **Claude — lead developer:** architecture, plans, implementation, automated tests, training and
  evaluation code, documentation, branches and draft PRs. Runs every available automated check
  before handing a PR to Codex, using the handoff template in `docs/WORKFLOW.md`.
- **Codex — independent reviewer:** reviews Claude's PRs; distinguishes critical defects from
  optional improvements; does not implement changes unless explicitly instructed; does not demand
  testing out of proportion to the feature's risk.
- **Project owner:** chooses features, approves plans, performs occasional focused manual
  acceptance, approves every merge and deployment.

Claude and Codex do not communicate automatically; handoffs go through the owner.

## Current scope

Phase 1 (computer vision foundation, including the earlier tracking work) is implemented.
The next milestone is **Phase 2 — Dataset laboratory**, which requires the owner's approval of
its plan before implementation. Do not start Phase 3 or later without approval.

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
- Milestone reports use the four-section format in `docs/WORKFLOW.md`.
