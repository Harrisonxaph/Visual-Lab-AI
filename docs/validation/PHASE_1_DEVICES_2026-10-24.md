# Phase 1 physical-device validation — 2026-10-24

Status: **in progress; iPhone metrics and lifecycle observations received; pre-start camera report and remaining device checks unresolved**.
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
Physical results will be labelled **user-reported** unless directly observed. The initial iPhone UI/permission/indicator observations below were supplied by the user. Displayed performance figures and subsequent control/layout observations are recorded below. Complete
permission prompt text, network inspection and iPad test observations have not been supplied.
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
| Open the exact preview in Safari; authenticate successfully | Pass — user reports lab opens (S1) | Pending |
| Before Start: camera inactive and no permission prompt | Fail — user reports automatic prompt and green indicator; cause unconfirmed (S1) | Pending |
| Initial lab status is Idle | Pass — user-reported (S1) | Pending |
| Deny camera access: actionable error and no active stream | Pending | Pending |
| Restore permission and retry without stale error/hang | Pending | Pending |
| Grant permission: actual live camera preview | Pending | Pending |
| Model loads; objects show labels, boxes and scores | Pass — user reports labelled boxes and confidence scores (S5); class correctness not evaluated | Pending |
| Inference time and processing FPS shown; record actual values | Pass — displayed 48 ms / 10 FPS, user-reported S4 | Pending |
| Threshold 5%–100% changes visible results | Pass — counts 8 at 5%, 0 at 90%, 0 at 100%; no slider freeze reported (S5) | Pending |
| Empty scene and multiple objects handled | Pending | Pending |
| Pause clears results, retains preview; Resume updates | Pass — user confirms described Pause and resumed detections (S4) | Pending |
| Stop releases camera (visible indicator off) | Pass — user reports green indicator off (S4); track internals not inspected | Pending |
| Repeated Start/Pause/Resume/Stop cycles | Pending | Pending |
| Stop during permission/model loading does not activate later | Pending | Pending |
| Portrait/landscape box alignment and return to portrait | Pass — user-reported alignment in all three states (S6) | Pending |
| Zoom behavior | Pending | Pending |
| Touch controls and scrolling remain responsive | Pass — user reports usability in portrait and landscape (S6); sustained use pending | Pending |
| Background/return remains paused until explicit Resume | Pass — returned paused, explicit Resume restored detections (S7), user-reported | Pending |
| Background during startup remains paused after loading | Pending | Pending |
| Navigate away: camera stops | Pending | Pending |
| External camera interruption and recovery, where feasible | Pending | Pending |
| Several-minute session: responsiveness and observed heat/battery | Pending | Pending |
| No user-visible recording or saved footage | Pending | Pending |
| Physical-session network inspection for frame uploads | Pending | Pending |
| Restricted storage behavior, where testable | Pending | Pending |
| Model-download failure/unsupported capabilities, where testable | Pending | Pending |

## Session log

### S1 — Initial iPhone report (2026-10-24)

Source: **user-reported physical observation**, not independently observed. Device context: iPhone
15 Pro, iOS 27.0.1, Safari as previously supplied. Requested preview/build: the URL and main SHA above.
Exact on-device timestamp was not supplied.

Verbatim response:

```text
Lab page opens: yes
Status says Idle: yes
Camera permission prompt appeared automatically: yes
Green camera indicator before Start: yes
Any error, exact wording:
```

Interpretation: page access and Idle are user-reported passes. The pre-start camera check is a
user-reported failure requiring investigation. Blank error text means no wording was supplied;
it is not proof no error occurred. The prompt's wording/requesting domain, whether the indicator
was already active, and reproducibility in a clean tab are not established. Do not attribute the
indicator to this app or claim an application privacy defect is confirmed until those boundaries
are checked. Do not infer footage upload or recording from this report.

Source inspection of the targeted code finds camera acquisition behind the explicit Start handler;
no initial-load acquisition call was found. This does not override the Safari observation. A
supplemental Chromium acquisition-gate test passed: zero getUserMedia calls and no video stream
on initial Idle, then exactly one acquisition call after an explicit Start click. This is automated
Chromium evidence only and does not establish Safari behavior or resolve the report.
No speculative runtime fix is made before root cause is established. Next action: clean Safari
retest with prompt wording and indicator state before page open, still without pressing Start.

### S2 — User-reported clean-tab retest (2026-10-24)

Source: **user-reported physical observation**, iPhone context as in S1. No independent device
inspection or exact on-device timestamp is available.

Verbatim response:

```text
Green dot remained after closing the tabs: no
Prompt appeared again without pressing Start: yes
Exact prompt wording and website named: allow it to access camera
Did you previously choose Allow, Don’t Allow, or neither?
```

The user reports that closing the tabs cleared the indicator and that the prompt appeared again
without Start. This retains the unresolved pre-start failure; it does not establish which origin
requested camera access. The supplied wording contains no website identifier. The earlier prompt
choice was left unanswered and is **unknown**, not interpreted as Allow or Deny. Indicator state
before answering the second prompt is also unknown.

Next evidence needed: full permission popup/site identity, preferably a cropped screenshot with no
live camera footage or personal information; alternatively the complete website-bearing prompt line.
Do not infer consent, origin, live-stream acquisition, upload or root cause from the partial wording.
No application fix has been made without a reproducible source-level cause.

### S3 — General running-status update (2026-10-24)

Source: **user-reported physical observation**, iPhone context as in S1/S2.
Verbatim: "It is running as expected".

Record this as a positive overall running-status report. It does not specify the Start/permission
sequence, displayed objects/labels/boxes, timing/FPS, or lifecycle/rotation/privacy checks. Do not
retroactively clear the S1/S2 pre-start report or mark individual unspecified checks passed.
The requesting origin and earlier prompt choice remain unknown. Continue with concrete observable
checks while keeping the startup report unresolved pending clarification.

### S4 — iPhone metrics and lifecycle controls (2026-10-24)

Source: **user-reported physical observation**, iPhone context as above. Preview/build context is
the requested main-pinned deployment; no on-device address/commit inspection or exact timestamp
was supplied.

Verbatim response:

```text
Labelled boxes visible: yes/no
Inference time: 48ms
Processing speed: 10FPS
Pause behaved as described: yes
Resume restored detections: yes
Stop turned the camera indicator off: yes
```

Record displayed values **48 ms inference time** and **10 FPS processing speed** as a single
reported observation. No sampling interval, timing distribution, sustained rate, battery or heat
measurement was supplied. This is not a benchmark, accuracy result or thermal evaluation.

The user confirms the described Pause behavior (results clear while preview stays live), Resume
restoring detections, and the green camera indicator going off after Stop. These are user-reported
passes for that cycle. Camera-track internals and repeated cycles were not inspected or tested.
"Labelled boxes visible: yes/no" was left as a template choice and is **unanswered**; resumed
detections are reported, but labelled-box visibility/class/score correctness is not inferred.
The S1/S2 pre-start prompt report remains unresolved. Next: confirm labelled boxes and test the
confidence threshold, keeping unperformed iPad/network/sustained/orientation checks pending.

### S5 — iPhone labels and threshold response (2026-10-24)

Source: **user-reported physical observation**, iPhone context as above, requested main-pinned
preview/build. Exact on-device timestamp, lighting and observed object classes were not supplied.

Verbatim response:

```text
Boxes show an object label and confidence score: yes
Detection count at 5%: 8
Detection count at 90%: 0
Detection count at 100%: 0
Slider responds without freezing: yes
```

Record user-reported passes for labelled-box/confidence display, visible-result response to the
threshold and slider responsiveness. This resolves the unanswered labelled-box field in S4.
These are observations of separate live frames, not a controlled identical-input comparison.
They do not establish class correctness, detection accuracy, recall, calibration or absence of
false positives. Actual class names and individual confidence values were not provided.

The earlier pre-start permission report is still unresolved; all unperformed orientation,
background/startup interruption, sustained performance, network inspection and iPad checks remain
pending. Next: portrait/landscape alignment and touch/scroll layout on the iPhone.

### S6 — iPhone rotation and layout (2026-10-24)

Source: **user-reported physical observation**, iPhone context and requested main-pinned preview
as above. Exact on-device timestamp was not supplied.

Verbatim response:

```text
Portrait boxes align with objects: yes
Landscape boxes align with objects: yes
Alignment correct after returning to portrait: yes
Controls and scrolling usable in both orientations: yes
Any clipping, persistent offset or other issue:
```

Record passes for reported box alignment in portrait, landscape and after returning to portrait,
and control/scroll usability in both orientations. The blank issue field supplies no additional
detail; it is not an independent confirmation that all clipping cases were tested. Zoom, other
viewport sizes, sustained responsiveness and iPad behavior remain pending. No automated test was
run for these physical observations. The S1/S2 pre-start permission report remains unresolved.
Next: background/return behavior and explicit Resume on the iPhone.

### S7 — iPhone background and return (2026-10-24)

Source: **user-reported physical observation**, iPhone context and requested main-pinned preview
as above. Exact on-device timestamp and actual time spent backgrounded were not supplied.
The requested sequence was running detections, Home Screen for about 15 seconds, return without
interaction, explicit Resume, then Stop.

Verbatim response:

```text
Status on returning: paused
Detections stayed paused until Resume: yes
Resume restored detections: yes
Controls remained responsive: yes
Stop turned camera indicator off: yes
Any error or unexpected behavior:
```

Record user-reported passes for returning paused, no automatic resumption, successful explicit
Resume, responsive controls and camera indicator off after Stop. The blank error field supplies
no additional detail. Camera state while backgrounded, network traffic and backgrounding during
startup were not inspected; these results do not establish those behaviors. No automated test was
run for this report. Sustained performance, battery/warmth, permission denial/recovery and iPad
checks remain pending. The S1/S2 pre-start permission report remains unresolved.

Append subsequent records with:

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
