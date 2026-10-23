# Phase 1 proposal and testing plan

Status: planning only. Branch: phase-1/live-object-detection. Baseline cafa8c7.

Implementation order after design approval:
1. Verify pinned MediaPipe Lite0 CPU/WASM inference in a browser worker; record actual evidence.
2. Scaffold typed Vite app and independent camera/inference/scheduler/overlay modules.
3. Build responsive lab UI, start/stop, pause/resume, threshold and educational model panel.
4. Add meaningful unit/integration/browser tests, CI and operational documentation.
5. Run checks and prepare Phase 1 PR for Claude review. Do not merge or deploy.

Manual matrix: desktop Chrome and Safari; real iPhone Safari and iPad Safari. Use HTTPS or localhost.
Grant and deny camera; recover from denial; test missing camera and blocked model downloads. Check
empty scene, multiple supported objects, inclusive threshold, portrait/landscape and box alignment.
Pause must stop inference while retaining preview; Stop must release camera and clear stale output.
Background/resume, repeated start/stop, navigation cleanup and slow device interaction must remain safe.
Verify network requests contain assets only and no camera frames. Run a sustained session and record
actual latency/FPS/device details. Unsupported platforms must explain the failure without hanging.

Current test results: repository inspection and model artifact download only. No app checks,
browser inference, camera tests or real-device tests have run. No implementation PR exists yet.
