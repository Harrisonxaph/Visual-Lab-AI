# Phase 1 privacy preview validation — 2026-10-24

Status: **in progress; fresh-tab checks Pass on both devices within stated evidence limits; remaining validation gaps and offline-message fix outstanding**. This ledger is separate from the earlier
[device walkthrough](PHASE_1_DEVICES_2026-10-24.md). A clean retest cannot explain S1/S2.

## Authorization and exact build

The user authorized one temporary preview of the verified merged commit containing PR #4.
Production, deployment protection and disabled automatic Git deployments must stay unchanged.
No public sharing link, merge or Phase 2 is authorized.

- PR #4 merged at 2026-10-24 21:03:36 UTC.
- Exact main/source commit: `edea505daeb12c69ea8ca6c09a76c86ab1d37cdf`.
- [Main push CI 40132543749](https://github.com/Harrisonxaph/Visual-Lab-AI/actions/runs/40132543749): success.
  GitHub job inspection confirmed install, asset preparation, Chromium install, typecheck,
  formatting, unit tests, browser tests, build and production tests all succeeded. Failure-only
  artifact upload was skipped as expected. These are automated results, not physical evidence.
- Preview: https://visual-lab-3luq4khke-harrisonjbailey-3896.vercel.app
- Diagnostic entry: https://visual-lab-3luq4khke-harrisonjbailey-3896.vercel.app/?diag=1
- Deployment ID: `dpl_FDGV8Xaz1VJF5r9vk3gXPS5gr1CC`.
- Target: preview (`target: null`), pinned GitHub source SHA as above. Build status: **READY**, confirmed from Vercel deployment metadata.
- Validation branch: `validation/phase-1-privacy-preview`.

Before deployment, Vercel project inspection confirmed `visual-lab-ai` in team
`team_VehoPCybYSxaOFFrmTcXn0jN`, project `prj_6uGItgPOAj9FeiAc6oVp5GdvWWYI`.
SSO protection was enabled for `all_except_custom_domains`; password/trusted-IP protection was
not enabled. A read-only before/after comparison confirmed those protection settings and the project
domain list unchanged. No project settings or
production promotion/alias mutation was requested by the deployment call. The source retains
`git.deploymentEnabled: false`.

## Evidence boundaries

Follow [the focused checklist](../phases/PHASE_1_PRIVACY.md). Local/CI header and Chromium tests
establish behavior of the tested build/runtime, not authenticated Vercel response headers or
Safari support. Old physical results belong to the older preview SHA `861132f` and are not passes
for this policy/diagnostic build. New physical results must be explicitly user-reported unless
directly observed, with errors and unanswered fields preserved.

Diagnostics observe this document after installation; other tabs/realms, earlier or cached-reference
calls and worker CSP events are outside that coverage. A CSP violation shows an observed blocked
attempt, not that a script requested camera access or caused historical S1/S2. An empty log is not
proof no injection occurred. Same-origin connections remain allowed; network privacy inspection
is a separate pending check, not inferred from UI or CSP.

## Effective deployed headers and HTML

Pending authenticated access. No authenticated local browser/CLI session is available; the
sharing-link connector path must not be used because public sharing links are not authorized.
Record protection/login responses separately from authenticated app responses. Do not call a
login document's scripts or CSP evidence of injection/policy conflicts in the app.

| Resource | Effective app CSP / additional policy verification |
| --- | --- |
| Page `/` and `/?diag=1` | Pending |
| `/camera-diagnostics.js` and `.css` | Pending |
| App JS and CSS | Pending |
| Detector worker JS | Pending |
| `/wasm/vision_wasm_internal.js` | Pending |
| `/wasm/vision_wasm_nosimd_internal.js` | Pending |
| Both WASM binaries | Pending |
| `/models/efficientdet_lite0.tflite` | Pending |
| Authenticated HTML, script inventory/order | Pending |
| Protection/login policy and redirects | Observed read-only: preview 302 → SSO 307 → login 200; app policies remain inaccessible |

A read-only ordinary HTTPS request to this new preview was redirected to protection/login,
without an authenticated app response. The preview's 302 carried no enforcing/report-only CSP;
SSO's 307 and login's 200 each carried one enforcing CSP and no report-only CSP. The login policy
lists default/script/child/style/image/media/connect/font/frame-ancestors/worker directives. It is
a policy on a different document, not an additional authenticated app policy. No app policy
conflict can be established or excluded by these responses. Do not mark absent CSP on an auth
redirect as absence on the app. Redirect query values and cookies were not recorded. Further
unauthenticated resource probes would not establish the protected headers, so app/asset checks
remain Pending until authorized authenticated access is available.

Only an actual app response can establish effective app headers. Record every enforcing and
report-only policy; do not weaken protection or policy to obtain access. Deployment metadata/source
configuration alone does not prove response headers.

## Physical checklist — new build

User-reported metadata carried forward, not independently inspected:

| Device | OS | Browser | Exact Safari build |
| --- | --- | --- | --- |
| iPhone 15 Pro | iOS 27.0.1 | Safari | Not supplied |
| iPad Pro 11-inch, 3rd generation | iPadOS 26.6.2 | Safari | Not supplied |

| Check | iPhone | iPad |
| --- | --- | --- |
| Fresh diagnostic tab: Idle, indicator off, no camera-request before Start; record CSP events | Pass — user-reported sequence, shared diagnostic log and other-device equivalence in P27; blocked Vercel script replaces initial no-CSP report; coverage limits apply | Pass — reported Idle/indicator off, prompt after Start, shared log/other-device equivalence (P14–P17/P27); coverage limits apply |
| Non-diagnostic fresh-tab comparison | Pending | Pending |
| Prompt site identity and post-Start acquisition | Partial — post-Start sequence confirmed (P2–P4); prompt site identity unprovided | Partial — prompt after Start and live video/labelled detections after allowing confirmed (P16/P17); site identity unprovided |
| Stop during permission request, if Safari permits interaction | Pending — accessibility not checked on this device | Blocked — permission modal prevents page interaction (P25); cancellation path not exercised |
| Stop while model loading; no late activation, explicit recovery | Pending — Loading not observed; reported 45-second camera-off period and restart recorded separately (P5) | Pending — loading too brief to interrupt (P24) |
| Background while permission pending | Pass — popup persisted on return; manual Resume required for inference, user-reported (P6/P7) | Pass — popup persisted; paused after Allow, manual Resume required (P18), user-reported |
| Background while model loading pending | Pending — loading window not exercised | Pending |
| Permission-denied message, inactive indicator and recovery | Pending on new preview; older-preview evidence retained separately | Pass — error reported same as iPhone, indicator off, recovery worked (P19); no fresh verbatim transcription |
| Navigate away and return inactive until Start | Pending on new preview; older-preview evidence retained separately | Pass — indicator off on leaving and return until Start, user-reported (P19) |
| Empty/plain surface and multiple objects | Pass for reported behavior — counts 0 / 4, boxes updated, slider/scroll responsive; labels unprovided (P8) | Pass for reported behavior — counts 0 / 2, boxes updated; labels unprovided (P20) |
| Private Browsing operation; distinguish actual storage restriction | Pass for Private Browsing operation, user-reported (P9); actual storage denial untested | Pass for Private Browsing operation, user-reported (P21); actual storage denial untested |
| Cold-cache network/model failure and recovery | Pass for reported offline error/retry sequence — camera did not activate offline; explicit Start recovered at displayed 50 ms (P10–P12). Specific model-download failure/cache state unverified | Partial — photographed Error/CAMERA OFF UI and error wording, explicit Start recovery reported; system indicator unobserved (P22/P23); resource/cache unverified |
| Feasible external camera interruption | Pending — user reports not tested (P26) | Pending — user reports not tested (P26) |
| Live preview, detections, threshold, rotation and lifecycle under new policy | Pass for user-reported behavior across P8/P9/P12/P13; effective deployed headers still uninspected | Pass for reported video/detections, responsive slider, rotation and lifecycle (P17/P20); effective headers uninspected |
| Zoom, or explicit Not applicable reason | Pass for reported pinch zoom (P13); Safari Page Zoom setting not tested | Pass for reported pinch zoom (P20); Safari Page Zoom setting not tested |
| Physical-session network inspection | Pending | Pending |

Supplementary comparison: [O6 in the later focused ledger](PHASE_1_OFFLINE_RETEST_2026-10-25.md)
records a user-reported plain-link pass on source `063a97a` without diagnostics. Device(s) were
not specified and all-tab closure was not confirmed. The per-device comparison rows above remain
unassigned; do not convert this one unspecified report into two device passes or a request log.
P1/P27 and their original evidence are preserved below.

## Session log

### P1 — Reported pre-Start activity; changed device details unknown (2026-10-24)

Source: **user-reported physical observation**, following the requested fresh-tab iPhone sequence.
However, the user explicitly answered that device/OS details were not unchanged. The actual current
device/OS/browser is **unknown**; do not assign this result to either carried-forward device row.
Requested preview/source is recorded above; on-device URL and exact timestamp were not supplied.

The user pasted the diagnostic panel's heading/explanation, then:

```text
Device/OS unchanged: no
Lab status:
Camera indicator before Start: yes
Permission prompt before Start: yes
Diagnostic panel shows installed or unavailable: yes
Number of camera-request entries: 1
CSP-violation entries: none
```

This is a reported pre-Start gate failure requiring investigation, not a reproduced source-level
cause. Diagnostic explanatory text was visible, but "yes" does not establish whether installation
status was installed or unavailable. The camera-request count is user-reported; the actual request
record, stack, elapsed time, activation, sinceStartMs and any start-click records were not supplied.
Lab status is unanswered. No CSP violations were reported, which cannot exclude earlier events or
unobserved contexts. Prompt site identity, whether any Start interaction occurred before the copied
state, and baseline indicator state before opening the page remain unconfirmed. Do not claim the
new report explains S1/S2 or that the app/runtime caused the prompt before reading actual records.

Next evidence: current device/OS/browser, complete visible diagnostic JSON (installation,
start-click, camera-request/stack and settlement), permission prompt site identity and explicit
confirmation of no Start interaction. No screenshots containing camera footage are requested.
No runtime change, redeployment or speculative fix was made. Carried-forward device matrix rows
remain Pending until session identity and records are clarified.

### P2 — Permission prompt timing corrected (2026-10-24)

Source: **user-reported clarification** of P1. After an explanation distinguishing expected
post-Start permission from unexpected pre-Start permission, the user was asked whether the popup
appeared before or after tapping Start and answered: "After tapping".

Correct the P1 prompt interpretation: this session's permission prompt followed Start and is
expected. P1 is **not evidence of a pre-Start prompt**. Preserve the original answers above as
history, not a confirmed failure. The indicator and single request may have been observed after
Start too, but their actual timing was not explicitly corrected; keep that distinction pending.
The visible JSON and current device details remain unprovided. This clarification does not
retroactively settle the separate historical S1/S2 reports. No runtime fix or redeployment was
needed for the corrected prompt observation.

Next: clarify whether the indicator/request were also observed after Start and whether the same
iPhone/OS/browser is still in use, then obtain actual diagnostic entries before interpreting the
sequence or marking the fresh-tab gate passed.

### P3 — Indicator and request timing corrected (2026-10-24)

Source: **user-reported clarification** of P1/P2. Asked whether the green camera indicator and
single camera-request entry also appeared only after tapping Start, the user answered: "Yes".

Together with P2, this corrects the session: permission prompt, indicator and camera request all
followed Start. The initially reported pre-Start activity in P1 is superseded by explicit timing
clarifications and is **not a confirmed failure**. Record a user-reported pass for acquisition
sequence in this session, with actual JSON and current device identity still unprovided. Do not
assign it to an iPhone/iPad matrix row until the changed-device answer is clarified. No application
bug was reproduced or fixed, and no redeployment occurred. The distinct historical S1/S2 reports
remain documented; this session's clarification does not automatically resolve them.

Next: establish current device/OS/browser, then continue the remaining focused device checks.

### P4 — Device identity corrected (2026-10-24)

Source: **user-reported clarification**. Asked whether the session still uses iPhone 15 Pro,
iOS 27.0.1 and Safari or those details changed, the user answered: "I haven't changed anything."

Attribute P1–P3 to that same user-reported iPhone setup, superseding P1's unchanged-details "no".
The current session's prompt, indicator and camera request are explicitly confirmed after Start;
no CSP entries were reported. The actual diagnostic JSON, installed/unavailable state, initial
Idle and prompt website identity remain unprovided, so the full fresh-tab evidence check stays
partial. No runtime fix or redeployment was made. Earlier S1/S2 are preserved as separate reports.
Next: Stop during model loading, where the loading state can actually be observed.

### P5 — iPhone loading-Stop attempt; loading not observed (2026-10-24)

Source: **user-reported physical observation**, same iPhone 15 Pro / iOS 27.0.1 / Safari as P4,
requested privacy preview and commit above. Exact timestamp was not supplied.

Verbatim response:

```text
Stopped while Loading was visible: no loading shown, camera turned on straight after approving prompt
Camera stayed off for 45 seconds:yes
Start restored live video and detections: yes
Any error:
```

The user did not observe Loading; therefore Stop during model loading was **not exercised** and
remains Pending. Live video appearing after permission does not establish when model initialization
completed. Record the separately reported 45-second camera-off period and successful Start restoring
video/detections; do not infer a loading cancellation sequence from those answers. The precise Stop
interaction was not supplied. Blank error wording is no additional detail, not a blanket error-free
claim. No runtime failure was reproduced, fix made or preview redeployed. Next: background while
the permission request is pending, where Safari permits it, retaining untestable steps as Pending.

### P6 — iPhone background during permission request; completion state unclear (2026-10-24)

Source: **user-reported physical observation**, same iPhone context as P4/P5 and requested preview
above. Actual background duration and exact timestamp were not supplied.

Verbatim response:

```text
Could leave Safari while permission was pending: yes
Popup still present on return: yes
Lab status after allowing access: still at prompt
Did detections start automatically: following prompt
Any error or unexpected behavior: no
```

Record that leaving Safari with permission pending was feasible, the permission popup remained on
return and no error/unexpected behavior was reported. Do not interpret "still at prompt" as a
lab state, or "following prompt" as either explicit Resume or automatic inference. Whether Allow
was completed, whether labelled detections then started without Resume, and the displayed lab
status are unclear. Background-startup completion remains **partial/pending clarification**, not
passed. If detections began after Allow without Resume, investigate against the documented startup
pause requirement; do not claim a source-level reproduction or fix from this ambiguous wording.
Model-loading background behavior remains untested. No runtime changes or deployments were made.
Next: obtain the precise post-Allow lab state and whether Resume was needed.

### P7 — Manual Resume required after permission-background sequence (2026-10-24)

Source: **user-reported clarification**, same iPhone and requested preview/build as P6.
Asked whether labelled detections appeared after Allow without Resume or required explicit
Resume, the user answered: "Had to manually resume inference".

This resolves P6's completion-state ambiguity: inference required explicit manual Resume after
the permission-pending background/return sequence. Record a user-reported pass for that sequence;
no exact displayed status or diagnostic JSON was supplied, so do not fabricate those details.
This does not exercise backgrounding during model loading; that separate check remains Pending.
No runtime fix, automated test or redeployment was needed for this clarification. Next: plain-scene
and multiple-object behavior in the iPhone preview, then remaining feasible checks.

### P8 — iPhone plain surface and multiple objects (2026-10-24)

Source: **user-reported physical observation**, same iPhone context and requested privacy preview
above. Requested threshold was 50%, with about 30 seconds per scene; actual threshold and durations
were not separately confirmed. Exact timestamp and class names were not supplied.

Verbatim response:

```text
Plain surface: detected labels/count:0
Multiple objects: detected labels/count:4
Boxes updated as objects moved out of view:yes
Slider and scrolling remained responsive: yes
Any error or frozen boxes: no
```

Record a user-reported behavioral pass: zero detections reported on the plain surface, four with
multiple objects, boxes updating as objects left view, responsive slider/scrolling and no reported
errors/frozen boxes. Individual labels, true object counts and ground truth were not supplied;
these observations do not establish accuracy, class correctness or recall. No runtime fix,
automated test or deployment was made. Next: Private Browsing operation; actual storage denial
must not be inferred merely from use of a private tab.

User preference for subsequent guidance: include the current Vercel preview link with every test
request so it remains easy to find.

### P9 — iPhone Private Browsing operation (2026-10-24)

Source: **user-reported physical observation**, same iPhone context and requested privacy preview.
Exact on-device timestamp and independent browser mode inspection were not supplied.

Verbatim response:

```text
Preview opened in Private Browsing: yes
Live video and detections worked: yes
Threshold slider worked: yes
After reload, Start worked again: yes
Stop turned camera indicator off: yes
Any error: no
```

Record user-reported passes for preview operation in Private Browsing, live video/detections,
threshold control, startup after reload and visible camera indicator off after Stop, with no
reported errors. Private Browsing does not establish actual storage access denial; that physical
restriction case remains untested and separate from automated mocked-storage evidence. No runtime
fix, automated test or deployment was made. Next: attempt cold-session model/network failure if
feasible, retaining cached-success cases as untested failure paths rather than failures.

### P10 — iPhone offline attempt: worker-stop error (2026-10-24)

Source: **user-reported physical observation**, same iPhone context and requested privacy preview.
The requested procedure was a fresh Private Browsing session, shell loaded online before Start,
Airplane Mode with Wi-Fi off, then Start, followed by reconnect/retry. Actual cache state, full
step compliance, time to error and failing resource were not independently inspected.

Verbatim response:

```text
The inference worker stopped. This browser may not support the model. Try starting again.

Camera did not change until aeroplane mode disabled and reconnected
```

Record the exact worker-stop error as an observed offline-attempt error, not proof of browser/model
incompatibility. Without resource/network inspection, it is unknown whether worker code, a loader,
WASM or model retrieval failed; do not label this specifically a model-download failure. "Camera
did not change" does not establish live versus frozen/absent preview or camera indicator/track
state. Error cleanup and post-reconnection recovery remain **unconfirmed**. This may warrant
investigation if camera access remained active after the error, but no source-level failure is
reproduced from the present wording. No fix, automated test or redeployment was made. Next: clarify
indicator state after the error and whether recovery required Start after reconnection.

### P11 — Offline camera wording corrected; inference restart reported (2026-10-24)

Source: **user-reported clarification**, same iPhone and requested preview context.
Verbatim: "Inference started again at 50. Camera did not activate, I meant".

Correct P10's ambiguous camera wording: the user meant the camera **did not activate**, not that
it remained active or that the image froze. No independent track inspection or explicit indicator
state was supplied; do not fabricate one. Record that inference restarted in the reconnection
context, but whether restart was automatic or followed Start/reload is still unknown. "At 50"
has no specified unit and must not be recorded as 50 ms, 50 FPS or 50% threshold without
clarification. The failed offline resource remains unknown. No confirmed persistent-camera defect
is established by this corrected report. No runtime fix, test or deployment was made.

### P12 — Explicit offline recovery and timing clarified (2026-10-24)

Source: **user-reported clarification**, same iPhone and requested privacy preview context.
Asked whether recovery followed Start and whether "50" meant inference milliseconds or threshold,
the user answered: "After start, and 50 ms".

Combine P10–P12 as a user-reported offline error/retry sequence: worker-stop error offline,
camera did not activate in that attempt, and after connectivity returned explicit Start restored
inference with displayed inference time **50 ms**. No automatic recovery is claimed. This is a
single display observation, not a sustained benchmark. The exact failed resource and cold-cache
condition remain unverified; do not call it a specifically reproduced model-download failure.
No persistent-camera defect was established, and no runtime fix, automated test or redeployment
was made. Next: feasible external interruption, then page zoom/remaining device smoke checks;
untested interruption paths stay Pending or receive a justified Not applicable status.

### P13 — iPhone rotation, pinch zoom and lifecycle smoke check (2026-10-24)

Source: **user-reported physical observation**, same iPhone 15 Pro / iOS 27.0.1 / Safari and
requested privacy preview/build above. Exact timestamp and actual threshold were not supplied.

Verbatim response:

```text
Boxes aligned after both rotations: yes
Page zoom: tested with pinch zoom, worked
Pause and Resume worked: yes
Stop turned camera indicator off: yes
Any issue: no
```

Record reported passes for box alignment after landscape/portrait rotations, pinch zoom operation,
Pause/Resume and visible camera indicator off after Stop, with no reported issue. Pinch zoom is
the mechanism actually tested; Safari's Page Zoom setting and exact scale were not tested or
supplied. This is physical UI evidence, not inspection of effective response headers or network
privacy. No runtime fix, automated test or deployment was made. Remaining iPhone gaps (including
actual diagnostic JSON, model-loading interruptions, feasible external interruption and
network/header inspection) retain their recorded status. Next: iPad fresh-tab diagnostic gate on
the same approved preview; do not reuse old-preview iPad observations as passes for this build.

### P14 — Initial iPad fresh-tab report; diagnostic details unclear (2026-10-25)

Source: **user-reported physical observation**, iPad Pro 11-inch (3rd generation), iPadOS 26.6.2,
Safari; device/OS/browser confirmed unchanged. Requested privacy preview/build as above; exact
on-device timestamp and address inspection were not supplied.

Verbatim response:

```text
Device/OS/browser unchanged: unchanged
Lab status before Start: idle
Camera indicator before Start: off
Permission prompt before Start:present
Diagnostic JSON event: unsure - please clarify
Camera-request entries before Start: number 1
CSP-violation entries: none, or paste directive and blockedAddress
```

Record reported Idle and camera indicator off before Start. A permission prompt and one request
are reportedly before Start, requiring actual diagnostic records and sequence clarification.
Do not interpret a single entry count as a camera request without its event name; the installation
record can be mistaken for a request. The installation state is unknown. The unchanged CSP template
is **unanswered**, not a report of no violations. This is a possible gate discrepancy, not a
confirmed source-level failure or an explanation of historical S1/S2. Next: explain the event
field and obtain visible JSON without reloading/clearing, plus prompt site identity and explicit
Start timing. No runtime change, test or deployment was made.

### P15 — iPad pasted diagnostic entries: blocked Vercel script, later Start (2026-10-25)

Source: **user-supplied diagnostic text from the physical session**, not independently retrieved
or inspected. Same iPad context and requested preview/build as P14. User pasted three entries:

```json
[
  {
    "event": "installed",
    "at": "2026-10-25T00:26:51.360Z",
    "elapsedMs": 0,
    "active": false,
    "hasBeenActive": false,
    "context": "top-level page"
  },
  {
    "event": "csp-violation",
    "at": "2026-10-25T00:26:51.363Z",
    "elapsedMs": 3,
    "directive": "script-src-elem",
    "blockedAddress": "https://vercel.live/_next-live/feedback/feedback.js",
    "disposition": "enforce",
    "trusted": true
  },
  {
    "event": "start-click",
    "at": "2026-10-25T00:28:15.580Z",
    "elapsedMs": 84222,
    "trusted": true,
    "active": true,
    "hasBeenActive": true
  }
]
```

The pasted text establishes reported installation and a browser-trusted enforcing script-src-elem
violation naming Vercel's feedback script at +3 ms, followed by a trusted Start click at +84,222 ms.
There is **no camera-request entry in the supplied text**, so P14's count of one cannot currently
be treated as evidence of a camera request. Do not infer omitted entries or that this was the full
session log. This is evidence of a blocked script attempt in the present iPad session, not proof
that the script requested camera access, caused historical S1/S2, or ran in the earlier preview.
It does not replace authenticated HTML inspection or prove all deployed asset headers.

The user has not yet answered whether the permission popup was before or after the actual Start
click. That remains unresolved; there is also no post-Start camera-request or settlement record
to establish acquisition. Next: clarify prompt timing relative to Start and, if needed, whether
video/detections began. No runtime fix, test or deployment was made.

Review annotation (2026-10-25): P15 was **likely cut short when copied**, according to the supplied
review correction. This is an inference, not proven; preserve the pasted entries as supplied and
do not invent missing camera-request/settlement records. The user subsequently identified the same pasted log as the evidence intended for P27; see that
entry for provenance and cross-device reporting limits.

### P16 — iPad prompt timing corrected to after Start (2026-10-25)

Source: **user-reported clarification**, same iPad and requested privacy preview context.
Asked whether the popup appeared before or after the logged Start tap, and whether live
video/detections then appeared, the user answered: "After".

This explicitly corrects P14's prompt timing: permission appeared **after Start**, as expected.
Combined with reported Idle/indicator off and the supplied log lacking a pre-Start camera-request,
record a user-reported fresh-tab gate pass within the diagnostic coverage limits. P14 is not a
confirmed pre-Start permission failure. The separate live-video/detections question was not
answered; successful acquisition, prompt site identity and post-Start camera records remain
unprovided. A blocked Vercel script remains evidenced by P15, without any claim about historical
camera causation. No runtime change, test or deployment was made. Next: confirm post-Allow live
video/detections, then continue iPad startup-interruption checks.

### P17 — iPad live video and labelled detections confirmed (2026-10-25)

Source: **user-reported physical observation**, same iPad and requested privacy preview context.
Asked whether live video and labelled detection boxes appeared after allowing camera access,
the user answered: "Yes".

Record successful post-Allow video and labelled detections as user-reported. No inference/FPS,
class names or post-Start diagnostic JSON were supplied. Prompt site identity remains unprovided.
This confirms operation under this preview but does not independently verify all response headers
or explain historical S1/S2. No runtime change, test or deployment was made. Next: background
while the iPad permission request is pending, with post-Allow manual Resume behavior observed.

### P18 — iPad background during pending permission (2026-10-25)

Source: **user-reported physical observation**, same iPad and requested privacy preview context.
Requested background duration was 15 seconds; actual duration and exact timestamp were not supplied.

Verbatim response:

```text
Could leave Safari with permission pending: yes
Popup remained on return: yes
After allowing, inference: paused
Had to tap Resume for detection boxes: yes
Any error:
```

Record a user-reported pass for leaving Safari while permission was pending, popup persistence,
paused inference after Allow and explicit Resume required for detection boxes. Blank error wording
supplies no additional detail. This does not exercise backgrounding during model loading or Stop
while permission is pending; those remain Pending. No runtime change, automated test or deployment
was made. Next: fill the iPad denial-message and navigation-return evidence gaps.

### P19 — iPad denial/recovery and navigation-return gaps addressed (2026-10-25)

Source: **user-reported physical observation**, same iPad and requested privacy preview context.
Exact timestamp was not supplied.

Verbatim response:

```text
Permission-denied error, exact wording: same as with iphone
Camera indicator stayed off when denied: yes
After restoring permission, detections worked: yes
Navigating away turned camera indicator off: yes
On returning, camera stayed off until Start: yes
```

Record passes for reported denial explanation matching the iPhone message, indicator off when
denied, successful permission recovery, indicator off on navigation away and remaining off on
return until explicit Start. The earlier iPhone denial message was reported as "camera access was
denied, allow in your browser settings then try again." The iPad wording is supplied **by reference**,
not a fresh verbatim transcription; preserve that evidence distinction. These observations address
the two previously unanswered iPad questions without rewriting their original historical entries.
No track internals or network activity were inspected. No runtime change, automated test or
deployment was made. Next: iPad plain/multiple scene and layout/control smoke checks.

### P20 — iPad scene, layout and lifecycle smoke checks (2026-10-25)

Source: **user-reported physical observation**, same iPad and requested privacy preview context.
Requested settings were 50% threshold and about 30 seconds per scene; actual threshold/durations
and exact timestamp were not separately supplied. A repeated P19 answer preceded this report;
it was acknowledged as duplicate evidence and not counted as an additional test.

Verbatim response:

```text
Plain surface detection count: 0
Multiple-object count and labels: 2
Boxes updated when objects left view:yes
Rotation alignment and pinch zoom worked: yes
Slider and scrolling responsive: yes
Pause/Resume worked; Stop turned indicator off: yes
Any issue:
```

Record passes for reported scene behavior (zero plain-surface detections, two with multiple
objects), box updates as objects left view, rotation alignment, pinch zoom, responsive
slider/scrolling, Pause/Resume and visible indicator off after Stop. Labels were not supplied;
counts do not establish class correctness, accuracy or recall. Pinch zoom is the actual zoom
mechanism tested, not Safari Page Zoom settings. Blank issue wording supplies no additional
detail. No runtime fix, automated test or deployment was made. Next: Private Browsing operation
on iPad, keeping actual storage denial separate from private-tab operation.

### P21 — iPad Private Browsing operation (2026-10-25)

Source: **user-reported physical observation**, same iPad and requested privacy preview context.
Exact timestamp and independent inspection of private-tab state were not supplied.

Verbatim response:

```text
Preview opened in Private Browsing: yes
Video and detections worked: yes
Threshold slider worked: yes
Start worked after reload: yes
Stop turned camera indicator off: yes
Any error: no
```

Record reported passes for private-tab preview access, video/detections, threshold control,
Start after reload and visible camera indicator off after Stop, with no reported error. This
establishes user-reported operation in Private Browsing, not behavior under actual storage denial.
No runtime fix, automated test or deployment was made. Next: iPad offline-attempt/recovery check,
with cache state and failing-resource uncertainty retained as needed.

### P22 — iPad offline error/recovery; indicator answer unclear (2026-10-25)

Source: **user-reported physical observation**, same iPad and requested privacy preview context.
Requested procedure was shell loaded online in a fresh private session, then Airplane Mode with
Wi-Fi off before Start, followed by reconnection and explicit Start. Actual cache state, failed
resource, time to error and exact timestamp were not independently inspected.

Verbatim response:

```text
Offline result or exact error: as with iPhone
Camera indicator while offline: yes
After reconnecting and tapping Start, detections worked: yes
Any other issue:
```

Record an offline error reported by reference to the iPhone error ("The inference worker stopped.
This browser may not support the model. Try starting again.") and successful explicit Start
recovery after reconnecting. This is not a fresh verbatim transcription or proof of browser/model
incompatibility. The indicator question requested on/off/not checked; "yes" is ambiguous and
must not be interpreted as either on or off. Blank issue wording adds no detail. Camera cleanup
remains unconfirmed pending an explicit indicator answer; if it remained on after the error,
investigate that sequence before claiming a cleanup pass. Specific model-download failure and
cold-cache conditions remain unverified. No runtime fix, automated test or deployment was made.

### P23 — User-supplied photo of iPad offline error UI (2026-10-25)

Source: **visual inspection of a user-supplied photograph**, not direct device/track/network
inspection. Context supplied by the ongoing iPad offline check; the visible address is truncated,
so the full preview URL/source commit cannot independently be established from the image.

The photo shows the app's Error status, camera placeholder with "Let's try that again" and
"CAMERA OFF · NOTHING IS RECORDED", an enabled Start camera button, disabled-looking Pause/Stop
controls, and the visible error wording: "The inference worker stopped. This browser may not
support the model. Try starting again."

This corroborates the app's camera-off error presentation and supplies visual evidence of the
error wording beyond P22's reference to the iPhone message. It does **not** establish underlying
camera-track state, absence of recording/upload, browser incompatibility, or the system green
camera indicator, which is not visible in the photo. Keep the system-indicator observation
unconfirmed; no repeat is required merely to fill that field. No raw photograph was copied into
the repository. No runtime failure requiring a fix is established by this image; no code/test or
deployment changes were made. Next: the remaining iPad model-loading Stop attempt, recording
"too fast to test" honestly if that state cannot be observed.

### P24 — iPad loading-Stop attempt not testable at observed speed (2026-10-25)

Source: **user-reported physical observation**, same iPad and requested privacy preview context.
Asked to attempt Stop while Loading is visible, the user answered: "Loading too brief".

Stop during model loading remains **Pending**, not passed or failed. No interruption or late-grant
cleanup is inferred; no 45-second observation or subsequent restart result was supplied for this
attempt. Model-loading background interruption also remains untested. Do not infer that cached
or brief initialization covers those lifecycle paths. No runtime fix, automated test or redeployment
was made. Next: establish whether Safari's permission modal permits the pending-permission Stop
check, without assuming it is accessible or forcing repeated attempts.

### P25 — iPad permission modal blocks pending-request Stop (2026-10-25)

Source: **user-reported physical observation**, current iPad context. Asked whether Stop camera
was accessible while Safari's permission popup was open or the popup blocked page controls,
the user answered: "Could not interact".

Record the pending-permission Stop test as **Blocked by the browser permission modal** on iPad.
The cancellation path was not exercised; this is neither an application failure nor a cleanup
pass. Do not generalize the observation to iPhone, where control accessibility remains untested.
No runtime fix, automated test or deployment was made.

### P26 — External camera interruption untested (2026-10-25)

Source: **user-reported testing status**. Asked whether an interruption such as an incoming
FaceTime call was practical to test on either device, the user answered: "Not tested".

Leave external interruption **Pending** for both devices. Feasibility and behavior were not
established; do not mark Not applicable without a reason or infer success from ordinary
backgrounding. No call was arranged, runtime fix made or deployment performed. This closes the
current guided session with the outstanding evidence explicitly retained for review.

### P27 — New-session camera acquisition log (2026-10-25, about 01:19 UTC)

Source: **user-supplied diagnostic log from a new session**, pasted in full below. The device
is **not recorded in the log**. The user reports both devices showed the same log; only one was
pasted. This is not a second independently supplied device capture and is not the earlier P15
session. Requested preview/build remains `edea505`, with URL and stack evidence below.

```json
[
  {
    "event": "installed",
    "at": "2026-10-25T01:19:02.476Z",
    "elapsedMs": 0,
    "active": false,
    "hasBeenActive": false,
    "context": "top-level page"
  },
  {
    "event": "csp-violation",
    "at": "2026-10-25T01:19:02.478Z",
    "elapsedMs": 2,
    "directive": "script-src-elem",
    "blockedAddress": "https://vercel.live/_next-live/feedback/feedback.js",
    "disposition": "enforce",
    "trusted": true
  },
  {
    "event": "start-click",
    "at": "2026-10-25T01:19:03.635Z",
    "elapsedMs": 1159,
    "trusted": true,
    "active": true,
    "hasBeenActive": true
  },
  {
    "event": "camera-request",
    "at": "2026-10-25T01:19:03.639Z",
    "elapsedMs": 1163,
    "id": 1,
    "active": true,
    "hasBeenActive": true,
    "sinceStartMs": 4,
    "stack": "wrapped@https://visual-lab-3luq4khke-harrisonjbailey-3896.vercel.app/camera-diagnostics.js:86:38\nstart@https://visual-lab-3luq4khke-harrisonjbailey-3896.vercel.app/assets/index-oohfpgVL.js:1:1031\nstart@https://visual-lab-3luq4khke-harrisonjbailey-3896.vercel.app/assets/index-oohfpgVL.js:1:7336\n@https://visual-lab-3luq4khke-harrisonjbailey-3896.vercel.app/assets/index-oohfpgVL.js:41:2452"
  },
  {
    "event": "camera-settled",
    "at": "2026-10-25T01:19:05.017Z",
    "elapsedMs": 2541,
    "id": 1,
    "outcome": "resolved"
  }
]
```

What the supplied log shows:

- Diagnostics installed in the top-level (main) page at +0 ms, with no user activation.
- The security policy blocked Vercel's feedback script at +2 ms (`script-src-elem`, enforcing,
  browser-trusted event).
- A trusted Start tap occurred at +1,159 ms, with active user activation.
- Exactly one camera request appears, ID 1 at +1,163 ms, **4 ms after Start**.
- That request resolved at +2,541 ms, consistent with the camera opening; the log records API
  settlement, not the precise moment live pixels appeared.
- No camera request appears before Start in this supplied sequence.

**Build match (reviewer check, also checked against available local build output):** the stack
names `index-oohfpgVL.js`, matching the local rebuild of `edea505`. Line 86 of
`camera-diagnostics.js` records the request stack. The bundle positions map to camera acquisition
(`1:1031`), the lab's Start routine (`1:7336`) and the Start button click handler (`41:2452`). The
trace uses Safari/WebKit-style `function@URL:line:column` formatting. This shows the diagnostics
catching the app's request in the reported WebKit session; it is not a separate browser-version
inspection or a universal Safari compatibility claim.

The matrix remains **Pass on both devices** within the user-report and single-pasted-log limits.
The current blocked-feedback-script observation supersedes the iPhone's earlier "no CSP entries"
summary; no second independent CSP log or raw device identity is invented.

**Limits:** diagnostics cover only the main page from installation onward, excluding earlier
calls, saved original references and other contexts. A fresh tab was not confirmed. Stop is not
logged. This does not explain historical S1/S2 or establish that the blocked script caused camera
access. Physical-session network inspection and effective deployed headers/HTML remain unchecked.
No runtime change, new automated runtime test or deployment was made for this ledger correction.

For subsequent sessions:
Record device/date/time, preview/commit, steps, status/indicator, camera-request and CSP entries,
prompt identity, exact errors, result and evidence source. Screenshots must exclude live footage
and unnecessary personal data. If a permission prompt blocks panel rendering, capture it safely,
dismiss it and then inspect the panel. Do not interpret missing information as a pass.

## Current evidence checkpoint

Both devices have reported live detections, scene/control/layout checks, private-tab operation
and manual Resume after backgrounding while permission was pending. Fresh-tab checks are Pass
on both devices with P27's single-log/other-device reporting limits. The new-session log in P27
(about 01:19 UTC) records a trusted CSP event blocking Vercel feedback code, Start followed 4 ms
later by one camera request, and successful settlement. Raw device identity is unrecorded; the
other device's equivalent behavior is user-reported, with only one log pasted. The iPad also has post-Start permission timing and
navigation-return/denial recovery evidence. Offline error/retry is reported on both devices;
the iPad photo corroborates the app camera-off/error presentation, not its system indicator.

These observations do not complete validation. Loading-Stop could not be timed on either device;
backgrounding during model loading is untested; iPad pending-permission Stop is blocked by Safari's
modal, and that accessibility was not checked on iPhone. External interruption feasibility/testing,
non-diagnostic fresh-tab comparison, actual storage denial, effective authenticated app/asset
headers, HTML inspection and physical-session network inspection remain Pending. Earlier iPhone
S1/S2 remain separate historical reports; current explicit corrections cannot reconstruct them.
No runtime fix was applied during this preview walkthrough. Review identified misleading offline
error wording as a follow-up runtime issue; its change and regression test belong in a separate PR.

## Next gate

Keep this ledger PR draft. Reproduce material failures before runtime fixes and add meaningful
regression tests. A successful clean session does not reconstruct the old incident. Review
outstanding evidence before any merge or future Phase 2 authorization.
