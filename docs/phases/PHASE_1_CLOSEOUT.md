# Phase 1 proposed closeout — 2026-10-25

**Decision pending: items 6–8 below and explicit Phase 1 closeout.** No merge, production deployment
or Phase 2 is authorized. The supplied readiness review identifies no additional runtime fix;
this closeout corrects stale summaries and records evidence/decisions without changing application code.

## Scope and exact source

Source main: **`f5dd6e2e0e4e3396f0f29b738bcfa8fe7f83b9d3`**, merge of PR #7.
[Merge CI 40238286866](https://github.com/Harrisonxaph/Visual-Lab-AI/actions/runs/40238286866)
passed all required checks: asset preparation, typecheck, formatting, unit/browser tests, build
and production tests. CI is verified evidence, not a physical-device test.

Delivered: responsive camera lab; explicit Start/permission and live preview; EfficientDet-Lite0
float32/v1 on MediaPipe 0.10.32 CPU/WASM in a module worker; labelled boxes/scores; confidence
threshold; Pause/Resume/Stop; inference time and rolling processing FPS; loading/error/retry states;
model explanations; injected model configuration; local opt-in diagnostics and restrictive CSP.
Confidence is not accuracy. Lite2 compatibility evidence is recorded, not a controlled benchmark
or a shipped comparison feature. Tracking, training, PWA/offline guarantees and advanced modules
remain future roadmap scope.

Last authorized focused preview: [diagnostic URL](https://visual-lab-2co40dr92-harrisonjbailey-3896.vercel.app/?diag=1),
source **`063a97ace91172f4523b6a0756b4bb84e1424bc7`**, READY as recorded in its ledger.
Source/config/test comparison confirms no changes between that commit and main in `src`, `public`,
`index.html`, package manifests, `vercel.json`, `vite.config.ts` or `tests`; PR #7 added documentation.
This closeout is documentation only and does not refresh any preview or promote production.

## Evidence, separated by source

| Source | Evidence and practical limit |
| --- | --- |
| Automated | Documented suite: **29 Vitest unit, 26 Chromium development-browser and 10 production checks**; latest merge CI passed. Synthetic cameras and real CPU/WASM fixed-image inference are distinct. Production tests include normal/diagnostic mode and local CSP/header probes. These do not establish physical Safari behavior or authenticated Vercel headers. |
| User-reported physical | iPhone 15 Pro / iOS 27.0.1 / Safari; iPad Pro 11-inch (3rd generation) / iPadOS 26.6.2 / Safari. Reports cover detections/thresholds, controls/alignment/pinch zoom, permission recovery, background pause/manual Resume, Private Browsing and offline retry. Five-minute sessions have endpoint metrics, battery and subjective warmth, not controlled performance/thermal benchmarks. Exact Safari builds were not supplied. |
| Focused offline fix | Both devices reportedly show revised initialization guidance, indicator off after failure, remain stopped after reconnection until Start and recover on explicit Start. iPhone wording was pasted; iPad wording was confirmed by reference. The failed resource/cache condition was not inspected. No further runtime blocker is established by the supplied evidence. |
| Supplied log/photo | P27 records one full top-level log: blocked Vercel feedback script, trusted Start, one camera request 4 ms later and resolved settlement. Device identity is absent; other-device equivalence is user-reported. P15's likely copy truncation is an inference. The iPad photo shows app Error/CAMERA OFF presentation, not underlying track or system-indicator state. |
| Supplied closeout review | [Claude review received through the user](../reviews/PHASE_1_CLOSEOUT_REVIEW_2026-10-25.md): records prior acceptance of 1–5 and recommends 6–8. It additionally reports operation with Block All Cookies enabled, without proof storage was actually refused. No new Claude invocation or direct observation is claimed. |

Detailed records: [original device sessions](../validation/PHASE_1_DEVICES_2026-10-24.md),
[privacy sessions/P27](../validation/PHASE_1_PRIVACY_PREVIEW_2026-10-24.md),
[focused offline retest](../validation/PHASE_1_OFFLINE_RETEST_2026-10-25.md).
Earlier results stay attached to their tested commits; corrected replies do not erase originals.

## Limitations and proposed disposition

Acceptance is not evidence that a check passed. No item is marked Not applicable without a reason.
Items 1–5 are **accepted on 2026-10-25**, according to the supplied review; 6–8 are not yet accepted.

| ID | Check / limit | Disposition |
| --- | --- | --- |
| 1 | Physical Stop/background while model loads: loading was too brief. | **Accepted limit, 2026-10-25.** Rely on deterministic Vitest `does not revive after Stop while loading` and `stays paused when backgrounding interrupts model loading, even after returning` in `tests/core.test.ts`. These are not Chromium/device startup tests. Physical paths remain untested. |
| 2 | Stop while permission is pending: iPad modal blocks controls; iPhone accessibility untested. | **Accepted limit, 2026-10-25.** Unit coverage includes `releases a camera stream granted after Stop`; the physical cancellation check is not passed. Actual permission-background/manual Resume reports are separate evidence. |
| 3 | Network traffic, authenticated deployed document/worker/loader/model headers and HTML not inspected. | **Accepted limit, 2026-10-25.** Local/CI policy tests and a blocked-script device event do not replace that inspection. Same-origin requests remain allowed. Later signed-in desktop inspection is follow-up work, not an accepted no-upload claim. Protection/login policies belong to separate documents. |
| 4 | External camera interruption not tested; no second device/person available, per review. | **Accepted untested limit, 2026-10-25**, not Not applicable or a pass. Simulated track-end tests remain automated evidence only; revisit with a feasible setup. |
| 5 | Historical S1/S2 unexplained; not reproduced in subsequent clarified diagnostic sessions. | **Accepted residual uncertainty, 2026-10-25.** CSP may suppress a previous script. Blocked feedback code is not proven to have requested camera access or caused S1/S2. |
| 6 | Actual Safari storage denial unproven despite Private Browsing and reported Block All Cookies operation. | **Decision needed. Recommend accept as a limit.** Chromium tests simulate storage exceptions; no actual Safari denial evidence. Do not claim Not applicable solely because this is iOS. |
| 7 | Diagnostics observe only the main page after installation; earlier/cached-reference calls, frames, tabs and browser internals are outside coverage. One full log only. | **Decision needed. Recommend accept the stated coverage/provenance limit.** A fresh tab and Stop are not established by P27; non-diagnostic fresh-tab comparison remains unperformed. No universal camera/privacy assertion follows. |
| 8 | Diagnostics asset is fetched on every load; observer activates only with `?diag=1` and keeps bounded metadata in page memory. | **Decision needed. Recommend keep opt-in for device testing through Phase 2, if separately authorized; decide production inclusion before the first production deployment.** No code/build change or production authorization now. Deferred production packaging should not block Phase 1 closeout. |

Additional scope limits remain disclosed: macOS Safari/Android untested; SIMD fallback not separately
forced; no held-out accuracy evaluation, controlled cross-device energy/thermal benchmark or offline
availability guarantee. Indicators do not inspect camera tracks/network. Acceptance of Phase 1
must not be presented as certification across browsers or measured model accuracy.

## Decisions requested

1. Accept limitations **6 and 7**, or specify additional evidence required.
2. Approve proposal **8** for continued opt-in testing, with production inclusion explicitly deferred.
3. With those decisions recorded, approve **Phase 1 closeout**, or identify remaining required work.

Items 1–5 do not need reapproval. No confirmed unresolved runtime failure is identified in the
supplied review, but outstanding decision items prevent declaring closeout approved. Approving this
document or merging its PR alone does not substitute for the decisions above. Phase 2 requires a
separate explicit instruction, and any production deployment requires separate approval.
