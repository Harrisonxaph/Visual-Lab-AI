# Phase 1 focused offline-message retest — 2026-10-25

Status: **in progress; new physical-device results Pending**. This is a focused retest, not a
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
| Initialization failure reproduced offline | Pending | Pending |
| Exact actionable initialization error wording | Pending | Pending |
| Camera indicator and preview state after failure | Pending | Pending |
| Remains stopped after reconnecting, before Start | Pending | Pending |
| Explicit Start restores live video/detections | Pending | Pending |

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

No new physical observations yet. Record user-reported results explicitly, with device, date/time
if supplied, exact preview/commit, error text and unanswered fields. Mark unperformed steps
Pending. Reproduce material failures before any fixes and add appropriate regression coverage;
no speculative runtime change or further deployment is authorized by this ledger task.

## Next gate

Keep the validation PR draft and unmerged. Claude reviews focused evidence and remaining gaps.
No production deployment or Phase 2 is authorized.
