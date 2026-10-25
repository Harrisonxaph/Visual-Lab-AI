# Phase 1 initialization error-message fix

Scope: user's requested small follow-up to merged ledger PR #5. No deploy, merge, protection or
production changes; Phase 2 remains blocked. Baseline main: a1ae97d (merge CI 40151809840 passed).

Design: use the detector's actual lifecycle phase, not navigator.onLine or guessed error-string
matching. Before ready, a worker error gets a neutral initialization explanation plus file/network
availability and explicit Start retry guidance. After ready, retain a generic unexpected-worker
error. Worker-reported initialization errors keep original detail and gain retry guidance;
reported inference errors and preflight unsupported-capability errors keep their accurate details.
No new fetch/probe, protocol or retry automation is needed.

1. Add failing unit tests for initialization with either onLine value, original runtime detail,
   and generic post-ready errors. Add browser regressions for real offline startup, aborted model
   download, released synthetic camera tracks and explicit recovery. Observe failures first.
2. Update only inference/client.ts message selection; preserve cleanup and generation guards.
3. Verify unit/browser suites, real production-model/CSP tests, typecheck, formatting and build.
4. Document remaining validation decisions with exact automated coverage and untested physical
   cases. Do not mark external interruption or actual iOS storage denial Not applicable by guess.
5. Independent code review, separate branch/draft PR, exact SHA and evidence handoff. Stop before
   merging/deploying or beginning Phase 2.

Execution: RED observed in 4/5 new unit cases and all 3 targeted browser cases (the unchanged
reported-inference-detail unit behavior already passed). GREEN:29 unit,26 browser,10 production;
typecheck,formatting,build,diff-check passed. No code outside inference/client.ts changed.
Independent Codex static review: no Critical/Important findings. Optional minor second-load failure
unit case deferred; no change to the correct existing loaded reset. Physical Safari follow-up
remains pending. Separate draft PR delivery follows; no merge/deployment is authorized.
