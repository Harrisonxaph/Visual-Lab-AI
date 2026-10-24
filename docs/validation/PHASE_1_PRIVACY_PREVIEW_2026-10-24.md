# Phase 1 privacy preview validation — 2026-10-24

Status: **in progress; new physical checks Pending**. This ledger is separate from the earlier
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
| Fresh diagnostic tab: Idle, indicator off, no camera-request before Start; record CSP events | Pending | Pending |
| Non-diagnostic fresh-tab comparison | Pending | Pending |
| Prompt site identity and post-Start acquisition | Pending | Pending |
| Stop during permission request, if Safari permits interaction | Pending | Pending |
| Stop while model loading; no late activation, explicit recovery | Pending | Pending |
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

No new physical observations yet. Begin with the iPhone fresh-tab gate without pressing Start.
Record device/date/time, preview/commit, steps, status/indicator, camera-request and CSP entries,
prompt identity, exact errors, result and evidence source. Screenshots must exclude live footage
and unnecessary personal data. If a permission prompt blocks panel rendering, capture it safely,
dismiss it and then inspect the panel. Do not interpret missing information as a pass.

## Next gate

Keep this ledger PR draft. Reproduce material failures before runtime fixes and add meaningful
regression tests. A successful clean session does not reconstruct the old incident. Review
outstanding evidence before any merge or future Phase 2 authorization.
