# Phase 1 Privacy Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Local opt-in camera-call diagnostics and tested CSP for the existing Phase 1 lab.
**Architecture:** Early classic script wraps this realm's getUserMedia only with diag=1. Response
CSP comes from vercel.json and is reused by Vite preview, with real-model production tests.
**Tech Stack:** JavaScript, TypeScript/Vite, Playwright, Vitest, MediaPipe CPU/WASM.
**Spec:** ../specs/2026-10-24-phase1-privacy-design.md

## Global Constraints

No deploy, merge, production/protection/automatic Git change or Phase 2. No frame capture or
upload by diagnostics. Same-origin connections remain permitted. Physical evidence stays separate.

## Review Focus

- Disabled diagnostics must not wrap camera acquisition or add a panel.
- Rejected or pending acquisition must preserve application lifecycle behavior.
- Other realms/earlier scripts cannot be claimed as observed.
- CSP must apply to worker responses as well as the document and allow real WASM inference.
- Logs must be bounded, clearable, text-only and not persist on reload.

### Task 1: Diagnostic instrumentation

Files: public/camera-diagnostics.js, public/camera-diagnostics.css, index.html,
tests/browser/diagnostics.spec.ts.
- [x] Write browser tests for disabled mode, early requests, Start, promise behavior, rejection,
  bounded/sanitized logs and clear/reload. Run and observe missing-feature failures.
- [x] Implement early synchronous instrumentation and independent panel, no app lifecycle edits.
- [x] Run diagnostic tests and existing browser regressions.

### Task 2: Response policy

Files: vercel.json, vite.config.ts, tests/browser/privacy.spec.ts,
playwright.production.config.ts, tests/browser/live.spec.ts.
- [x] Write production tests for response headers and blocked script/connect/worker requests,
  including worker-originated connections. Run and observe failure without policy.
- [x] Add CSP to vercel.json and reuse headers on Vite preview. Test the real model under CSP.
- [x] Run typecheck, formatting, unit, full browser and production suites/build.

### Task 3: Evidence and delivery

Files: docs/phases/PHASE_1_PRIVACY.md, docs/phases/PHASE_1.md, ARCHITECTURE.md,
MODEL_LIMITATIONS.md, README.md.
- [x] Record baseline main/CI, diagnostic limitations, CSP meaning, remaining tests, cold-cache
  failure procedure and permission-dialog lifecycle constraints.
- [x] Inspect authenticated preview only if existing access is available; otherwise pending.
- [x] Commit and push a separate branch; open draft PR with exact SHA and deployment plan.
- [x] Stop before deployment/merge and Phase 2.

Execution evidence: 24 unit, 25 development browser, 8 production browser checks passed.
Typecheck, formatting and build passed. Preview inspection pending without existing authentication.
Draft PR delivery follows the final review; no deployment is authorized.

Review follow-up: in diag mode observe document CSP violations after listener installation, with
sanitized blocked addresses and directive/disposition/trust metadata. Real blocked-script logging
test observed RED then GREEN; synthetic events cover URL/data redaction. Production suite now has
10 checks, including headers across all built assets/loaders/WASM/model/page. Authenticated headers
remain Pending; the old preview's SSO/login response policies are separate documents. Production
diagnostic-shipping decision is deferred. Existing media-src blob allowance retained.
