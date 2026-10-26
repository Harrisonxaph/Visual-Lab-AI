# Phase 2 physical-device validation — 2026-10-26

Status: **In progress; Phase 2 not accepted or closed.** iPhone pre-Start observations, small benchmark and numeric stress results have been supplied; validation remains in progress and remaining checks are Pending. This is a documentation-only validation branch; its commits are not
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
| Confirmed current details / Safari build | User confirmed iPhone 15 Pro / iOS 27.0.1 / Safari; exact Safari build not supplied | Pending |
| Test date/time / preview source | Pending | Pending |
| Charging / Low Power Mode / battery / warmth / other workload | Pending | Pending |

## Physical checklist

Every cell starts Pending. A partial result covers only the steps actually reported.

| Check | iPhone | iPad |
| --- | --- | --- |
| Fresh page: Idle, camera inactive, no prompt before Start | User-reported Pass (D2; tab closure not separately confirmed) | Pending |
| Camera-off stress profile: counts/config/environment, full timing distributions | Correct 100×50 stress report supplied (D5); D3 observations retained separately | Pending |
| Clock step, uncertainty window/source, verdict, startup responsiveness | Step/window 1 ms observed, within, update p95 5 ms (D5); quantified startup delay Pending | Pending |
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
| Synthetic labelled benchmark: truthful metrics, cancellation | Six-fixture report supplied (D4); cancellation/UI checks Pending | Pending |
| Diagnostics Copy log/fallback/Clear after Stop | Pending | Pending |
| Five-minute inference/FPS, responsiveness, battery/warmth observations | Pending | Pending |
| Offline/error/retry if applicable; cached success leaves failure Pending | Pending | Pending |

## Stress profile records

D5 contains the first supplied 100-live-track × 50-detection stress report: 50 measured updates,
184 warmups, 50 active / 50 lost tracks and 10,150 retained samples. Actual reported floors are
model 0.05 and tracking 0.25, synthetic score 0.8 and fixture version 1.

| Measured work | p50 ms | p95 ms | Max ms |
| --- | --- | --- | --- |
| Tracker update including returned copy | 4 | 5 | 5 |
| Extra snapshot copy | 0 | 1 | 1 |
| Combined | 4.5 | 5 | 5 |

Observed minimum clock step/window: **1 ms / 1 ms**, source **observed clock step**, verdict
**within** the 8 ms update p95 investigation budget for this run. No fallback assumption was used.
The zero snapshot median does not establish zero copying cost; quantization limits interpretation.
The raw combined median 4.5 is preserved even though whole-millisecond UI formatting may round it.
No addition of separate percentiles or inference about real-camera performance is made.

Long-task observation is **unsupported**, not evidence of zero long tasks. Reported hardware
concurrency is 4, build ID Unknown, measurement interval 8747–9339 ms and elapsedMs 2235.
`elapsedMs` includes warmup/yields but excludes probe/setup; it is not a probe-delay measurement.
Charging, Low Power Mode, warmth, other workload and exact physical test time remain Pending.
The report describes the synthetic job as camera not used; that alone does not establish the
whole page's camera state. Prior user-reported camera-off observations remain separately in D3.
No stress cancellation, retry, sustained performance or physical tracking acceptance is inferred.

## Session observations

### D1 — iPhone details confirmed

Source: **user-reported physical-device details**, recorded 2026-10-26 14:20 UTC.
The user selected **A** in response to the device-confirmation question: iPhone 15 Pro /
iOS 27.0.1 / Safari unchanged. Exact Safari build was not supplied. The earlier pasted list
included all choices and was not interpreted as a selection; only this explicit A confirms details.
No pre-Start camera state, page status, permission timing or functional pass is inferred.
Preview/source remain those recorded above. All functional checks remain Pending.


### D2 — iPhone pre-Start state

Source: **user-reported physical observation**, recorded 2026-10-26 14:21 UTC.
The user selected **A**: Idle, camera indicator off, no permission prompt. The request supplied
https://visual-lab-l8m3xumpt-harrisonjbailey-3896.vercel.app, asked for a fresh plain tab, closure
of other lab tabs and no Start interaction. Tab closure was not separately confirmed. Record a
pass for the reported pre-Start state only, not camera-request diagnostics, network privacy,
post-Start behaviour or stress profiling. No diagnostic log was supplied.


### D3 — iPhone camera-off synthetic stress completion

Source: **user-reported physical observation**, recorded 2026-10-26 14:25 UTC.
The user selected **A**: completed; camera stayed off; controls remained responsive. The request
specified the stress-profile button on the approved preview and no Start camera interaction.
This establishes those observations only. Raw JSON, timing distributions, sample/config/environment
fields, clock step/window/source/verdict, long-task observations and conditions were not supplied;
they remain Pending. No particular numeric budget outcome or maximum UI delay is inferred.


### D4 — iPhone small labelled benchmark output (not stress profile)

Source: **user-pasted application JSON reported from the physical-device session**, recorded 2026-10-26 14:34 UTC.
The supplied array contains six labelled numeric fixtures, not the stress-profile report. Its
source is `labelled synthetic numeric fixture`; every entry has `fixtureVersion: 1`,
`sampleCount: 40`, `detectorInference: not run`, `buildId: Unknown`, model floor 0.05 and tracking
floor 0.25. Every entry reports zero excluded recoveries. The table transcribes its values:

| Fixture | Visible truth | Misses | Fragments | ID changes | Recovery eligible / recovered | Recovery rate | Processing ms | Elapsed ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| single-motion | 40 | 1 | 0 | 0 | 0 / 0 | Not measured | 4 | 49 |
| crossing | 80 | 2 | 0 | 0 | 0 / 0 | Not measured | 3 | 50 |
| stationary-class-flip | 40 | 1 | 0 | 0 | 0 / 0 | Not measured | 1 | 47 |
| short-occlusion | 35 | 1 | 0 | 0 | 1 / 1 | 1 | 1 | 56 |
| long-expiry | 20 | 2 | 1 | 1 | 1 / 0 | 0 | 1 | 48 |
| empty-invalid | 0 | 0 | 0 | 0 | 0 / 0 | Not measured | 0 | 48 |

Short-occlusion recovery record: synthetic truth A, pre-ID 1, start/end 1300/2300 ms, eligible,
first ID 1, recoveryAtMs 1300, success true. Long-expiry record: truth A, pre-ID 1, start/end
2800/3800 ms, eligible, first ID 2, recoveryAtMs 2900, success false. Other recovery arrays are
empty. These describe synthetic fixture evidence, not real-world occlusion or identity accuracy.
The association outcomes match the documented fixture expectations; timing totals for these
small fixtures do not establish 100-track stress timing, clock step, or an 8 ms p95 verdict.

All entries contain this user-agent string:

```text
Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0.1 Mobile/15E148 Safari/604.1
```

Preserve the raw UA tokens as application-reported metadata; do not reinterpret the `18_7` token
as independently verified installed OS or override the user-confirmed details in D1. The build
ID is Unknown, so this pasted output does not independently attest the source commit. The
requested preview is the verified 37ff7d4 deployment recorded above.

D3's reported camera-off/responsiveness observations are retained. This later paste does not
establish whether D3's workload was the stress profile, the small benchmark, or whether a later
benchmark replaced shared results. Stress-specific completion and all stress timings remain
unconfirmed pending the correct report. No cancellation, live-camera, storage or privacy pass is
inferred. The next request identifies the exact stress button and completion status.


### D5 — iPhone 100×50 synthetic stress report

Source: **user-pasted application JSON reported from the physical-device session**, recorded 2026-10-26 14:40 UTC.
After the request explicitly identified the stress-profile button and completion status, the
user supplied the report below. This confirms the correct workload/result exists, without
resolving which earlier job D3 ran. The build ID remains Unknown: the pasted result does not
independently attest source, although the supplied testing URL is the approved preview recorded
above. Preserve the UA as reported; do not replace D1's OS confirmation with a UA token.

```json
{
  "source": "synthetic numeric stress fixture",
  "fixtureVersion": 1,
  "detectorInference": "not run",
  "camera": "not used",
  "config": {
    "modelFloor": 0.05,
    "trackingFloor": 0.25
  },
  "syntheticScore": 0.8,
  "warmupFrames": 184,
  "samples": 50,
  "syntheticStepMs": 5,
  "liveTracks": 100,
  "activeTracks": 50,
  "lostTracks": 50,
  "retainedSamples": 10150,
  "detectionsPerFrame": 50,
  "updateIncludingReturnCopy": {
    "p50": 4,
    "p95": 5,
    "max": 5
  },
  "explicitSnapshotCopy": {
    "p50": 0,
    "p95": 1,
    "max": 1
  },
  "combined": {
    "p50": 4.5,
    "p95": 5,
    "max": 5
  },
  "observedLongTasks": {
    "supported": false,
    "entries": [],
    "dropped": 0
  },
  "measurementIntervalMs": {
    "start": 8747,
    "end": 9339
  },
  "elapsedMs": 2235,
  "browser": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0.1 Mobile/15E148 Safari/604.1",
  "hardwareConcurrency": 4,
  "buildId": "Unknown",
  "investigationBudgetMs": 8,
  "clockStepMs": 1,
  "budgetWindowMs": 1,
  "budgetWindowSource": "observed clock step",
  "budgetResult": "within"
}
```

## Remaining gate

Remaining physical checks stay Pending unless supported by the observations above. This ledger does not close Phase 2, accept new limitations,
authorize merging or authorize another deployment.
