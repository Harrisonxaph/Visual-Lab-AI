# Phase 1 physical-device validation — 2026-10-24

Status: **in progress; no physical-device test observations collected yet**.
This is a results ledger, not evidence that Safari or physical cameras work.

## Scope and build

- Target main: `861132f0eaedff41c37e4d3d095f57692deaa7b3` (merge of PR #2).
- Exact-commit main CI: [run 40086064102](https://github.com/Harrisonxaph/Visual-Lab-AI/actions/runs/40086064102), success, independently read from GitHub.
- Temporary preview: https://visual-lab-jw2a5aezl-harrisonjbailey-3896.vercel.app
- Deployment: `dpl_FXUJ8vSYL99zhyvL4WmdRWWw5T7G`; pinned to the main SHA above; preview target, not production.
- Vercel reports **READY** and the expected source SHA; this is service evidence, not a device pass.
- Read-only before/after comparison confirmed project deployment-protection settings unchanged.
- Authentication: existing Vercel sign-in. No public share link or protection change is requested.
- Validation branch: `validation/phase-1-physical-devices`.
- Reference checklist: [Phase 1 notes](../phases/PHASE_1.md).

The user authorized refreshing only this temporary preview. Production and disabled automatic Git
deployments must remain unchanged. No merge or Phase 2 is authorized.

## Evidence boundaries

CI success and Vercel deployment status are automated/service evidence, not physical-device evidence.
Earlier Chromium tests used a synthetic camera stream and do not establish Safari support.
Physical results will be labelled **user-reported** unless directly observed. No performance figures,
error messages, device permissions or privacy/network observations have been supplied yet.
Do not mark untested cases passed or infer network behavior from a camera indicator.

## User-reported devices

| Device | OS as supplied | Browser | Exact Safari build |
| --- | --- | --- | --- |
| iPhone 15 Pro | iOS 27.0.1 | Safari | Not supplied |
| iPad Pro 11-inch, 3rd generation | iPadOS 26.6.2 | Safari | Not supplied |

These model/OS values are user-reported and have not been independently inspected. Test the iPhone
first, then the iPad. Record any changed OS/browser or preview version before beginning a session.

## Physical check matrix

Pending means untested. Blocked means another failure prevents execution; it is not a failure of
that individual check. A pass must cite an observation in the session log below.

| Check | iPhone | iPad |
| --- | --- | --- |
| Open the exact preview in Safari; authenticate successfully | Pending | Pending |
| Before Start: camera inactive and no permission prompt | Pending | Pending |
| Deny camera access: actionable error and no active stream | Pending | Pending |
| Restore permission and retry without stale error/hang | Pending | Pending |
| Grant permission: actual live camera preview | Pending | Pending |
| Model loads; supported objects show labels, boxes and scores | Pending | Pending |
| Inference time and processing FPS shown; record actual values | Pending | Pending |
| Threshold 5%–100% changes visible results | Pending | Pending |
| Empty scene and multiple objects handled | Pending | Pending |
| Pause clears results, retains preview; Resume updates | Pending | Pending |
| Stop releases camera; repeat Start/Pause/Resume/Stop | Pending | Pending |
| Stop during permission/model loading does not activate later | Pending | Pending |
| Portrait/landscape box alignment, resizing and zoom | Pending | Pending |
| Touch controls and scrolling remain responsive | Pending | Pending |
| Background/return remains paused until explicit Resume | Pending | Pending |
| Background during startup remains paused after loading | Pending | Pending |
| Navigate away: camera stops | Pending | Pending |
| External camera interruption and recovery, where feasible | Pending | Pending |
| Several-minute session: responsiveness and observed heat/battery | Pending | Pending |
| No user-visible recording or saved footage | Pending | Pending |
| Physical-session network inspection for frame uploads | Pending | Pending |
| Restricted storage behavior, where testable | Pending | Pending |
| Model-download failure/unsupported capabilities, where testable | Pending | Pending |

## Session log

No test observations yet. Append records with:

- Device, date/time and exact preview/build.
- Check and steps performed.
- Observed behavior; exact errors if present.
- Inference time/FPS and duration if measured; do not describe confidence as accuracy.
- Battery start/end, charging state and subjective warmth only when actually observed. No thermal
  sensor measurement is implied.
- Pass / Fail / Pending / Blocked / Not applicable (reason required for the last two).
- Evidence source: user-reported physical observation / direct observation / automated.

## Current gate

Physical-device validation is still pending. No compatibility or readiness conclusion can yet be
made. Record results, reproduce/fix material failures with regression tests, and obtain review before
any request to progress to Phase 2. This ledger PR must not be merged merely because CI passes.
