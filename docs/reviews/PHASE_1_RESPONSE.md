# Phase 1 review response

Source: the review supplied by the user in this conversation, following PR #1 at `63b5d98`.
This records the designated review's receipt, not a new Claude invocation or final approval.
This response describes Phase 1 changes merged in [PR #1](https://github.com/Harrisonxaph/Visual-Lab-AI/pull/1)
on **2026-10-23 at 23:17:42 UTC**, merge commit `a5bb085627c226b4c4a9bd768dfa12ba6133c408`.
The merge happened before the recommended device testing. The user reported the merge;
completion or waiver of device checks is not inferred. Phase 2 must wait for written-up device
results, any resulting fixes and explicit authorization.

| Finding | Response |
| --- | --- |
| 1. Lite2 investigation | Recorded the review's successful Lite2 float32/v1 cat-and-dog inference and 760 ms vs 316 ms single cold calls in EXPERIMENTS.md and MODEL_LIMITATIONS.md. Attributed evidence, missing hardware/hash details and non-benchmark status are explicit. Removed the current architecture's claim that compatibility is still conditional. Lite0 remains the default asset. |
| 2. Hard-wired model | Added typed DetectorConfiguration; caller injects paths/limits/delegate into client/worker. Shared model metadata drives stage/model-panel fields and asset preparation. Tests use another configuration and check real runtime score-floor propagation. No model-comparison UI was added. |
| 3. Session-average FPS | Replaced with a 2-second rolling completed-frame window (elapsed time during warmup). Added a regression simulating a slowdown after a long session; updated explanations. |
| 4. Camera disconnection | External track end releases resources and explains that the camera connection ended, may have disconnected/been interrupted, and can be restarted. Does not assert an unknowable specific cause. Explicit Stop retains its normal message. |
| 5. Hidden camera | Considered; automatic hidden-tab shutdown is deferred. Keep the approved behavior: backgrounding pauses inference and requires Resume, but retains camera until Stop/page exit. This remains disclosed; no shutdown timer is claimed. |
| 6a. Rounded certainty | Shared score formatter caps displayed detection scores at 99%; raw scores drive filtering. UI/overlay use the same formatter and explain the cap. |
| 6b. Visible count | List/count/overlay use the same filtered and clipped drawable results. Off-frame/invalid boxes do not inflate the count. |
| 6c. Duplicate CI | PR branch updates trigger one pull_request run. The subsequent docs/CI follow-up adds a push trigger limited to main, retaining workflow_dispatch without duplicate PR-branch push runs. |
| 6d. Browser version | Local evidence remains Chromium 154.0.8037.57. The supplied review reports Chromium 153 for its run and CI. Docs distinguish these environments instead of claiming one version for every run. |

## Deployment control

Read-only Vercel inspection confirmed READY preview deployments of earlier phase commits
`3ec93e7` and `63b5d98` from the existing Git integration, plus production on initial main `cafa8c7`.
The previous blanket statement that nothing had been deployed was incomplete: pushes triggered
those previews even though no deployment command was issued.

Before pushing these fixes, added Vercel's documented `git.deploymentEnabled: false` in vercel.json:
https://vercel.com/docs/project-configuration/git-configuration
This disables automatic Git deployments for refs containing that config. It does not remove older
previews, change production/project settings, or prevent someone manually deploying through Vercel.
All manual deployments and merges still require approval. Do not re-enable Git deployment without
approval. Existing previews have been left unchanged.

## Verification and remaining device work

Local checks passed: **21 unit tests, 19 browser tests, 1 production smoke test**, type checking,
production build, formatting and diff checks (Chromium 154.0.8037.57). Remote CI for the updated
commit must be checked separately.

Regression tests cover injected model paths/limits/metadata, rolling FPS, external camera end,
non-certain displayed scores and drawable counts. Actual worker tests run with different configured
score floors; the built app retains a real CPU/WASM end-to-end smoke test.

Real iPhone/iPad validation requires physical devices and camera permission on those devices.
No such device is attached to this cloud session. The checklist in docs/phases/PHASE_1.md remains
pending; viewport simulation and Chromium inference do not satisfy it. These fixes do not authorize
Phase 2, merge or deployment.
