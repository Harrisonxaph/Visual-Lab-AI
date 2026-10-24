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
| Open the exact preview in Safari; authenticate successfully | Pass — user reports lab opens (S1) | Pass — lab opens, user-reported (S12) |
| Before Start: camera inactive and no permission prompt | Mixed — prompt only after Start in recovery test (S10); earlier pre-start prompt/indicator reports remain unexplained (S1/S2) | Pass for reported indicator off and prompt after Start (S12) |
| Initial lab status is Idle | Pass — user-reported (S1) | Pass — user-reported (S12) |
| Deny camera access: actionable error and no active stream | Pass for reported error and inactive indicator (S9); track internals not inspected | Partial — indicator stayed off (S15); actionable error wording/result pending |
| Restore permission and retry without stale error/hang | Pass — user reports preview and detections restored after allowing (S9) | Pass — Ask prompted after Start; allowing restored video/detections, user-reported (S15) |
| Grant permission: actual live camera preview | Pass — user-reported live preview after allowing (S9) | Pass — live video confirmed in clarification (S13); initial S12 answer superseded |
| Model loads; objects show labels, boxes and scores | Pass — user reports labelled boxes and confidence scores (S5); class correctness not evaluated | Pass for reported labelled boxes/scores (S12); live video confirmed (S13) |
| Inference time and processing FPS shown; record actual values | Pass — displayed 48 ms / 10 FPS, user-reported S4 | Pass — reported 65 ms / 10 FPS (S12) |
| Threshold 5%–100% changes visible results | Pass — counts 8 at 5%, 0 at 90%, 0 at 100%; no slider freeze reported (S5) | Pass — counts 30 / 0 / 0 at 5% / 90% / 100%, user-reported (S14) |
| Empty scene and multiple objects handled | Pending | Pending |
| Pause clears results, retains preview; Resume updates | Pass — user confirms described Pause and resumed detections (S4) | Pass — cleared boxes/live video and restored detections, user-reported (S14) |
| Stop releases camera (visible indicator off) | Pass — user reports green indicator off (S4); track internals not inspected | Pass for reported indicator off (S14); track internals not inspected |
| Repeated Start/Pause/Resume/Stop cycles | Pass — three cycles and indicator off after each Stop, user-reported (S11) | Pending |
| Stop during permission/model loading does not activate later | Pending | Pending |
| Portrait/landscape box alignment and return to portrait | Pass — user-reported alignment in all three states (S6) | Pass — user-reported alignment in both orientations and after return (S14) |
| Zoom behavior | Pending | Pending |
| Touch controls and scrolling remain responsive | Pass — user reports usability in portrait and landscape (S6); sustained use pending | Pass — slider/scroll responsive, user-reported (S14); sustained use pending |
| Background/return remains paused until explicit Resume | Pass — returned paused, explicit Resume restored detections (S7), user-reported | Pass — paused until Resume, detections restored, user-reported (S15) |
| Background during startup remains paused after loading | Pending | Pending |
| Navigate away: camera stops | Pass for visible indicator off; return remained inactive until Start, user-reported (S11) | Pass for reported indicator off (S15); inactive-until-Start on return unanswered |
| External camera interruption and recovery, where feasible | Pending | Pending |
| Several-minute session: responsiveness and observed heat/battery | Pass for reported five-minute usability — battery 44%→38%, warmth unchanged, no warnings; conditions incomplete (S8) | Pending |
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

### S8 — iPhone five-minute sustained session (2026-10-24)

Source: **user-reported physical observation**, iPhone context and requested main-pinned preview
as above. Requested threshold was 50%; actual threshold was not explicitly confirmed. Exact
on-device timestamp, ambient conditions, brightness and other device activity were not supplied.

Verbatim response:

```text
Duration: 5 mins
Charging: no
Low Power Mode: on/off
Battery start → end: 44 - 38
Inference time start → end: 48 - 55
Processing FPS start → end: 10 - 10.5
Warmth: unchanged
Controls responsive throughout: yes
Any freezes, warnings or errors: no
Stop turned camera indicator off: yes, manually to stop timer
```

Record five minutes unplugged, battery 44% to 38% (six percentage points), inference time reported
as 48 to 55 ms in the requested units, processing speed 10 to 10.5 FPS, unchanged subjective
warmth, responsive controls and no reported freezes, warnings or errors. Low Power Mode is
initially unknown because the template choice was not answered; subsequently confirmed **off**
by the user (S9). Do not extrapolate battery life or
attribute the battery change solely to inference. Warmth is subjective, not a sensor measurement;
start/end figures do not describe the intermediate performance distribution or establish thermal
throttling. The reported 10.5 FPS is preserved despite the nominal 10 FPS scheduling cap; no
on-device display capture or investigation establishes its cause or a sustained rate above the cap.

The user answered yes to the camera indicator turning off, qualified by "manually to stop timer".
Record that wording without inferring which timer/control was used; the user subsequently confirmed the lab Stop button was **not** used (S9). Do not count S8
as an explicit lab Stop test. This does not invalidate the explicit Stop observations in S4/S7. This is a
user-reported five-minute usability pass, not a controlled battery/performance benchmark. No
automated test was run for this observation. Permission denial/recovery, the S1/S2 pre-start
report, network inspection and all iPad checks remain unresolved or pending.

### S9 — iPhone permission denial/recovery and sustained-session clarification (2026-10-24)

Source: **user-reported physical observation**, iPhone context and requested main-pinned preview
as above. Exact on-device timestamp was not supplied.

The user separately clarified: "Low power mode was off" for S8.

Verbatim subsequent response:

```text
Did you use the lab’s Stop button at the end: no
With permission denied, exact error: camera access was denied, allow in your browser settings then try again.
Camera indicator stayed off when denied: yes
After restoring Ask, prompt appeared before or after Start: yes
After allowing, live preview and detections returned: yes
```

Record user-reported passes for an actionable permission-denied message, the visible camera
indicator remaining off when denied, and live preview/detections returning after permission was
allowed. Camera-track internals were not inspected. The answer "yes" to "before or after Start"
does not establish prompt timing; the S1/S2 pre-start report remains unresolved and requires an
explicit before/after answer. Do not infer that startup acquisition behavior is correct from the
successful recovery.

S8 Low Power Mode is now confirmed off. The lab Stop button was not used at the end of S8;
therefore its indicator report is not evidence for an explicit lab Stop action. Earlier explicit
Stop observations in S4/S7 remain recorded. No runtime changes or automated tests were made for
these physical reports. Network inspection and all iPad checks remain pending.

### S10 — iPhone permission-prompt timing clarification (2026-10-24)

Source: **user-reported physical observation**, same iPhone and requested preview/build context.
Asked whether the prompt appeared before Start or only after Start following restoration of Ask
and reload, the user answered: "After start".

This establishes a user-reported pass for permission-prompt timing in the S9 recovery sequence.
It does not retroactively change the earlier S1/S2 reports or independently establish the camera
indicator state before Start. The earlier discrepancy remains unexplained; no source-level cause
has been reproduced and no runtime fix is claimed. Network inspection and iPad checks remain
pending. Next: repeated lifecycle controls and navigation-away cleanup on the iPhone.

### S11 — iPhone repeated lifecycle and navigation cleanup (2026-10-24)

Source: **user-reported physical observation**, same iPhone and requested preview/build context.
Exact on-device timestamp was not supplied. Requested steps: three cycles using the lab's
Start/Pause/Resume/Stop buttons, then Start, navigate to example.com in the same tab, and return.

Verbatim response:

```text
All three cycles worked: yes
Camera indicator off after each Stop: yes
Camera indicator off after navigating away: yes
On return, camera stayed inactive until Start: yes
Any errors or unexpected behavior:
```

Record user-reported passes for the three lifecycle cycles, visible camera indicator off after
each Stop and after navigation away, and inactive camera on return until explicit Start. Camera
track internals and network traffic were not inspected. The blank error field supplies no
additional detail. This supports correct acquisition gating in this return sequence but does not
explain the earlier S1/S2 reports. No automated test or runtime change was made for this report.
All unperformed checks remain pending, including startup interruption, external camera interruption,
empty-scene handling, restricted storage, download failure and physical-session network inspection.
Next: begin the iPad initial permission and detection checks; iPhone validation is not declared complete.

### S12 — Initial iPad permission and detection observations (2026-10-24)

Source: **user-reported physical observation**, iPad Pro 11-inch (3rd generation), iPadOS 26.6.2,
Safari; the user confirms these details unchanged. Requested URL/build is the main-pinned preview
above; exact on-device timestamp and independent address/build inspection were not supplied.

Verbatim response:

```text
Device/OS/browser unchanged: yes
Lab opens and initially says Idle: yes
Camera indicator off before Start: yes
Permission prompt timing: after start
Live camera preview appears: no
Boxes show labels and confidence scores: yes
Inference time: 65
Processing FPS: 10
Any error, exact wording:
```

Record passes for reported page/Idle, indicator off before Start, prompt after Start, labelled
boxes/scores and displayed metrics (65 interpreted in the requested inference-time unit, ms;
10 FPS). These are single observations, not a benchmark or accuracy evidence. The user reports
**no live camera preview** despite labelled boxes; preserve both observations. Do not infer live
video visibility from detections or mark this preview check passed. Appearance (blank, frozen or
otherwise), reproducibility and cause require clarification before any fix. The blank error field
does not establish an error-free session. No automated reproduction or runtime change has been
made. All other iPad checks remain pending. Next: clarify the video area's appearance and whether
it changes when the camera moves.

### S13 — iPad live-preview clarification (2026-10-24)

Source: **user-reported physical observation**, same iPad and requested preview/build context.
Asked whether moving the iPad shows moving live video, a frozen image or a blank/black area,
the user answered: "Live video".

Record the live-preview check as passed based on this clarification, superseding the initial
"no" in S12 while preserving the original report. No missing-preview failure is currently
established, no runtime fix was made and no automated test was run for this clarification.
Remaining iPad checks and physical-session network inspection remain pending.

### S14 — iPad thresholds, rotation and lifecycle controls (2026-10-24)

Source: **user-reported physical observation**, same iPad and requested preview/build context.
Exact on-device timestamp, scene and individual object classes were not supplied.

Verbatim response:

```text
Detection counts at 5% / 90% / 100%:30, 0,0
Slider and scrolling responsive: yes
Boxes align in both orientations and after rotating back: yes
Pause clears boxes while video stays live: yes
Resume restores detections: yes
Stop turns camera indicator off: yes
Any issue:
```

Record passes for reported threshold response (30, 0 and 0 detections at 5%, 90% and 100%),
responsive slider/scrolling, box alignment in portrait/landscape and after returning, Pause
clearing boxes while retaining live video, Resume restoring detections, and camera indicator off
after Stop. Counts from separate live frames do not establish accuracy, calibration, class
correctness or a controlled identical-input comparison. The blank issue field supplies no
additional detail. Camera-track internals were not inspected. No automated test or runtime change
was made for these observations. Next: iPad permission recovery, backgrounding and navigation.
All unperformed checks remain pending.

### S15 — iPad backgrounding, navigation and permission recovery (2026-10-24)

Source: **user-reported physical observation**, same iPad and requested preview/build context.
Exact on-device timestamp and actual background duration were not supplied.

Verbatim response:

```text
Returned from Home Screen paused until Resume: yes
Resume restored detections: yes
Navigating away turned camera indicator off: yes
Returning left camera inactive until Start: yes/no
With permission denied, exact error:
Camera indicator stayed off when denied: yes
After restoring Ask, prompt timing: after Start
Allowing restored live video and detections: yes
```

Record passes for reported background-return pause until explicit Resume, restored detections,
visible indicator off on navigation away and when permission was denied, permission prompt after
Start when Ask was restored, and recovery of live video/detections after allowing. The unchanged
"yes/no" for camera inactivity on returning is unanswered and remains pending. No denial-error
wording was supplied, so an actionable denied-permission message is not established. No camera
track or network inspection was performed. No runtime changes or automated tests were made for
this report. Next: five-minute iPad session, with the two unanswered checks retained as pending.

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
