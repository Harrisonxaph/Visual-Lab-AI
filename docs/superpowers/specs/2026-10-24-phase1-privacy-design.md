# Phase 1 privacy diagnostics design

Implements the user's explicit request for a local opt-in camera diagnostic, tested CSP and a
focused physical retest checklist. No deployment, merge, production/protection change or Phase 2.

Approach selected by Codex within the authorized scope: a parser-blocking, same-origin classic
script in the document head, before the application module; it immediately returns unless the
query has `diag=1`. A late application hook would miss earlier calls; a browser extension would
require device setup and would not be part of this app. The early script is the smallest useful
instrument here, with explicitly limited coverage.

In diagnostic mode, wrap this realm's current getUserMedia function and retain its receiver,
arguments, original promise and errors. Record request timing, bounded sanitized stack, user
activation, trusted Start clicks and settlement outcome names. Keep at most 100 records in page
memory, with a clear button and no persistence, frames, constraints, device identifiers or uploads.
A panel outside #app survives application rendering. Missing APIs or wrapping failure are visible.
No claim that instrumentation proves user intent, catches every call, or resolves old reports.

Use a response-header CSP in vercel.json, applied to documents and worker resources. Vite preview
uses the same header values for production tests. Restrict sources to self, forbid frames, objects,
forms and base URLs; allow WASM compilation explicitly. Do not allow blob workers unless required
by actual runtime evidence. Same-origin requests remain permitted, so this is defense in depth,
not proof of no uploads. Preview toolbar may be blocked; protection settings remain untouched.

Tests cover disabled mode, no pre-Start acquisition, trusted/synthetic Start distinction, delayed
and rejected acquisition, no log persistence, blocked off-origin scripts/connections/workers,
worker-inherited restrictions, and real CPU/WASM inference under the policy. Physical Safari
behavior and authenticated preview HTML inspection remain pending without direct evidence.
