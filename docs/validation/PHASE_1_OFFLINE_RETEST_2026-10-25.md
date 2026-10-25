# Phase 1 focused offline-message retest — 2026-10-25

Status: **focused offline-message retest complete with user-reported passes on both devices; broader Phase 1 validation gaps remain**. This is a focused retest, not a
repeat of the earlier walkthrough or a claim that Phase 1 validation is complete.

## Authorization and exact source

The user authorized one temporary preview of PR #6's verified merge commit only. No production
promotion, protection/automatic deployment change, public sharing link, merge or Phase 2.

- PR #6 merged at 2026-10-25 16:21:53 UTC.
- Exact source/main commit: `063a97ace91172f4523b6a0756b4bb84e1424bc7`.
- [Merge CI 40211317751](https://github.com/Harrisonxaph/Visual-Lab-AI/actions/runs/40211317751):
  completed successfully for that exact SHA. Job inspection confirmed installation, model assets,
  Chromium install, typecheck, formatting, unit tests, browser tests, build and production tests all
  succeeded. Failure-only artifact upload was skipped as expected. This is automated evidence.
- Preview URL: https://visual-lab-2co40dr92-harrisonjbailey-3896.vercel.app
- Diagnostic URL: https://visual-lab-2co40dr92-harrisonjbailey-3896.vercel.app/?diag=1
- Deployment: `dpl_AKxte2igUiZ62DU4Jdp23tgUREHX`.
- Target: preview (`target: null`); **READY**, with matching source SHA confirmed from Vercel.
- Validation branch: `validation/phase-1-offline-message`.

Before deployment, read-only inspection confirmed the intended project `visual-lab-ai`
(`prj_6uGItgPOAj9FeiAc6oVp5GdvWWYI`) and team `team_VehoPCybYSxaOFFrmTcXn0jN`.
SSO protection is enabled for `all_except_custom_domains`; password and trusted-IP protection
are not enabled. A read-only before/after comparison confirmed SSO/password/IP protection and the project domain
list unchanged. The source keeps
`git.deploymentEnabled: false`; no project settings or production target was sent in the deploy call.

## Evidence boundaries and preserved limits

The [accepted privacy-preview ledger](PHASE_1_PRIVACY_PREVIEW_2026-10-24.md) belongs to preview
`edea505`; its historical entries are preserved. The
[offline-message notes and written decisions](../phases/PHASE_1_OFFLINE_ERROR.md) distinguish
unit tests, Chromium/synthetic-camera evidence and physical reports. No old result is relabelled
as a physical check of the new commit.

Keep these limits until explicitly accepted or checked; merging an accurate ledger or runtime
fix does not itself accept them:

- Physical model-loading Stop/background interruption remains untested because loading was too
  brief. Existing deterministic Vitest tests provide separate automated evidence, not Safari passes.
- iPad Stop while permission is pending is blocked by the browser modal; iPhone accessibility was
  not checked. External camera interruption remains Pending without a Not applicable reason.
- Private Browsing operation does not establish actual storage denial; that physical restriction
  remains untested, not Not applicable solely because the devices use iOS.
- Network inspection, effective authenticated deployed headers and HTML/script inventory remain
  unverified. Local/CI CSP tests and reported blocked Vercel feedback code are distinct evidence;
  CSP permits same-origin connections and does not prove no uploads.
- P27 in the earlier ledger has one pasted new-session log and reported other-device equivalence,
  not two independent device captures. Historical S1/S2 remain unexplained. Diagnostic coverage is
  the main page after installation, not every browser context.

## Focused physical checks

User-reported device metadata carried forward; confirm changes before recording a session:

| Device | OS | Browser | Exact Safari build |
| --- | --- | --- | --- |
| iPhone 15 Pro | iOS 27.0.1 | Safari | Not supplied |
| iPad Pro 11-inch, 3rd generation | iPadOS 26.6.2 | Safari | Not supplied |

| Check | iPhone | iPad |
| --- | --- | --- |
| Initialization failure reproduced offline | Pass — user-reported offline result with initialization wording supplied (O2/O3); failed resource unverified | Pass for reported same initialization error in requested offline sequence (O4); failed resource unverified |
| Exact actionable initialization error wording | Pass — supplied wording matches revised message (O3) | Pass by user reference to same revised iPhone message (O4), not a fresh transcription |
| Camera indicator and preview state after failure | Pass for reported green indicator off (O2); preview state not supplied | Pass for reported green indicator off (O5); preview state not supplied |
| Remains stopped after reconnecting, before Start | Pass — user-reported (O2) | Pass — user-reported (O5) |
| Explicit Start restores live video/detections | Pass — user-reported (O2) | Pass — user-reported (O5) |

Cached resources may prevent a failure. Record that outcome as failure-path **untested**, not a
pass or a failure. Without inspection, do not identify the failing resource or conclude browser
incompatibility/network cause from a generic event. A frozen/blank preview and a system camera
indicator are different observations. No footage, credentials or raw network traces are requested.

## Procedure — one device at a time, iPhone first

Include the preview link with every testing request. Use a new private session where practical;
let the page load online without pressing Start. Turn Airplane Mode on and Wi-Fi off, then Start
and allow access if asked. Wait up to 45 seconds and record the exact result/error and system
indicator state. If it works offline, stop and report cached-success behavior without forcing it.
Restore connectivity, observe whether inference stays stopped **before** touching Start, then
press Start and report whether live video/detections recover. Record actual actions/timing, not
assumed compliance. Do not repeat unrelated earlier controls/layout/performance tests.

## Session log

### O1 — Supplied diagnostic excerpt; offline outcome not supplied (2026-10-25)

Source: **user-supplied diagnostic text**, following the requested iPhone-first procedure. The
current device and complete address/build were not independently confirmed in this reply; do not
assign the log to a device solely from its metadata. The requested preview/commit is above.

Supplied entries, wrapped in an opening array bracket for JSON presentation:

```json
[
  {
    "event": "installed",
    "at": "2026-10-25T20:00:46.496Z",
    "elapsedMs": 0,
    "active": false,
    "hasBeenActive": false,
    "context": "top-level page"
  },
  {
    "event": "csp-violation",
    "at": "2026-10-25T20:00:46.497Z",
    "elapsedMs": 1,
    "directive": "script-src-elem",
    "blockedAddress": "https://vercel.live/_next-live/feedback/feedback.js",
    "disposition": "enforce",
    "trusted": true
  },
  {
    "event": "start-click",
    "at": "2026-10-25T20:01:06.294Z",
    "elapsedMs": 19798,
    "trusted": true,
    "active": true,
    "hasBeenActive": true
  }
]
```

The text shows installation in the top-level page, an enforcing browser-trusted CSP violation
blocking Vercel feedback code at +1 ms, and a trusted Start click at +19,798 ms. No camera-request
or settlement appears in the supplied excerpt. Do not infer whether entries were omitted, whether
permission was pending, or whether the camera failed to activate. Diagnostic entries do not log
the app's error text or establish network state. Offline reproduction, visible error wording,
camera indicator state and explicit retry recovery all remain Pending. No runtime change,
automated test or deployment was made. Next: obtain the actual visible offline error/result and
camera state without requiring another full run.

### O2 — Reported camera-off state and explicit recovery; error wording blank (2026-10-25)

Source: **user-reported physical observations**, ongoing requested iPhone-first sequence. Device
context is the requested iPhone 15 Pro / iOS 27.0.1 / Safari, not independently inspected. Exact
on-device time/address and the failed offline resource were not supplied.

Verbatim response:

```text
Exact offline error:
After error, green camera indicator was off: yes
After reconnecting, stayed stopped until Start: yes
Start restored live video and detections: yes
Any other issue:
```

Record reported passes for visible camera indicator off after the referenced error, staying
stopped after reconnecting until explicit Start, and Start restoring live video/detections. The
exact error field is blank: no initialization-message text was supplied, so verification of the
revised wording remains **Pending**. The answers reference an error, but without text or inspection
its category/cause is not established. Blank issue text adds no detail. Do not treat O1's diagnostic
excerpt as the missing app error or infer camera-track internals from the indicator. No runtime
fix, automated test or deployment was made. Next: obtain the visible error wording if available,
or preserve it as not recorded rather than invent a result.

### O3 — iPhone exact initialization wording supplied (2026-10-25)

Source: **user-reported visible app text**, continuing the iPhone-first offline sequence in O2.
Verbatim response:

```text
Inference could not start. Required app, model or runtime files may be unavailable. Check your connection and choose Start camera to retry.
```

This resolves O2's blank wording field and matches the revised initialization guidance in merged
commit `063a97a`. Combine O2/O3 as user-reported passes for offline initialization failure with
actionable wording, green indicator off, remaining stopped after reconnect until Start, and
explicit Start restoring video/detections. Exact failed resource, cache state and network traffic
were not inspected; no browser incompatibility or specific model-download failure is inferred.
This is not an independent on-device build inspection or a guarantee across Safari versions.
No runtime fix, automated test or deployment was made. Next: the same focused check on iPad,
without replaying unrelated earlier tests.

### O4 — iPad same error wording reported by reference (2026-10-25)

Source: **user-reported physical observation**, following the requested iPad Pro 11-inch
(3rd generation) / iPadOS 26.6.2 / Safari offline sequence. Verbatim: "iPad displayed the same".

Record the iPad's initialization message as matching the revised iPhone wording in O3 **by user
reference**, not a fresh verbatim transcription or independent screen inspection. The failed
resource and network/cache conditions remain unverified. Do not interpret "the same" as confirming
all other requested fields: camera indicator after failure, state before Start after reconnecting
and successful explicit retry remain Pending until clarified. No runtime fix, test or deployment
was made. Next: confirm those three observable iPad results without requiring another full run.

### O5 — iPad camera-off and explicit recovery confirmed (2026-10-25)

Source: **user-reported clarification**, same iPad context as O4. Asked whether the green camera
indicator was off after the error, inference stayed stopped after reconnecting until Start and
Start restored live video/detections, the user answered: "All also true".

Record passes for all three specifically listed observations, resolving O4's unanswered fields.
Combined O4/O5 confirms the same revised initialization message by reference plus visible
camera-off state and explicit recovery on iPad. No track/network inspection or new runtime fix,
automated test or deployment was performed.

## Focused retest checkpoint

Both devices have user-reported passes for the requested offline initialization error/retry
sequence against preview source `063a97ace91172f4523b6a0756b4bb84e1424bc7`: revised actionable
message (iPhone verbatim, iPad by reference), green indicator off after error, staying stopped
after reconnection until explicit Start and successful Start recovery of video/detections.
This completes the **focused guided retest**, not full Phase 1 validation or independent device
inspection. The exact failed resource/cache state remains unknown; no specific model-download
failure or browser incompatibility is inferred. The separate preview/context limitations and
unaccepted gaps above remain unchanged. No additional deployment or Phase 2 is authorized.

For subsequent records, preserve user-reported results, device/date/time if supplied, exact
preview/commit, error text and unanswered fields. Mark unperformed steps Pending. Reproduce
material failures before fixes; no speculative change or further deployment is authorized.

## Next gate

Keep the validation PR draft and unmerged. Claude reviews focused evidence and remaining gaps.
No production deployment or Phase 2 is authorized.
