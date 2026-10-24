# Phase 1 privacy investigation and focused device retest

Status: implementation under review; **not deployed and not physically validated**.
Baseline main after ledger PR #3 merge: `6c8fe3761625f37e0ad3003f1cd9357f6c44d6b0`.
Main push CI [40130225460](https://github.com/Harrisonxaph/Visual-Lab-AI/actions/runs/40130225460)
passed for that exact commit. Earlier physical results remain in
[the original ledger](../validation/PHASE_1_DEVICES_2026-10-24.md), not evidence for this change.

## Diagnostic behavior and limits

Append `?diag=1` to an **approved future preview URL**. The same-origin classic script in the head
executes synchronously before the app module; ordinary mode returns immediately, leaving the
camera API untouched and adding no panel. Vite development injects its own client; only the built
preview represents the intended document order. A hosting platform can insert earlier code, so
"before the app" does not mean before every injected script.

The panel logs installation, captured Start clicks (including trusted flag), each observed
getUserMedia call's wall-clock/relative time, user activation, time since a Start click and sanitized
bounded stack, plus settlement outcome name. In diagnostic mode it also listens for this document's
`securitypolicyviolation` events after listener installation, recording the effective directive,
blocked address, enforcement/report disposition and event trust flag. Blocked HTTP(S) addresses
lose credentials, query and fragment; data/blob payloads are omitted. It does not log policy text,
source samples or document/referrer URLs. Browser privacy rules may reduce a blocked address to
its origin, so the exact injected script path may be unavailable. An active gesture/recent Start is correlation, not
proof of permission or intent. Stacks vary by browser and production minification. URL queries,
fragments and credentials are omitted; paths/function names may still reveal context. Review any
screenshot before sharing. No stream, image, constraints, device identifiers or error messages are
stored by diagnostics. The original camera promise, receiver and errors remain the caller's.

Only the latest 100 entries live in page memory. Clear removes those entries and the last-Start
reference; reload creates a new session. There is no automatic export, persistence or upload.
Diagnostics do not acquire the camera themselves, nor inspect network traffic.

Coverage is this page realm's wrapped API **after installation**, including later third-party code
using that wrapper. Earlier calls, cached original function references, replaced wrappers, legacy
camera APIs, other tabs/iframes/browser internals/extensions are not covered. A visible unavailable
entry means instrumentation could not install; an absent log is not proof no acquisition occurred.
A clean retest cannot explain S1/S2: CSP could suppress a script that previously ran. A logged
blocked attempt provides evidence of that attempt in the new build, not proof the script requested
a camera or caused the old report. An empty log cannot exclude earlier events, suppressed browser
reporting, worker/frame violations or allowed same-origin scripts. Violation logging does not
replace authenticated HTML/script-order inspection.

A permission popup can block interaction/rendering, so collect observations after dismissing it too.
The early script itself is still fetched in ordinary mode; its observer activates only with diag=1.

## Content-Security-Policy

`vercel.json` applies the policy to all paths, including workers. Vite preview reads these exact
header values for local production tests; dev HMR is deliberately outside this production policy.
Scripts/styles/connections/workers/images are same-origin. Only `wasm-unsafe-eval` is allowed for
compilation; JavaScript `unsafe-eval` and `unsafe-inline` are absent. Workers are same-origin only:
this runtime uses a file worker, so blob workers are not allowed. Media allows local/blob resources
for camera compatibility. Objects, embedding, base URLs and forms are forbidden.

This blocks off-origin scripts/connections and may block preview toolbar injection. It does not
change Deployment Protection. A blocked toolbar is not evidence that it previously requested a
camera. The policy does **not** block same-origin uploads, all navigation-based exfiltration or
trusted same-origin code. No claim of universal no-upload enforcement or physical network audit is
made. The application has no upload endpoint; diagnostics do not add one. Verify deployed response
headers after approval rather than assuming Vercel settings from a local server test.

## Authenticated HTML inspection

Pending: ordinary read-only access to the old authenticated preview redirected to Vercel login.
No authenticated browser session or Vercel CLI is available in this workspace. The connector's
sharing-link fetch path is excluded because it would create public access. Do not classify login
scripts as injected lab scripts. A read-only check on 2026-10-24 of the old preview observed a
302 redirect without a CSP header, then Vercel SSO (307) and login (200), each with one CSP header.
The login policy belongs to a different document, not an extra policy applied to the app. This
does not establish the headers on an authenticated app response or whether the proposed CSP
interferes with that authentication flow. Those checks remain Pending after deployment approval.
No auth tokens, redirect query values or cookies were recorded.

After an approved authenticated inspection, record response URL,
source commit, response policy, script src/inline presence and observed order without saving auth
cookies, query tokens or raw personal data. Source HTML alone cannot establish response injection.

## Focused real-device checklist — both devices, one at a time

All items below start **Pending** for this proposed build. Record exact approved preview URL/SHA,
device/OS/Safari version, date/time, steps, result/error and evidence source. No deployment is
currently authorized. Never overwrite old observations or mark an unperformed step passed.

1. **Fresh-page camera gate (iPhone blocker):** close other Safari tabs using cameras; verify the
   indicator is off. Open a fresh authenticated diagnostic tab, do not press Start, and wait 15 s.
   Record Idle, indicator state, log installation/no camera-request, any CSP violation entries
   (directive, sanitized address, disposition and trust flag), and any popup's exact site name.
   If a popup appears, photograph/screenshot only the popup/site identity with no camera image;
   dismiss it, then capture the panel excluding footage. Record any pre-Start call stack. Repeat
   without diagnostics to detect instrumentation effects. Correct any earlier mistaken report only
   with explicit user clarification; a clean later run does not explain the historical S1/S2 events.
2. **Permission pending and Stop:** set Camera to Ask, Start, then Stop if Safari lets page controls
   remain accessible while the permission UI is open. If modal UI blocks Stop, record that constraint
   and test Stop immediately after dismissing/granting instead; don't pretend pending-Stop was run.
   Ensure any late grant leaves the camera off after Stop and requires explicit Start to restart.
3. **Model-loading Stop:** in a fresh/cold session, Start and press Stop while Loading is visible.
   Wait at least 45 s; verify no late camera activation/detections and Start can recover. If cache
   makes loading too fast, mark timing check Pending rather than claim it ran.
4. **Background startup:** separately background while permission or model loading is pending,
   grant/finish if necessary, then return. Expect paused after completion, no automatic inference,
   and working explicit Resume/Stop. Safari may dismiss or suspend prompts; record exact behavior.
5. **iPad missing answers:** deny permission, Start and transcribe the full recovery message;
   confirm indicator off. Restore Ask and recover. Start, navigate away in the same tab, return and
   explicitly confirm camera remains inactive until Start (old yes/no answer was unanswered).
6. **Empty/multiple scene:** around 30 s each, point at a plain surface then several supported
   objects. Record observed counts/classes, control responsiveness, any stale boxes and errors.
   A plain surface can produce false positives; don't require zero as proof of correct operation.
7. **Restricted storage:** repeat Start, threshold change and reload in Private Browsing. Record
   actual behavior; Private Browsing does not guarantee storage is denied. No restricted-storage
   claim without an actual restriction; mocked storage errors remain automated evidence only.
8. **Model network failure:** use a cold browser cache/session before requesting the model. Load
   the shell online, enable Airplane Mode with Wi-Fi also off, then Start. Record download error,
   indicator cleanup and retry after restoring network. A cached model may still load; that makes
   the failure case untested. Existing app assets may also be unavailable: record the actual failure.
9. **External interruption, if feasible:** incoming FaceTime or competing camera use (iPad supports
   only applicable configurations). Check stopped/paused/error explanation, indicator and explicit
   recovery. Different Safari versions can suspend or mute rather than end a track; report facts.
   If unavailable, record Not applicable with device/setup reason; do not arrange unsolicited calls.
10. **CSP/device smoke:** confirm live image, real detections, threshold, rotation, Pause/Resume/Stop
    work under the new response policy. Record errors verbatim. Network privacy inspection remains
    Pending without inspection; these UI checks do not prove absence of upload attempts.
11. **Zoom:** test page zoom/box alignment if practical. Otherwise mark Not applicable with a concrete
    reason; normal rotation isn't a zoom test.

Record battery/heat only if observed, distinguishing subjective warmth from sensor measurements.
Stop before merge/Phase 2. Claude reviews evidence and outstanding limitations before any next gate.

## Automated verification (2026-10-24)

Chromium 154 on Linux, synthetic camera input: 24 unit tests passed; typecheck, formatting and
production build passed. Production suite: 10 passed, including real Lite0 worker/CPU/WASM inference
in normal and diagnostic modes and policy enforcement probes. Header coverage checks every built app/worker JS and CSS file,
both WASM loader JS and WASM binary variants, the diagnostic resources, model and page. A real
blocked-script event verifies diagnostic violation logging; synthetic events exercise credential,
query, fragment and non-HTTP payload redaction separately. This is local production-build
verification, not deployed-header verification or physical Safari evidence. Diagnostic tests first
failed without instrumentation; policy tests first failed without response headers. Development
browser suite: 25 passed, including lifecycle regressions and real-worker inference.

Independent Codex static review found that the real-model test's camera mock was non-writable,
which prevented instrumentation installation. A new installed assertion reproduced the gap (RED);
the mock is now writable and assertions require a camera-request and resolved settlement alongside
real detections. No other Critical/Important or minor findings were reported. This is not Claude
review. The reviewer could not independently rerun with the default missing browser executable;
the implementer's runs explicitly use system Chromium.

No new physical observations have been collected for this build. No claim is made that the old
pre-Start report was reproduced, explained or fixed.

## Deployment plan — requires later approval

Review the draft PR and its exact head commit, then explicitly approve **preview only** for that
SHA. Create a new immutable temporary preview from that commit (do not promote or move production
aliases). Keep authentication/protection, project settings and disabled automatic Git deployments
unchanged. Verify deployment source SHA, READY status and effective CSP headers on the page,
app/diagnostic JS and CSS, worker script, every `/wasm/*.js` loader and WASM binary, and model.
Record every enforcing and report-only CSP header instance, not just the first. Inspect protection
redirect/login responses separately from the authenticated app; note additional app policies and
confirm login works. Multiple enforcing policies all apply, so a more permissive added policy does
not weaken a stricter one. Record conflicts without automatically loosening policy/protection.
Record the new URL and run the checklist above. Existing old device evidence stays attached to
its original preview. Do not create a public share/bypass link or begin Phase 2.

## Production release decision — deferred

The early diagnostics asset is currently fetched on every load but activates only with `?diag=1`.
Before any production release, explicitly decide whether to retain that opt-in capability or remove
it from the production build. No production-shipping decision or deployment is made in this PR.
The existing `media-src blob:` allowance is retained; current camera srcObject does not require it.
