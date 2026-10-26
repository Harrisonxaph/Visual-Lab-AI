# Assistant instructions

Build Visual Labs AI as a private, educational computer-vision laboratory. Read ARCHITECTURE.md,
PROJECT_ROADMAP.md and MODEL_LIMITATIONS.md before changes. Phase 1 is closed with documented
accepted limitations. The user authorized Phase 2 Tasks 1–3 only against merged plan
`559bd645aa5c9be636169435e02b74df5a6374df` on 2026-10-26 UTC. Stop at the Task 3
checkpoint: push its exact commit and passing regression/CI evidence, then await explicit
review approval before Tasks 4–6. No merge/deployment/protection change or Phase 3 is authorized.

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
