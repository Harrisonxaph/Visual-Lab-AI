# Assistant instructions

Build Visual Labs AI as a private, educational computer-vision laboratory. Read ARCHITECTURE.md,
PROJECT_ROADMAP.md and MODEL_LIMITATIONS.md before changes. Phase 1 is closed with documented
accepted limitations. The user approved Task 3 checkpoint `a73014743bc10b1a187474ffbc0ebb147a27d9f7`
and authorized Phase 2 Tasks 4–6 against merged plan `559bd64` on 2026-10-26 UTC.
Tasks 1–6 merged through PR #11 at `efdb1d9` on 2026-10-26 UTC. Physical acceptance remains
pending. The stress-profile follow-up merged through PR #12 at `4813abe`.
The timer-precision follow-up merged through PR #13 at `e984edd`.
PR #14 merged at `37ff7d4be571d56c21c1f74bae834c3fe16c7952` on 2026-10-26 UTC,
with final head `f7bc39fcacc5b1a644a727dac908ad225ceb7848`.
Current authorized scope is one temporary preview of that exact merge only after CI run
`40334009325` succeeds, followed by Phase 2 iPhone then iPad validation and a documentation ledger
on a separate branch/draft PR. The documentation branch is not the deployed source.
Include the preview URL in every device request and offer fixed response choices.
No additional deployment, production promotion/alias change, public share/bypass link, protection
or project-settings change, automatic Git deployment, merge, dependency addition,
or begin Phase 3 without explicit approval. Preserve every accepted Phase 1 limitation.


Use one development branch and PR per phase. Never push to main, merge, deploy or modify production
without approval. Preserve working functionality. Codex implements; Claude is the intended reviewer.
Do not claim Claude reviewed work without an actual review.

Separate camera, inference, scheduling, visualization, tracking, experiments and UI through typed
interfaces. No paid API requirements. Keep camera frames local by default; no capture/persistence/
upload without explicit consent. Prioritize iPhone/iPad and desktop, accessibility and touch controls.

Add meaningful unit/integration/browser tests plus manual real-device instructions. Run available
checks before claiming success; distinguish mocked tests, actual inference and real-device evidence.
Confidence is not accuracy; classifier training is not detector fine-tuning. Never fabricate detector
alternatives, tracking metrics or supported-platform claims. Update documentation with limitations.
At each phase end report changes, exact test results, known limits, PR URL and next action.

The CI gate succeeded and the one preview was created READY: deployment
`dpl_GbpjZHimvmfWf5hBiPioXcjRqJ7F`,
https://visual-lab-l8m3xumpt-harrisonjbailey-3896.vercel.app.
That deployment authorization is consumed. Continue device validation and record evidence in
`docs/validation/PHASE_2_DEVICES_2026-10-26.md`; no further deployment is authorized.

## Milestone-based validation (user direction, 2026-10-26 UTC)

Stop routine step-by-step physical-device prompts. Use automated checks and code review first,
then one consolidated physical acceptance session per stable milestone (iPhone, then iPad),
then an evidence/closeout review. Preserve already supplied observations; do not repeat unaffected
passes or reopen accepted Phase 1 limits by default. Report milestone status and request user
involvement at those gates. Retest only affected behaviour after material fixes; explain the
scope and why device evidence is necessary. If a blocking incident requires user-only evidence,
collect the minimum needed in one focused request, not an ongoing stream of routine questions.
Keep untested checks Pending; neither this workflow change nor a milestone pass accepts risks,
closes Phase 2, approves merge/deployment or authorizes Phase 3. Missing boxes (ledger D12–D14)
is unresolved; do not infer a root cause or waive it. No further device action is requested now.
Future device requests still include the approved preview URL and fixed choices/batched reporting.
