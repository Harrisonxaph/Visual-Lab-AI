# Phase 2 physical-device validation — 2026-10-26

Status: **In progress; Phase 2 not accepted or closed.** iPhone pre-Start observations, small benchmark and numeric stress results have been supplied; validation is in progress with an unresolved missing-box report (D12). Remaining checks are Pending. This is a documentation-only validation branch; its commits are not
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
[stress-profile procedure](../phases/PHASE_2_STRESS_PROFILE.md). Device requests are now milestone-based (D15), with the approved preview URL and fixed/batched
answer choices. Preserve partial iPhone evidence, then test iPad at the device acceptance gate;
confirm current versions and conditions. Do not mark a check passed from an unanswered template.

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
| Charging / Low Power Mode / battery / warmth / other workload | D5 stress run: not charging, Low Power Mode off (D6); battery/warmth/other workload Pending | Pending |

## Physical checklist

Every cell starts Pending. A partial result covers only the steps actually reported.

| Check | iPhone | iPad |
| --- | --- | --- |
| Fresh page: Idle, camera inactive, no prompt before Start | User-reported Pass (D2; tab closure not separately confirmed) | Pending |
| Camera-off stress profile: counts/config/environment, full timing distributions | Correct 100×50 stress report supplied (D5); D3 observations retained separately | Pending |
| Clock step, uncertainty window/source, verdict, startup responsiveness | Step/window 1 ms observed, within, update p95 5 ms (D5); quantified startup delay Pending | Pending |
| Stress cancellation/retry; Start/Resume/hide/page-exit cancellation | Manual Cancel (D7) and Start cancellation (D8) passed; phase-specific/Resume/hide/page-exit paths Pending | Pending |
| Start/consent, live boxes, confirmed IDs; running/loading profile gate | Live video/conditional prompt timing (D8), labels/confidence/public IDs and running profile gate (D9) reported Pass; loading gate not separately observed | Pending |
| Single-object ID continuity (30 seconds) | User-reported Pass (D10); qualitative, not independently timed | Pending |
| Two-object motion/crossing qualitative observation | Pending | Pending |
| Brief loss/reacquisition and longer expiry | Unresolved missing-box report during this request (D12); test not passed, cause unknown | Pending |
| Tap/list selection, inspector/events/history/chart gaps | Both selection methods, inspector and confidence history reported Pass (D11); loss/event/gap checks Pending | Pending |
| Trails Off / 2 / 5 / 10 seconds; no bridging gaps | All duration settings reported Pass (D11); gap handling Pending | Pending |
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
For D5, not charging and Low Power Mode off are user-confirmed in D6; battery, warmth,
other workload and exact physical test time remain Pending.
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


### D6 — iPhone stress-run power conditions

Source: **user-reported physical observation**, recorded 2026-10-26 14:47 UTC.
Asked about the just-supplied D5 stress run, the user selected **A**: not charging; Low Power Mode
off. This confirmation applies to that run only. Battery, warmth and other workload were not
supplied and remain Pending; no thermal or energy inference is made.


### D7 — iPhone manual stress-profile cancellation

Source: **user-reported physical observation**, recorded 2026-10-26 14:50 UTC.
After instructions to rerun the stress profile and immediately tap Cancel benchmark/profile,
the user selected **A**: cancelled; results cleared; camera stayed off. Record a manual Cancel
pass for that attempt. Warmup versus measurement phase was not identified, so do not claim both
phases were exercised. Retry to completion, Start/Resume, background and page-exit cancellation
remain Pending. This is not a new numeric timing run or a camera-privacy/network finding.


### D8 — iPhone Start cancels synthetic stress and opens camera

Source: **user-reported physical observation**, recorded 2026-10-26 14:54 UTC.
The requested sequence was stress profile then immediate Start camera, allowing permission if
prompted. The user selected **A**: profile cancelled and results cleared; live video started;
any permission prompt appeared only after Start. This is conditional prompt-timing evidence;
the reply does not establish that a new permission prompt was actually shown. Labelled boxes,
confirmed IDs, gate-disabled states and inference metrics were not yet reported. No claim is made
about loading Stop/background interruptions or about cancellation in both profile phases.


### D9 — iPhone live detections, public IDs and running profile gate

Source: **user-reported physical observation**, recorded 2026-10-26 15:03 UTC.
The user selected **A**: labels, confidence and IDs visible; stress-profile button disabled.
Instructions requested a well-lit cup, bottle or book and about 10 seconds of observation, with
an ID on the box or track list. The actual object/label, numeric ID, confidence, inference/FPS
values and wait duration were not separately supplied. Record visibility and running gate as
reported passes, not measured confirmation latency, ground-truth detection accuracy or stable
tracking duration. The loading gate remains unobserved; no loading regression pass is inferred.


### D10 — iPhone single-object ID continuity

Source: **user-reported physical observation**, recorded 2026-10-26 15:20 UTC.
The outstanding request asked the user to move one detected object slowly within the frame for
30 seconds, keeping it visible, separate from other objects and in the same phone orientation.
After a status discussion that explicitly retained this pending check, the user replied **A**.
Interpret A against that outstanding fixed-choice request: box stayed visible and the same ID
persisted throughout. This interpretation was stated back to the user. Record a qualitative
user-reported pass for the requested duration, not independently timed tracking, objective
accuracy, a measured fragmentation/switch rate or re-identification. Object class, numeric ID and
confidence values were not supplied; no extra pass is inferred.


### D11 — iPhone grouped selection, inspector/chart and trajectory controls

Source: **user-reported physical observation**, recorded 2026-10-26 15:25 UTC.
The user selected **A** for the grouped instructions: both track-list selection and tapping a
video box worked; Object inspector showed selected ID/class/confidence; Confidence over time
showed history; Off/2 s/5 s/10 s trajectory settings worked while gently moving the object.
Record these as qualitative reported passes. No exact confidence series, selected numeric ID,
trajectory-length measurement, event reason or intentional interruption was supplied. History
and trail gap handling remain Pending; a working chart is not evidence that gaps are preserved.


### D12 — iPhone missing-box report; investigation pending

Source: **user-reported physical observation**, recorded 2026-10-26 15:27 UTC.
Verbatim: **"Boxes not showing on inference"**.
This followed the grouped brief/long cover and gap-cleanup request. The reply does not identify
which step was performed, current Lab status, display threshold/counts, video motion, object,
error message or whether inference is actually advancing. Prior D9–D11 observations remain
historical evidence; no loss/recovery, expiry or gap-handling pass is inferred from this report.
Pause the checklist for triage and reproduction. Possible state/filter/model-output/rendering
causes are not yet distinguished. No cause, runtime defect or corrective fix is established.
Initial request asks for current status/video without reloading or changing controls, to preserve
state. No deployment, settings change or new camera-media collection is authorized or performed.


### D13 — Missing-box triage: Running and moving video

Source: **user-reported physical observation**, recorded 2026-10-26 15:30 UTC.
In response to instructions to uncover the object, keep it in view, and avoid reload/Stop/Start,
the user selected **A**: status Running, video moves, but no boxes. This confirms the reported
UI/video state, not ongoing inference-frame completion. Current threshold, visible count,
processing cadence, stale-analysis indication and detector outputs remain unknown. No error
message was reported. D12 remains unresolved; no filter, worker or rendering cause is established.


### D14 — Missing boxes with LIVE INPUT and six objects reported below

Source: **user-reported physical observation**, recorded 2026-10-26 15:38 UTC.
Verbatim: **"D. Life input with no boxes. Below marked 6 objects but nothing in camera"**.
The preceding request distinguished the Visible detections metric and video status label. The
user chose D (different wording / uncertainty) and described LIVE INPUT (typed "Life input")
and six objects below. Preserve ambiguity: the reply does not explicitly identify whether six
is the current Visible detections metric, retained Tracks, or another object list. Do not infer
six current draw-ready detections or a proven rendering failure yet. D12 remains unresolved;
no threshold/restart intervention has been requested or reported at this point.


### D15 — User-directed milestone-based testing; continuous prompts stopped

Source: **explicit user workflow instruction**, recorded 2026-10-26 15:45 UTC.
Verbatim: **"Move to milestone-based testing instead of constant manual testing."**
This is a workflow decision, not a device observation, pass, waiver or approval of a known limit.
Stop the current stream of device questions, including the unanswered current-count clarification.
Preserve D12–D14 as unresolved: six objects below has not been identified as the current Visible
detections metric versus retained track history, and no rendering/worker/filter cause is proven.
No new physical-device check is requested now. First investigate material issues in code/automation;
request only minimal user-only evidence at a justified blocker checkpoint if necessary. Otherwise
use one consolidated iPhone acceptance session, then one on iPad for the stable authorized build,
and a final evidence/closeout review. Reuse unaffected observations; retest relevant behaviour
only when a material fix warrants it. See the updated testing plan for M1/M2/M3 gate status.
All existing Pending checks, accepted Phase 1 limitations and authorization boundaries remain.
The one-preview authorization is consumed; no merge, further deployment or Phase 3 is approved.

## Remaining gate

Missing boxes (D12) remains unresolved pending state inspection/reproduction; no Phase 2
readiness claim is made. Remaining physical checks stay Pending unless supported by the observations above. This ledger does not close Phase 2, accept new limitations,
authorize merging or authorize another deployment.
