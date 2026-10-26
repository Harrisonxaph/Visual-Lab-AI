# Phase 2 proposed acceptance and physical testing plan

**Planning only — no Phase 2 runtime or device result exists yet.** These checks become executable
after implementation approval, a passing build and a separately approved temporary preview.
Preserve the [Phase 1 closeout](PHASE_1_CLOSEOUT.md); acceptance of its limitations is not a new
tracking/storage/UI test pass. No production deployment, merge or Phase 3 is authorized.

## Proposed acceptance criteria

- Within a continuous analysis segment, a clearly separated supported object moving within the
  documented gate retains its confirmed ID; an eligible brief gap can reassociate that ID.
- Entry/loss/reacquisition/expiry/control boundaries are inspectable and truthfully named. A track
  expiry is not proof of physical exit, and geometric reassociation is not re-identification.
- Select a track from an accessible list or stage tap; see actual observed class/score/time history,
  gaps, trajectory settings and why the association matched/failed, without invented model reasoning.
- Slider/search changes visibility only, never track state, recorded confidence or event counts.
  Returned near-threshold results honor the real output floor/cap. Unsupported alternatives say
  unavailable. The 80-name explorer is searchable and does not promise arbitrary objects/classes.
- User notes are metadata-only, local, explicitly saved, bounded, deletable and honestly unsaved on
  storage errors. They do not train the detector or become ground truth automatically.
- Live descriptive metrics are separate from labelled synthetic evaluation. Show no real-camera
  ID-switch/fragmentation accuracy without actual identity annotations.
- Existing consent/error/retry, Pause/Resume/Stop, camera release and responsive mobile UI remain usable.

## Automation required before physical checks

| Layer | Required evidence |
| --- | --- |
| Unit | Geometry/gates/ties, distinct .05/.25/display thresholds, confirmed-only public IDs and the defined low-score-noise churn fixture, one-to-one assignment, tentative/lost/expired boundaries, duplicate/stale frames, raw-score histories/gaps, capacities/pruning, threshold projection, schema/consent/quota/corruption/deletion including bounded RAM fallback, independently tested deterministic fixture metrics and recovery windows. |
| Integration/browser | Mocked deterministic motion/loss, rapid controls, geometry and generation invalidation, keyboard/touch selection, searchable catalog, note storage fallback, no duplicate tracking on rerender and no false current boxes for lost tracks. |
| Actual runtime/production | Pinned CPU/WASM model through tracking/overlay under existing CSP, normal and diagnostic modes, with synthetic camera clearly labelled. Existing failure/offline/retry and CSP/header tests still pass. |
| Profiling | Association time distinct from inference, bounded 100×50 stress, retained memory/sample/event counters and tested UI cadence; report environment and distributions, not a universal speed claim. |

## Real devices — one at a time

Carried-forward devices (confirm current details, do not independently certify): iPhone 15 Pro /
iOS 27.0.1 / Safari; iPad Pro 11-inch (3rd generation) / iPadOS 26.6.2 / Safari. Record exact Safari
build if accessible. All Phase 2 checks start **Pending**.

Each request includes the approved preview URL. Record commit, date/time, device/browser, steps,
threshold/config and actual result. Physical observations are user-reported unless directly observed;
logs/photos and synthetic ground truth are different evidence. Exclude footage/personal data from
screenshots; no raw media or network trace collection/upload is implicitly authorized.

| Test | Observe and record; do not infer |
| --- | --- |
| Start/consent and baseline | Camera inactive before Start; labelled live results and confirmed IDs after two tracking-eligible matched frames (default floor25%). Lower-score raw boxes get no public ID. No consent regression. |
| Single object | Slowly move a cup/bottle in good light for 30 s. Note ID continuity and observed confidence variation, not accuracy. |
| Two objects/crossing | Two similar objects crossing if available. Record observed ID changes/ambiguity honestly; without annotations this is a qualitative observation, not an objective switch-rate benchmark. |
| Brief obstruction | Briefly obscure then reveal a selected object within the configured retention interval. Record lost/reassociated event and ID. Longer than retention should expire/new ID; do not claim camera occlusion was algorithmically verified. |
| Inspector/history | Select by list and tap; check actual class/score history, missing intervals, event reasons and retained range. Toggle Off/2/5/10 s trajectories without crossing gaps. Lost/ended history must not masquerade as a live box. |
| Threshold/search | Compare 5%, 50%, 100% then back with a stable scene. IDs/state must not reset merely from display filtering. Raw .05–.24 results remain inspectable but do not create/maintain tracks; changing the tracking floor is a separate configuration change. Near-band entries must be actual returned results; alternative unavailable state is honest. Search supported labels without losing selected historical data unexpectedly. |
| Layout/geometry | Portrait/landscape and pinch/page zoom if practical; tap/select remains aligned and scroll is usable. CSS resize preserves identity; actual camera-geometry change explicitly starts a new segment with a prominent on-video reason. Check full-width video then list and inspector then chart on phone-width viewports (≤600 CSS px), followed by explorer/notes/benchmark. Wider viewports pair only with ≥616 CSS px available content and the design’s readable minimum widths; otherwise stack. No old-aspect trail is overlaid on incompatible coordinates. |
| Pause/background/Stop | Pause retains preview and stops updates; return remains paused until Resume. Resume starts a new segment/IDs with a prominent on-video notice and segment chip. Stop indicator off, ended history clearly marked. Start clears prior transient session; old callbacks do not revive tracks. |
| Failure notes | Missed object without a box, wrong/unstable selected track, expected class/Unknown and note. Confirm default memory-only, explicit localStorage save under its own key, reload, per-entry/delete-all and visible limits/errors. Private Browsing is operation evidence only, not storage denial. |
| Quality lab | Separate live descriptive counters from built-in synthetic fixture results. Record fixture/version/config/environment; no real-camera identity metric is inferred. |
| Sustained use | Five minutes, record beginning/end inference and processing FPS, association summary if available, responsiveness, subjective warmth and battery/charging/Low Power Mode. No thermal/energy causal claim from endpoints. |
| Diagnostic Copy log | In opt-in mode, copy complete bounded JSON with success status; if clipboard access is unavailable, use the full selectable text fallback. Confirm it includes installation, blocked-script, Start, request and settlement entries where actually present; never manufacture missing events. Clipboard handling is explicit; no footage/network upload. |
| Offline/error/retry | Focused check after approved build if inference path changed: actionable initialization error, camera state, no automatic restart and explicit retry. Cached success leaves failure reproduction untested. |

Accepted Phase 1 timing/modal limits may remain accepted if still applicable; do not force a Stop
interaction through a blocking Safari dialog or relabel unavailable loading timing as passed.
External interruption and real storage denial retain their accepted untested status unless genuinely
exercised. Network and authenticated header/HTML inspection remain accepted limits, not evidence
that this new phase cannot upload; changes to storage/network code still require code/automated
privacy checks. If new behavior reveals a material failure, reproduce, fix and add regression tests.

## Evidence and release gate

Create phase-specific implementation/results notes when work is authorized. Record actual counts,
failures and untested cases; keep prior Phase 1 ledgers unchanged. Claude reviews the Task 3 integration checkpoint before Tasks 4–6, then final exact-head
code and evidence. The intermediate stop requires pushed SHA/CI and Phase 1 regression results;
review approval of that commit must be supplied before continuing. User approval is required for merge/deployment; a plan or device pass is not
that authorization. No new runtime work, preview or Phase 3 is authorized by this testing plan.

## Implementation evidence and new physical checks

Automated scope/results are in [implementation notes](PHASE_2_IMPLEMENTATION.md). Every Phase 2
physical-device row remains Pending; no preview deployment was performed or authorized here.
When a preview is separately approved, additionally verify on each device:

- Dismiss segment notices; confirm they remain dismissed through slider/inference updates and
  return at the next real boundary. Confirm the segment chip persists.
- Navigate away/back: camera remains stopped, explorer/notes/benchmark controls remain usable,
  Start explicitly restores analysis. Confirm portrait/wide layout and actual camera size changes.
- Copy diagnostic JSON only after Stop, inspect full JSON/fallback, Clear and verify fallback is
  removed. Understand Clear cannot revoke clipboard contents or device clipboard sync.
- Save note metadata only after opt-in; reload, disable saving, delete individual/all notes;
  verify text displays safely. Do not infer actual storage refusal from Private Browsing success.
- Run the labelled numeric benchmark only with inference inactive. Start/Resume, hide or page exit
  must cancel it; partial/cancelled data must not appear as a completed report.
- Record actual matching/snapshot/UI latency alongside inference time/FPS and sustained heat/battery
  observations. Shared-Linux profiling exceeded the proposed budget in one final run; no mobile
  budget claim has been established.

## Device matching/copy timing procedure

For a camera-off measurement, use **Stress profile (synthetic, no camera)** after stopping this lab's camera, rather
than inferring tracker time from inference ms/FPS or from the small ≤10-object benchmark. Follow
[the exact on-device procedure](PHASE_2_STRESS_PROFILE.md). Record each device's p50/p95/max,
metadata and observation support separately; no on-device run has been supplied yet. Results are
Pending until a separately approved preview and real-device session. Existing live-camera and
privacy checks remain required; a synthetic timing result does not replace them.

The profile also follows the benchmark's paused-state allowance: paused preview remains live,
but the profile reads no camera frames. Verify Resume cancels a pending profile. A result is
synthetic stress logic timing, not camera FPS, end-to-end latency, battery or thermal behaviour.
