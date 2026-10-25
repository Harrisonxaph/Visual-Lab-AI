# Phase 1 initialization error guidance and remaining validation decisions

Status: PR #6 merged. Its merge commit `063a97a` has one authorized temporary preview;
focused physical retesting has **user-reported passes on both devices**, with broader validation
gaps retained. See the
[current retest ledger](../validation/PHASE_1_OFFLINE_RETEST_2026-10-25.md). This small follow-up
does not complete Phase 1 validation or authorize Phase 2.

## Baseline and reproduction

Baseline main after accepted ledger PR #5: `a1ae97d020a35da6a6844520e2a884f1940e8b4b`.
[Main merge CI 40151809840](https://github.com/Harrisonxaph/Visual-Lab-AI/actions/runs/40151809840)
passed, including typecheck, formatting, unit/browser tests, build and production tests.

The accepted [privacy-preview ledger](../validation/PHASE_1_PRIVACY_PREVIEW_2026-10-24.md)
records offline worker errors and explicit retry on the physical devices. The failed resource in
those physical attempts is unknown. The misleading text was reproduced automatically in Chromium:
load the shell, take the context offline before Start, then attempt worker initialization. The
old text suggested the browser may not support the model. Aborting the actual model resource
separately produced `Detector: Failed to fetch` without recovery guidance. These are automated
reproductions with a synthetic camera, not new physical Safari evidence.

## Behavior change and limits

`WorkerDetector` uses actual initialization state, not `navigator.onLine`, error-text guessing or
an additional network probe. Before ready, worker failure says:

> Inference could not start. Required app, model or runtime files may be unavailable. Check your connection and choose Start camera to retry.

Worker-reported initialization errors use that guidance and retain the original `Detector:` detail,
including genuine unsupported model/operator messages. This is guidance about possible unavailable
resources, not a claim that every initialization failure is a network failure. Model/runtime bugs,
policy blocks and incompatibility can still fail initialization; detail is retained where available.
Opaque worker error events cannot reliably distinguish these causes.

After ready, a worker crash says:

> The inference worker stopped unexpectedly. Choose Start camera to retry.

Reported inference errors retain their original detector detail without new network advice.
Explicit preflight errors for missing Worker/WASM/camera features remain unchanged, as do data
transfer errors, loading timeout handling, cleanup and stale-worker guards. Failure releases the
camera/worker, and restoring connectivity does not automatically restart inference. Start remains
the explicit retry action. No additional requests, uploads or background retries are introduced.

## Automated checks

Regression tests were written and observed failing before the message change:

- `tests/inference-errors.test.ts`: initialization guidance with either `navigator.onLine` value;
  preserved initialization operator detail; post-ready crash rejects an in-flight frame and stays
  generic; reported inference error details remain intact. These are Node/Vitest unit tests using
  controlled worker boundaries, not browser/model compatibility tests.
- `tests/browser/lab.spec.ts`: actual offline worker initialization; aborted real model download;
  synthetic camera tracks end and video detaches after error; error persists after restoring access
  until Start; explicit Start recovers. A worker crash after ready stays a runtime error and recovers
  explicitly. Existing missing-feature and permission rejection tests remain part of the suite.
- Existing production/CSP tests exercise real CPU/WASM model loading in normal and diagnostic modes.
  Their success is not a physical-device retest of these new messages.

Final local verification (Node 24, system Chromium 154 on Linux): `npm run check`,
`npm run format:check`, `npm test` (29 passed), `npm run build`,
`CHROMIUM_PATH=/usr/bin/chromium npm run test:browser` (26 passed) and
`CHROMIUM_PATH=/usr/bin/chromium npm run test:production` (10 passed). `git diff --check` passed.
Production tests include real Lite0 CPU/WASM inference under CSP in normal and diagnostic modes.

Independent Codex static review found no Critical/Important issue; this is not Claude review or an
independent test run. Deferred optional minor: a dedicated same-detector unit case that starts
successfully, then fails initialization on a subsequent load. The existing close/reset and
identity guards are unchanged and were reviewed; that extra case is not included in this PR.

## Written decisions for remaining validation checks

| Check | Decision and basis | Evidence limit / next action |
| --- | --- | --- |
| Stop while model loads | Use existing deterministic automated cancellation coverage for Phase 1 review because physical loading was too brief to interrupt. `tests/core.test.ts`: `does not revive after Stop while loading`; also `releases a camera stream granted after Stop`. | These are **Vitest unit tests**, not Chromium startup-interruption tests. Physical model-loading Stop remains untested; do not relabel it a device pass. |
| Background while model loads | Use existing deterministic automated delayed-loading coverage for review: `stays paused when backgrounding interrupts model loading, even after returning` in `tests/core.test.ts`. | Unit test controls loading completion; Chromium's separate `backgrounding pauses inference without automatically resuming` checks the UI visibility bridge after startup. Neither establishes physical Safari interruption during model loading. |
| Stop during permission modal | iPad test is blocked by Safari's modal; retain that reason. iPhone control accessibility was not checked. | Existing late-grant cancellation unit test provides automated evidence, not a physical modal-interaction pass. |
| External interruption | **Pending**, not Not applicable. User reported not tested; no device/setup reason establishes impossibility. | Later test a feasible FaceTime/competing-camera interruption or obtain a concrete reason before classifying Not applicable. Simulated track-ending tests are not physical interruption evidence. |
| Actual storage denial | **Pending physical restriction case**; keep successful Private Browsing operation separate. | iOS alone is not a Not applicable reason. Chromium `blocked storage does not prevent startup` simulates thrown storage operations; it does not prove actual Safari storage restriction. No supported test setup for real denial was established. |
| Network inspection | Retain as an explicit **unverified limit**, pending user/reviewer acceptance or later signed-in desktop inspection. | UI camera indicators and CSP do not establish absence of uploads. Same-origin connections remain allowed. No acceptance is inferred from approval of a ledger's accuracy. |
| Authenticated deployed headers and HTML | Retain as explicit **unverified limits**, pending acceptance or later signed-in desktop inspection. | Local/CI header tests and the device's blocked Vercel-script event are useful distinct evidence, not a full deployed document/worker/loader/model header or injection inventory. No protection bypass/public sharing link is authorized. |
| Fresh-tab and diagnostic comparison | Preserve the ledger's Pass rows and P27 coverage limits; a fresh tab was not confirmed for that full log and a separate non-diagnostic comparison remains pending. | The diagnostics observed one post-Start camera request, not all browser contexts. Historical S1/S2 remain unexplained. |

These decisions document what the review can rely on; they do not silently turn untested checks
into passes, accept risk on the user's behalf or authorize Phase 2.

## Focused manual verification — current preview authorization

The user authorized one preview of merged commit `063a97a` after merge CI passed. Its exact
commit/URL and results are recorded separately from `edea505` in the current retest ledger.
Further deployments require separate approval. On one device at a time:

1. Load the shell online without Start; disable connectivity, then Start and allow permission.
   Record exact error, indicator and whether camera/video was active. Cached assets may still work;
   that does not establish the failure path. Do not claim which resource failed without inspection.
2. Restore connectivity and confirm inference remains stopped until explicit Start; verify recovery.
3. Confirm missing-capability and genuine model/runtime errors are not described as known network
   failures. Use automated controlled tests when a real device cannot safely induce these cases.

Stop before merging, any additional deployment or Phase 2. The old preview still runs `edea505`;
the new focused preview is pinned to `063a97a`. No production, protection or automatic-deployment
setting was changed.
