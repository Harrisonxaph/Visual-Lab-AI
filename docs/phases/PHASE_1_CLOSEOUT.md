# Phase 1 closeout — approved 2026-10-25

**Phase 1 closeout approved by the user on 2026-10-25 (UTC), with the documented limitations.**
The user explicitly accepted items 6 and 7 and approved proposal 8 on that date. No merge,
deployment, protection/automatic-deployment change or Phase 2 is authorized. This records decisions;
it changes no application code and adds no new physical-test or privacy assurance.

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

## Limitations and recorded disposition

Acceptance is not evidence that a check passed. No item is marked Not applicable without a reason.
Items 1–5 were accepted on **2026-10-25**, according to the supplied review. On the same UTC date,
the user directly accepted limitations **6 and 7**, approved proposal **8**, and approved Phase 1
closeout. Their explicit statement, rather than a PR merge, is the basis for those decisions.

| ID | Check / limit | Disposition |
| --- | --- | --- |
| 1 | Physical Stop/background while model loads: loading was too brief. | **Accepted limit, 2026-10-25.** Rely on deterministic Vitest `does not revive after Stop while loading` and `stays paused when backgrounding interrupts model loading, even after returning` in `tests/core.test.ts`. These are not Chromium/device startup tests. Physical paths remain untested. |
| 2 | Stop while permission is pending: iPad modal blocks controls; iPhone accessibility untested. | **Accepted limit, 2026-10-25.** Unit coverage includes `releases a camera stream granted after Stop`; the physical cancellation check is not passed. Actual permission-background/manual Resume reports are separate evidence. |
| 3 | Network traffic, authenticated deployed document/worker/loader/model headers and HTML not inspected. | **Accepted limit, 2026-10-25.** Local/CI policy tests and a blocked-script device event do not replace that inspection. Same-origin requests remain allowed. Later signed-in desktop inspection is follow-up work, not an accepted no-upload claim. Protection/login policies belong to separate documents. |
| 4 | External camera interruption not tested; no second device/person available, per review. | **Accepted untested limit, 2026-10-25**, not Not applicable or a pass. Simulated track-end tests remain automated evidence only; revisit with a feasible setup. |
| 5 | Historical S1/S2 unexplained; not reproduced in subsequent clarified diagnostic sessions. | **Accepted residual uncertainty, 2026-10-25.** CSP may suppress a previous script. Blocked feedback code is not proven to have requested camera access or caused S1/S2. |
| 6 | Actual Safari storage denial unproven despite Private Browsing and reported Block All Cookies operation. | **Accepted limit, 2026-10-25, by explicit user decision.** Actual Safari storage denial remains untested; automated coverage is sufficient for Phase 1 closeout. This is not a physical pass or Not applicable finding. |
| 7 | Diagnostics observe only the main page after installation; earlier/cached-reference calls, frames, tabs and browser internals are outside coverage. One full log only. | **Accepted limit, 2026-10-25, by explicit user decision.** A fresh tab and Stop are not established by P27. A later user-reported plain-link comparison pass is recorded in O6, with device unspecified and tab closure unconfirmed; it adds no diagnostic request record. Acceptance neither explains S1/S2 nor establishes absence of uploads. |
| 8 | Diagnostics asset is fetched on every load; observer activates only with `?diag=1` and keeps bounded metadata in page memory. | **Approved testing policy, 2026-10-25, by explicit user decision.** Retain existing opt-in diagnostics for further device testing, including through Phase 2 only if separately authorized. Decide production inclusion before the first production deployment. No implementation change or deployment is authorized now. |

Additional scope limits remain disclosed: macOS Safari/Android untested; SIMD fallback not separately
forced; no held-out accuracy evaluation, controlled cross-device energy/thermal benchmark or offline
availability guarantee. Indicators do not inspect camera tracks/network. Acceptance of Phase 1
must not be presented as certification across browsers or measured model accuracy.

## Explicit user decisions — 2026-10-25 UTC

The user stated:

> I accept limitations 6 and 7 as documented in PR #8.
>
> For limitation 6, actual Safari storage denial remains untested; automated coverage is sufficient for Phase 1 closeout.
>
> For limitation 7, I accept the diagnostic coverage and log-provenance limits. This does not explain S1/S2 or establish absence of uploads.
>
> I approve proposal 8: retain the existing opt-in diagnostics for further device testing, including through Phase 2 only if separately authorized. Decide production inclusion before the first production deployment.
>
> I approve Phase 1 closeout with these documented limitations.
>
> Record these decisions and their date in PR #8, run the appropriate documentation checks, and report its exact commit and CI status.
>
> Do not merge, deploy, change protection or automatic deployments, or begin Phase 2.

**Result:** Phase 1 is closed with accepted limitations. Untested checks remain untested; the
evidence, historical uncertainties and source commits above are unchanged. PR #8 remains unmerged
unless separately authorized. Phase 2 still requires a separate explicit instruction. Production
diagnostic inclusion remains a decision before the first production deployment; no deployment is
authorized by this closeout.
