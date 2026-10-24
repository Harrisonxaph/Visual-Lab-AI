# Phase 1 privacy preview validation — 2026-10-24

Status: **in progress; iPhone acquisition sequence clarified as expected; diagnostic JSON and remaining checks pending**. This ledger is separate from the earlier
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
| Fresh diagnostic tab: Idle, indicator off, no camera-request before Start; record CSP events | Partial — post-Start-only prompt/indicator/request confirmed; no CSP entries reported (P1–P4); Idle and actual JSON unprovided | Pending |
| Non-diagnostic fresh-tab comparison | Pending | Pending |
| Prompt site identity and post-Start acquisition | Partial — post-Start sequence confirmed (P2–P4); prompt site identity unprovided | Pending |
| Stop during permission request, if Safari permits interaction | Pending | Pending |
| Stop while model loading; no late activation, explicit recovery | Pending — Loading not observed; reported 45-second camera-off period and restart recorded separately (P5) | Pending |
| Background while permission/model loading pending | Pending | Pending |
| Permission-denied message, inactive indicator and recovery | Pending | Pending |
| Navigate away and return inactive until Start | Pending | Pending |
| Empty/plain surface and multiple objects | Pending | Pending |
| Private Browsing operation; distinguish actual storage restriction | Pending | Pending |
| Cold-cache network/model failure and recovery | Pending | Pending |
| Feasible external camera interruption | Pending | Pending |
| Live preview, detections, threshold, rotation and lifecycle under new policy | Pending | Pending |
| Zoom, or explicit Not applicable reason | Pending | Pending |
| Physical-session network inspection | Pending | Pending |

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

For subsequent sessions:
Record device/date/time, preview/commit, steps, status/indicator, camera-request and CSP entries,
prompt identity, exact errors, result and evidence source. Screenshots must exclude live footage
and unnecessary personal data. If a permission prompt blocks panel rendering, capture it safely,
dismiss it and then inspect the panel. Do not interpret missing information as a pass.

## Next gate

Keep this ledger PR draft. Reproduce material failures before runtime fixes and add meaningful
regression tests. A successful clean session does not reconstruct the old incident. Review
outstanding evidence before any merge or future Phase 2 authorization.
