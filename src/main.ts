import { mountBenchmark } from "./ui/benchmark-panel";
import { mountFailureLog } from "./ui/failure-log-panel";
import { mountTrackInspector } from "./ui/track-inspector";
import { drawConfidenceChart, confidenceSummary } from "./ui/confidence-chart";
import { mountCategoryExplorer } from "./ui/category-explorer";
import { describeQuality } from "./ui/quality-panel";
import { containedVideoRect, hitTestTracks } from "./tracking/geometry";
import { TrackingController } from "./inspection/controller";
import { mountTrackList } from "./ui/track-list";
import "./style.css";
import { Camera } from "./camera";
import { captureFrame } from "./capture";
import { visibleDetections, formatScore } from "./detections";
import { WorkerDetector } from "./inference/client";
import { MODEL } from "./inference/types";
import { modelDetails, formatPercentage } from "./model-info";
import { Lab, type Snapshot } from "./lab";
import { drawDetections } from "./overlay";
const icon = (name: string, size = 20) => {
  const paths: Record<string, string> = {
    scan: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 8h8v8H8z"/>',
    camera:
      '<path d="M14 5h-4L8 8H4a1 1 0 0 0-1 1v10h18V9a1 1 0 0 0-1-1h-4z"/><circle cx="12" cy="13" r="3"/>',
    shield:
      '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/>',
    pulse: '<path d="M2 12h5l3-8 4 16 3-8h5"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    pause: '<path d="M8 5v14m8-14v14"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="1"/>',
    play: '<path d="m8 5 11 7-11 7z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
    layers: '<path d="m12 3 10 6-10 6L2 9zm-9 11 9 5 9-5M3 18l9 5 9-5"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.scan}</svg>`;
};
document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <aside class="sidebar">
    <a class="brand" href="./" aria-label="Visual Labs AI home"><span class="brand-mark">${icon("scan", 25)}</span><span>visual labs<span class="brand-ai">AI</span></span></a>
    <div class="nav-label">YOUR WORKSPACE</div>
    <div class="nav-current" aria-current="page">${icon("scan")}<span>Detection lab</span><span class="nav-dot"></span></div>
    <div class="sidebar-roadmap"><div class="nav-label">ON THE ROADMAP</div><p><span>02</span> Object tracking</p><p><span>03</span> Learning & experiments</p><p><span>04</span> Interactive modes</p><p><span>05</span> Advanced AI</p></div>
    <div class="sidebar-bottom"><span class="local-dot"></span> Built to run locally<p>Your camera. Your data.<br>Your laboratory.</p><span class="sidebar-version">PHASE 01 / v0.1.0</span></div>
  </aside>
  <div class="workspace">
    <header class="topbar"><div class="breadcrumb">Workspace <span>/</span> <strong>Detection lab</strong></div><div class="private-badge">${icon("shield", 15)} On-device inference</div></header>
    <main>
      <div class="page-heading"><div><div class="eyebrow">OBSERVE. QUESTION. UNDERSTAND.</div><h1>See what AI sees<span>.</span></h1><p>A live laboratory for exploring object detection.</p></div><span class="phase-badge">LAB 01 <span>LIVE DETECTION</span></span></div>
      <div class="lab-grid">
        <section class="panel camera-panel" aria-labelledby="camera-title">
          <div class="panel-heading"><h2 id="camera-title">${icon("camera", 18)} Live camera</h2><span class="status-pill" id="status-pill"><span></span><span data-testid="lab-state">Idle</span></span></div>
          <div class="tracking-pair"><div class="stage-shell">
            <div class="video-stage"><video muted playsinline aria-label="Live camera preview"></video><canvas aria-label="Object detection bounding boxes"></canvas></div>
            <div class="stage-grid" aria-hidden="true"></div>
            <div class="stage-corner top-left" aria-hidden="true"></div><div class="stage-corner top-right" aria-hidden="true"></div><div class="stage-corner bottom-left" aria-hidden="true"></div><div class="stage-corner bottom-right" aria-hidden="true"></div>
            <div class="stage-intro"><div class="intro-icon">${icon("scan", 38)}</div><h3 id="stage-title">A new perspective starts here</h3><p id="stage-description">Point your camera at everyday objects.<br>Explore how a model makes sense of them.</p><span class="stage-caption">CAMERA OFF · NOTHING IS RECORDED</span></div>
            <div id="video-segment-notice" hidden><span id="video-segment-notice-text"></span><button id="dismiss-segment-notice" type="button" aria-label="Dismiss tracking segment notice">Dismiss</button></div><div class="stage-footer"><span id="frame-label">WAITING FOR INPUT</span><span><span id="stage-model"></span></span></div>
          </div>
          <section class="track-panel" aria-labelledby="track-title"><h3 id="track-title">Tracks</h3><span id="segment-chip">No segment</span><div id="track-list"></div><p id="tracking-counts"></p></section></div>
          <div id="segment-notice" role="status" hidden></div>
          <div class="camera-toolbar"><div class="camera-buttons"><button id="start" class="button primary">${icon("camera", 17)} Start camera</button><button id="pause" class="button secondary" disabled>${icon("pause", 16)} <span>Pause inference</span></button><button id="stop" class="button stop" disabled aria-label="Stop camera">${icon("stop", 15)}<span>Stop camera</span></button></div></div>
          <p class="session-message" id="session-message" role="status">Start when you’re ready. Your browser will ask for camera access.</p>
          <button id="clear-tracking" class="button secondary">Stop and clear tracking session</button><p class="tracking-explanation">Tracking floor: 25% (both new and continuing tracks). Display slider affects visibility only; model floor: ${formatPercentage(MODEL.floor)}. IDs are geometric estimates, not re-identification. Trails show the last 5 seconds; missing observations break the line.</p>
          <div id="error" role="alert" hidden></div>
          <div class="metrics"><div><span class="metric-label">${icon("pulse", 15)} Inference time</span><strong id="inference-time">—<small> ms</small></strong></div><div><span class="metric-label">Processing speed</span><strong id="processing-fps">—<small> FPS</small></strong></div><div><span class="metric-label">Visible detections</span><strong data-testid="detection-count">0</strong></div></div>
        </section>
        <aside class="inspector">
          <section class="panel threshold-panel" aria-labelledby="threshold-title"><div class="panel-heading"><h2 id="threshold-title">Confidence threshold</h2>${icon("scan", 17)}</div><div class="threshold-body"><div class="threshold-value"><strong id="threshold-value">50<span>%</span></strong><span>Minimum score<br>to display</span></div><label class="sr-only" for="threshold">Confidence threshold</label><input id="threshold" type="range" min="${MODEL.floor}" max="1" step="0.01" value="0.5"><div class="range-ends"><span>${formatPercentage(MODEL.floor)} · More results</span><span>100% · Fewer results</span></div><p>Move the threshold to investigate which detections stay and which disappear.</p></div></section>
          <section class="panel results-panel" aria-labelledby="results-title"><div class="panel-heading"><h2 id="results-title">Detected objects</h2><span class="subtle-tag">THIS FRAME</span></div><div data-testid="detections" class="detections"><div class="empty-results">${icon("layers", 28)}<strong>Waiting to observe</strong><p>Detected objects and their scores<br>will appear here.</p></div></div></section>
          <div class="privacy-note">${icon("shield", 20)}<p><strong>Private by design</strong>Frames stay in your browser. No image uploads, recordings or paid APIs. Model assets download before inference.</p></div>
        </aside>
      </div>
      <div class="inspection-pair"><section class="panel lab-section" id="object-inspector"><h2>Object inspector</h2><label for="trails">Trajectory duration</label><select id="trails"><option value="0">Off</option><option value="2">2 s</option><option value="5" selected>5 s</option><option value="10">10 s</option></select><div id="inspector-content"></div><p id="live-quality"></p></section><section class="panel lab-section" id="confidence-panel"><h2>Confidence over time</h2><canvas id="confidence-chart" role="img"></canvas><p id="confidence-summary">Select a track. Gaps represent missing observations.</p></section></div>
      <section class="panel lab-section" id="category-explorer"><h2>Supported category explorer</h2><p id="category-filter">Showing all observed tracks</p></section>
      <section class="panel lab-section" id="failure-log"><h2>Local detection failure notes</h2></section>
      <section class="panel lab-section" id="synthetic-benchmark"><h2>Synthetic tracking benchmark</h2></section>
      <div class="learn-grid">
        <section class="panel explanation"><div class="learn-icon">${icon("info", 23)}</div><div><div class="eyebrow">A NOTE FROM THE LAB</div><h2>Confidence isn’t accuracy.</h2><p>An 80% score expresses the model’s confidence in a label. It does not mean the model is correct 80% of the time. Try changing lighting, distance or angle, and watch the scores change. Displayed scores are rounded and capped at 99%; thresholds use the original scores.</p><div class="tip"><span>TRY THIS</span> Find an object, then slowly cover part of it.</div></div></section>
        <section class="panel model-panel"><h2>${icon("layers", 18)} Inside the model</h2><dl><div><dt>Detector</dt><dd><span id="model-name"></span> <span id="model-version"></span></dd></div><div><dt>Runtime</dt><dd><span id="model-runtime"></span></dd></div><div><dt>Coverage</dt><dd><span id="model-coverage"></span></dd></div><div><dt>Model size</dt><dd><span id="model-size"></span> <span>+ runtime assets</span></dd></div></dl><details><summary>Model & compatibility notes</summary><p>Model source: <span id="model-source"></span>. <span id="model-compatibility"></span></p><p id="model-output-notes"></p><p>Processing FPS uses a 2-second rolling window, including transfer and scheduling; inference time measures the worker’s detection call. FPS is capped at 10 to limit work. Neither measures accuracy.</p><a id="model-documentation" target="_blank" rel="noopener noreferrer">Read model documentation ↗</a></details></section>
      </div>
      <footer class="page-footer"><span>VISUAL LABS AI <span class="footer-divider">/</span> Make it a lab.</span><span>Local processing. Curious minds.</span></footer>
    </main>
  </div>`;
const element = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
const video = element<HTMLVideoElement>("video"),
  canvas = element<HTMLCanvasElement>(".video-stage canvas");
const slider = element<HTMLInputElement>("#threshold");
const details = modelDetails(MODEL);
for (const [id, value] of Object.entries({
  "stage-model": details.stageLabel,
  "model-name": details.name,
  "model-version": details.version,
  "model-runtime": details.runtime,
  "model-coverage": details.coverage,
  "model-size": details.size,
  "model-source": details.source,
  "model-compatibility": details.compatibility,
  "model-output-notes": details.outputNotes,
}))
  element(`#${id}`).textContent = value;
element<HTMLAnchorElement>("#model-documentation").href =
  MODEL.documentationUrl;
let threshold = Math.max(0.5, MODEL.floor);
try {
  const saved = localStorage.getItem("visual-labs.threshold");
  const value = Number(saved);
  if (
    saved !== null &&
    Number.isFinite(value) &&
    value >= MODEL.floor &&
    value <= 1
  )
    threshold = value;
} catch {
  /* Storage is optional. */
}
slider.value = String(threshold);
const detector = new WorkerDetector(MODEL);
const tracking = new TrackingController(MODEL.floor);
let lastListAt = -Infinity;
let lastState = "";
let cachedTracking = tracking.snapshot();
let trailSeconds = 5,
  categoryFilter = "";
const inspector = mountTrackInspector(element("#inspector-content"));
const explorer = mountCategoryExplorer(
  element("#category-explorer"),
  MODEL,
  (label) => {
    categoryFilter = label;
    element("#category-filter").textContent = label
      ? `Observed tracks labelled ${label}`
      : "Showing all observed tracks";
    lastListAt = -Infinity;
    render(lab.snapshot);
  },
);
const trackList = mountTrackList(element("#track-list"), (id) => {
  tracking.select(id);
  lastListAt = -Infinity;
  render(lab.snapshot);
});
const failureLog = mountFailureLog(element("#failure-log"), MODEL, () => {
  const v = tracking.projection(threshold, performance.now());
  return {
    sessionId: v.snapshot.sessionId,
    segment: v.snapshot.segment,
    selected: v.selected,
    trackerConfig: tracking.config,
    threshold,
  };
});
const benchmark = mountBenchmark(
  element("#synthetic-benchmark"),
  () => tracking.config,
);
let ageTimer: ReturnType<typeof setInterval> | undefined;
let lab: Lab;
const camera = new Camera(video, () => lab.cameraEnded());
lab = new Lab(
  {
    camera,
    detector,
    capture: () => captureFrame(video),
    schedule: (callback) => requestAnimationFrame(callback),
    cancel: (id) => cancelAnimationFrame(id),
    now: () => performance.now(),
    mediaTime: () => video.currentTime,
  },
  render,
  tracking,
);
detector.onFatal = (error) => lab.fail(error);
function render(snapshot: Snapshot): void {
  const { state } = snapshot;
  benchmark.setState(state);
  const running = state === "running",
    paused = state === "paused",
    loading = state === "loading";
  const frameMatchesVideo =
    !video.videoWidth ||
    !video.videoHeight ||
    Math.abs(
      snapshot.width / snapshot.height - video.videoWidth / video.videoHeight,
    ) < 0.001;
  const now = performance.now();
  const stale =
    running &&
    tracking.completedAtMs !== null &&
    now - tracking.completedAtMs > 2000;
  if (running && !ageTimer)
    ageTimer = setInterval(() => render(lab.snapshot), 250);
  if (!running && ageTimer) {
    clearInterval(ageTimer);
    ageTimer = undefined;
  }
  const detections =
    frameMatchesVideo && !stale
      ? snapshot.detections.flatMap((d, sourceIndex) =>
          visibleDetections(
            [d],
            threshold,
            snapshot.width,
            snapshot.height,
          ).map((d) => ({ ...d, trackId: tracking.idFor(sourceIndex) })),
        )
      : [];
  element('[data-testid="lab-state"]').textContent =
    state[0].toUpperCase() + state.slice(1);
  element("#status-pill").dataset.state = state;
  element<HTMLButtonElement>("#start").disabled = running || paused || loading;
  const pause = element<HTMLButtonElement>("#pause");
  pause.disabled = !running && !paused;
  pause.querySelector("span")!.textContent = paused
    ? "Resume inference"
    : "Pause inference";
  pause.querySelector("svg")!.outerHTML = icon(paused ? "play" : "pause", 16);
  element<HTMLButtonElement>("#stop").disabled =
    !running && !paused && !loading;
  element("#session-message").textContent =
    snapshot.message ||
    (running
      ? "Observing locally. Try moving an object or adjusting the threshold."
      : "Start when you’re ready. Your browser will ask for camera access.");
  const error = element("#error");
  error.hidden = !snapshot.error;
  error.textContent = snapshot.error;
  const intro = element(".stage-intro");
  intro.hidden = running || paused;
  element(".stage-grid").hidden = running || paused;
  element("#stage-title").textContent = loading
    ? "Preparing your laboratory…"
    : state === "error"
      ? "Let’s try that again"
      : "A new perspective starts here";
  element("#stage-description").textContent = loading
    ? snapshot.message
    : state === "error"
      ? "Check the message below to get started."
      : "Point your camera at everyday objects.\nExplore how a model makes sense of them.";
  element(".stage-caption").textContent = loading
    ? "FIRST LOAD MAY TAKE A MOMENT"
    : "CAMERA OFF · NOTHING IS RECORDED";
  element("#frame-label").textContent = running
    ? `${snapshot.width} × ${snapshot.height} · LIVE INPUT`
    : paused
      ? "PREVIEW ON · INFERENCE PAUSED"
      : "WAITING FOR INPUT";
  element(".video-stage").style.aspectRatio =
    `${video.videoWidth || snapshot.width} / ${video.videoHeight || snapshot.height}`;
  element("#inference-time").innerHTML =
    `${snapshot.inferenceMs === null ? "—" : snapshot.inferenceMs.toFixed(0)}<small> ms</small>`;
  element("#processing-fps").innerHTML =
    `${snapshot.processingFps === null ? "—" : snapshot.processingFps.toFixed(1)}<small> FPS</small>`;
  element('[data-testid="detection-count"]').textContent = String(
    detections.length,
  );
  element("#threshold-value").innerHTML =
    `${Math.round(threshold * 100)}<span>%</span>`;
  slider.setAttribute(
    "aria-valuetext",
    `${Math.round(threshold * 100)} percent`,
  );
  slider.style.setProperty(
    "--range-progress",
    `${((threshold - MODEL.floor) / (1 - MODEL.floor)) * 100}%`,
  );
  const results = element('[data-testid="detections"]');
  results.replaceChildren();
  if (!detections.length) {
    const wrapper = document.createElement("div");
    wrapper.className = "empty-results";
    wrapper.innerHTML = `${icon("layers", 28)}<strong></strong><p></p>`;
    wrapper.querySelector("strong")!.textContent = running
      ? frameMatchesVideo
        ? "No objects above this threshold"
        : "Camera dimensions changed"
      : paused
        ? "Observation on pause"
        : "Waiting to observe";
    wrapper.querySelector("p")!.textContent = running
      ? frameMatchesVideo
        ? "Try a supported object, better lighting or a lower threshold."
        : "Waiting for a frame with the new dimensions."
      : paused
        ? "Resume inference to see new results."
        : "Detected objects and their scores will appear here.";
    results.append(wrapper);
  } else
    for (const detection of detections) {
      const row = document.createElement("div");
      row.className = "detection-row";
      const name = document.createElement("span");
      name.className = "detection-name";
      name.textContent = detection.label;
      const score = document.createElement("strong");
      score.textContent = formatScore(detection.score);
      const bar = document.createElement("div");
      bar.className = "score-bar";
      const fill = document.createElement("span");
      fill.style.width = `${detection.score * 100}%`;
      bar.append(fill);
      row.append(name, score, bar);
      results.append(row);
    }
  const current =
    running && !stale && frameMatchesVideo
      ? tracking.visible(threshold, now)
      : [];
  if (now - lastListAt >= 250 || state !== lastState) {
    const projection = tracking.projection(threshold, now);
    const view = projection.snapshot;
    cachedTracking = view;
    trackList.update(
      categoryFilter
        ? view.tracks.filter((t) => t.label === categoryFilter)
        : view.tracks,
      tracking.selected,
      projection.status,
    );
    inspector.update(projection);
    drawConfidenceChart(
      element<HTMLCanvasElement>("#confidence-chart"),
      projection.selected?.samples ?? [],
    );
    element("#live-quality").textContent = describeQuality(projection.selected);
    element("#confidence-summary").textContent = confidenceSummary(
      projection.selected?.samples ?? [],
    );
    element("#tracking-counts").textContent =
      `Candidates: ${view.candidates} · Confirmed IDs: ${view.counters.publicIds} · Below floor: ${view.counters.belowFloor} · Capacity drops: ${view.counters.capacityDrops} · Histories pruned: ${view.counters.droppedHistories} · Events pruned: ${view.counters.droppedEvents}`;
    lastListAt = now;
    lastState = state;
  }
  const view = cachedTracking;
  element("#segment-chip").textContent = view.segment
    ? `Segment ${view.segment}${view.closed ? " · ended" : ""}`
    : "No segment";
  for (const selector of ["#segment-notice", "#video-segment-notice"]) {
    const n = element(selector);
    if (selector === "#video-segment-notice")
      element("#video-segment-notice-text").textContent = tracking.notice;
    else n.textContent = tracking.notice;
    n.hidden = !tracking.notice || (!running && !paused);
  }
  if (stale)
    element("#frame-label").textContent = "ANALYSIS STALE · WAITING FOR RESULT";
  else if (running && snapshot.inferenceMs === null)
    element("#frame-label").textContent = "WAITING FOR ANALYSIS";
  drawDetections(
    canvas,
    detections,
    snapshot.width,
    snapshot.height,
    current,
    tracking.selected,
    trailSeconds,
  );
}
function unsupported(): string | null {
  if (!window.isSecureContext)
    return "Camera access requires HTTPS or localhost. Open this lab over a secure connection.";
  if (!navigator.mediaDevices?.getUserMedia)
    return "This browser does not provide camera access. Try a current browser over HTTPS.";
  if (
    typeof Worker === "undefined" ||
    typeof createImageBitmap !== "function" ||
    typeof OffscreenCanvas === "undefined" ||
    typeof WebAssembly === "undefined"
  )
    return "This browser lacks the worker, image-transfer or WASM features needed for responsive inference. Try a current browser.";
  return null;
}
element("#start").addEventListener("click", () => {
  benchmark.cancel();
  const issue = unsupported();
  if (issue) lab.fail(new Error(issue));
  else {
    tracking.clearSession();
    lastListAt = -Infinity;
    void lab.start();
  }
});
element("#pause").addEventListener("click", () => {
  if (lab.snapshot.state === "paused") {
    benchmark.cancel();
    lab.resume();
  } else lab.pause();
});
element("#stop").addEventListener("click", () => lab.stop());
slider.addEventListener("input", () => {
  threshold = Number(slider.value);
  lastListAt = -Infinity;
  try {
    localStorage.setItem("visual-labs.threshold", String(threshold));
  } catch {
    /* Private mode may disallow persistence. */
  }
  render(lab.snapshot);
});
video.addEventListener("resize", () => {
  lab.geometryChanged(video.videoWidth, video.videoHeight);
  render(lab.snapshot);
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    benchmark.cancel();
    lab.pause("hidden");
  }
});
element<HTMLSelectElement>("#trails").addEventListener("change", (event) => {
  trailSeconds = Number((event.target as HTMLSelectElement).value);
  render(lab.snapshot);
});
let pointer: { id: number; x: number; y: number } | null = null;
const stage = element(".video-stage");
stage.addEventListener("pointerdown", (event) => {
  pointer = event.isPrimary
    ? { id: event.pointerId, x: event.clientX, y: event.clientY }
    : null;
});
stage.addEventListener("pointercancel", () => {
  pointer = null;
});
stage.addEventListener("pointerup", (event) => {
  const start = pointer;
  pointer = null;
  if (
    !start ||
    start.id !== event.pointerId ||
    Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8 ||
    lab.snapshot.state !== "running"
  )
    return;
  const r = stage.getBoundingClientRect();
  tracking.select(
    hitTestTracks(
      { x: event.clientX, y: event.clientY },
      containedVideoRect(
        { x: r.x, y: r.y, width: r.width, height: r.height },
        video.videoWidth,
        video.videoHeight,
      ),
      tracking.visible(threshold, performance.now()),
    ),
  );
  lastListAt = -Infinity;
  render(lab.snapshot);
});
element("#dismiss-segment-notice").addEventListener("click", () => {
  tracking.dismissNotice();
  render(lab.snapshot);
});
element("#clear-tracking").addEventListener("click", () => {
  lab.stop();
  tracking.clearSession();
  lastListAt = -Infinity;
  render(lab.snapshot);
});
window.addEventListener("pagehide", () => {
  benchmark.cancel();
  lab.stop();
  tracking.clearSession();
  pointer = null;
  lastListAt = -Infinity;
  render(lab.snapshot);
  // Keep static DOM/listeners intact: a page in the back/forward cache can return.
  // Genuine unload lets the browser reclaim the document; no background work remains.
});
window.addEventListener("pageshow", () => {
  lastListAt = -Infinity;
  render(lab.snapshot);
});
render(lab.snapshot);
