# Phase 2 physical-device validation — 2026-10-26

Status: **In progress; Phase 2 not accepted or closed.** No physical Phase 2 results have been
supplied for this session. This is a documentation-only validation branch; its commits are not
preview source and require no deployment.

## Authorized source and environment

- Source: `37ff7d4be571d56c21c1f74bae834c3fe16c7952` (PR #14 merge, main).
- CI gate: [40334009325](https://github.com/Harrisonxaph/Visual-Lab-AI/actions/runs/40334009325).
  Verified **completed / success** on the exact source before the successful deployment request.
- User authorization: 2026-10-26 UTC; one temporary preview only. Production aliases,
  protection/project settings and disabled automatic Git deployments must remain unchanged.
  No public sharing/bypass link, merge, further deployment or Phase 3 is authorized.
- Preview URL: https://visual-lab-l8m3xumpt-harrisonjbailey-3896.vercel.app
- Deployment ID: `dpl_GbpjZHimvmfWf5hBiPioXcjRqJ7F`.
- Final Vercel inspection: **READY**, `target: null` (preview). Returned `githubCommitSha`
  and `githubCommitRef` both equal the full approved source SHA. Build duration about 9 seconds
  from returned building/ready timestamps. READY is build/platform evidence, not a device pass.
- One deployment created. An earlier request with an explicit `target: preview` was rejected
  during API validation (HTTP 400), creating no deployment. The corrected request omitted target,
  as specified by Vercel's API for previews, and pinned both Git ref and SHA to the approved commit.
- Existing project: `visual-lab-ai` / `prj_6uGItgPOAj9FeiAc6oVp5GdvWWYI`.
- Before deployment: Vercel project inspection reports SSO protection enabled with
  `all_except_custom_domains`; source `vercel.json` has `git.deploymentEnabled: false`.
- After deployment: read-only project inspection confirms the same SSO-protection settings and
  unchanged project domain list. No project-setting, alias, protection or Git-automation mutation
  was requested. No sharing/bypass tool was used.
- Authenticated application HTML/headers/network inspection: not established. A protection/login
  response is not application evidence. No bypass or public sharing link will be generated.

## Evidence rules and prior limitations

Follow the [device testing plan](../phases/PHASE_2_TESTING_PLAN.md) and
[stress-profile procedure](../phases/PHASE_2_STRESS_PROFILE.md). Every device request includes the
approved preview URL and fixed answer choices. Test iPhone first, then iPad; confirm current
versions and conditions. Do not mark a check passed from an unanswered template.

Physical results are **user-reported observations**, not automated or independently certified.
Copied logs, screenshots and synthetic numeric results must retain their provenance. No raw camera
footage collection/upload is requested; Stop before copying diagnostics or taking a screenshot,
and exclude the video area. Missing information stays Pending.

Preserve all [accepted Phase 1 limitations](../phases/PHASE_1_CLOSEOUT.md): loading/permission-modal
interruption coverage limits; external interruption and actual Safari storage denial untested;
uninspected network/deployed authenticated headers/HTML; S1/S2 unexplained; diagnostic execution
context and pasted-log provenance limits. CSP permits same-origin connections and does not prove
absence of uploads. Opt-in diagnostics remain for authorized device testing; production inclusion
requires a later decision. Private Browsing success is not proof of storage denial.

Synthetic timings are not camera FPS, end-to-end latency, real-scene tracking accuracy or battery/
thermal evidence. Record observed clock step, budget uncertainty window/source and verdict;
a 1 ms fallback is an assumption, not a measured bound. Qualitative ID changes without identity
annotations are not ground-truth switch metrics. No new risk acceptance is inferred.

## Automated evidence (separate from physical observations)

PR #14 reported 79 unit, 48 development-browser and 14 production tests passing locally on Linux
Chromium 154, plus type, format, build and diff checks. These are historical exact-head results
from `f7bc39fcacc5b1a644a727dac908ad225ceb7848`, not new physical-device evidence.
Merge CI status and exact source verification will be recorded above before deployment.
Documentation checks for this branch: local Markdown link resolution for all three changed files
and `git diff --check` passed. No runtime source or configuration changed in this branch; no new
runtime test run is claimed. Draft-PR CI is recorded separately from source merge CI.

## Device details — awaiting confirmation

| Detail | iPhone | iPad |
| --- | --- | --- |
| Previously reported model | iPhone 15 Pro | iPad Pro 11-inch (3rd generation) |
| Previously reported OS/browser | iOS 27.0.1 / Safari | iPadOS 26.6.2 / Safari |
| Confirmed current details / Safari build | Pending | Pending |
| Test date/time / preview source | Pending | Pending |
| Charging / Low Power Mode / battery / warmth / other workload | Pending | Pending |

## Physical checklist

Every cell starts Pending. A partial result covers only the steps actually reported.

| Check | iPhone | iPad |
| --- | --- | --- |
| Fresh page: Idle, camera inactive, no prompt before Start | Pending | Pending |
| Camera-off stress profile: counts/config/environment, full timing distributions | Pending | Pending |
| Clock step, uncertainty window/source, verdict, startup responsiveness | Pending | Pending |
| Stress cancellation/retry; Start/Resume/hide/page-exit cancellation | Pending | Pending |
| Start/consent, live boxes, confirmed IDs; running/loading profile gate | Pending | Pending |
| Single-object ID continuity (30 seconds) | Pending | Pending |
| Two-object motion/crossing qualitative observation | Pending | Pending |
| Brief loss/reacquisition and longer expiry | Pending | Pending |
| Tap/list selection, inspector/events/history/chart gaps | Pending | Pending |
| Trails Off / 2 / 5 / 10 seconds; no bridging gaps | Pending | Pending |
| Display thresholds, returned near-threshold list, alternatives unavailable | Pending | Pending |
| Searchable 80-label catalog | Pending | Pending |
| Portrait/landscape/zoom, selection alignment, layout and scrolling | Pending | Pending |
| Pause/background/Resume/Stop, segment notice dismissal/reset | Pending | Pending |
| Navigate away/back: camera stays stopped; controls usable | Pending | Pending |
| Failure-note validation, safe text/count and actual floor metadata | Pending | Pending |
| Memory-only default; opt-in save/reload/disable/delete one/all | Pending | Pending |
| Synthetic labelled benchmark: truthful metrics, cancellation | Pending | Pending |
| Diagnostics Copy log/fallback/Clear after Stop | Pending | Pending |
| Five-minute inference/FPS, responsiveness, battery/warmth observations | Pending | Pending |
| Offline/error/retry if applicable; cached success leaves failure Pending | Pending | Pending |

## Stress profile records

No records yet. For each completed run collect sample/warmup/live/active/lost/detection/retained
counts, fixture version, actual tracker config, p50/p95/max for update including returned copy,
extra snapshot and combined work; `clockStepMs`, `budgetWindowMs`, `budgetWindowSource`, verdict;
long-task support/entries/drops; browser/hardware concurrency/build ID if available, wall-time
field and stated conditions. Startup delay is separately observed: the synchronous probe precedes
warmup and is excluded from update/copy and elapsed-time fields.

## Session observations

None supplied yet. Record each answer verbatim or with a clearly identified interpretation, its
device and tested steps. Resolve ambiguity without converting it into a pass.

## Remaining gate

All physical checks remain Pending. This ledger does not close Phase 2, accept new limitations,
authorize merging or authorize another deployment.
