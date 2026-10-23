import "./style.css";
import { Camera } from "./camera";
import { captureFrame } from "./capture";
import { filterDetections } from "./detections";
import { WorkerDetector } from "./inference/client";
import { MODEL } from "./inference/types";
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
          <div class="stage-shell">
            <div class="video-stage"><video muted playsinline aria-label="Live camera preview"></video><canvas aria-label="Object detection bounding boxes"></canvas></div>
            <div class="stage-grid" aria-hidden="true"></div>
            <div class="stage-corner top-left" aria-hidden="true"></div><div class="stage-corner top-right" aria-hidden="true"></div><div class="stage-corner bottom-left" aria-hidden="true"></div><div class="stage-corner bottom-right" aria-hidden="true"></div>
            <div class="stage-intro"><div class="intro-icon">${icon("scan", 38)}</div><h3 id="stage-title">A new perspective starts here</h3><p id="stage-description">Point your camera at everyday objects.<br>Explore how a model makes sense of them.</p><span class="stage-caption">CAMERA OFF · NOTHING IS RECORDED</span></div>
            <div class="stage-footer"><span id="frame-label">WAITING FOR INPUT</span><span>EfficientDet-Lite0 <span class="small-dot"></span> CPU</span></div>
          </div>
          <div class="camera-toolbar"><div class="camera-buttons"><button id="start" class="button primary">${icon("camera", 17)} Start camera</button><button id="pause" class="button secondary" disabled>${icon("pause", 16)} <span>Pause inference</span></button><button id="stop" class="button stop" disabled aria-label="Stop camera">${icon("stop", 15)}<span>Stop camera</span></button></div></div>
          <p class="session-message" id="session-message" role="status">Start when you’re ready. Your browser will ask for camera access.</p>
          <div id="error" role="alert" hidden></div>
          <div class="metrics"><div><span class="metric-label">${icon("pulse", 15)} Inference time</span><strong id="inference-time">—<small> ms</small></strong></div><div><span class="metric-label">Processing speed</span><strong id="processing-fps">—<small> FPS</small></strong></div><div><span class="metric-label">Visible detections</span><strong data-testid="detection-count">0</strong></div></div>
        </section>
        <aside class="inspector">
          <section class="panel threshold-panel" aria-labelledby="threshold-title"><div class="panel-heading"><h2 id="threshold-title">Confidence threshold</h2>${icon("scan", 17)}</div><div class="threshold-body"><div class="threshold-value"><strong id="threshold-value">50<span>%</span></strong><span>Minimum score<br>to display</span></div><label class="sr-only" for="threshold">Confidence threshold</label><input id="threshold" type="range" min="0.05" max="1" step="0.01" value="0.5"><div class="range-ends"><span>5% · More results</span><span>100% · Fewer results</span></div><p>Move the threshold to investigate which detections stay and which disappear.</p></div></section>
          <section class="panel results-panel" aria-labelledby="results-title"><div class="panel-heading"><h2 id="results-title">Detected objects</h2><span class="subtle-tag">THIS FRAME</span></div><div data-testid="detections" class="detections"><div class="empty-results">${icon("layers", 28)}<strong>Waiting to observe</strong><p>Detected objects and their scores<br>will appear here.</p></div></div></section>
          <div class="privacy-note">${icon("shield", 20)}<p><strong>Private by design</strong>Frames stay in your browser. No image uploads, recordings or paid APIs. Model assets download before inference.</p></div>
        </aside>
      </div>
      <div class="learn-grid">
        <section class="panel explanation"><div class="learn-icon">${icon("info", 23)}</div><div><div class="eyebrow">A NOTE FROM THE LAB</div><h2>Confidence isn’t accuracy.</h2><p>An 80% score expresses the model’s confidence in a label. It does not mean the model is correct 80% of the time. Try changing lighting, distance or angle, and watch the scores change.</p><div class="tip"><span>TRY THIS</span> Find an object, then slowly cover part of it.</div></div></section>
        <section class="panel model-panel"><h2>${icon("layers", 18)} Inside the model</h2><dl><div><dt>Detector</dt><dd>${MODEL.name} <span>float32 / v1</span></dd></div><div><dt>Runtime</dt><dd>MediaPipe 0.10.32 · CPU/WASM</dd></div><div><dt>Coverage</dt><dd>80 COCO categories</dd></div><div><dt>Model size</dt><dd>13.2 MiB <span>+ runtime assets</span></dd></div></dl><details><summary>Model & compatibility notes</summary><p>Model source: Google MediaPipe. Chromium worker inference verified with a fixed image. Safari on real iPhone/iPad still requires device testing. No GPU acceleration is assumed.</p><p>Output floor: 5%; at most 50 results after model postprocessing. Other predictions may be omitted. No tracking, alternative-class analysis or retraining in this phase.</p><p>Processing FPS includes transfer and scheduling; inference time measures the worker’s detection call. FPS is capped at 10 to limit work. Neither measures accuracy.</p><a href="https://ai.google.dev/edge/mediapipe/solutions/vision/object_detector" target="_blank" rel="noopener noreferrer">Read model documentation ↗</a></details></section>
      </div>
      <footer class="page-footer"><span>VISUAL LABS AI <span class="footer-divider">/</span> Make it a lab.</span><span>Local processing. Curious minds.</span></footer>
    </main>
  </div>`;
const element = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
const video = element<HTMLVideoElement>("video"),
  canvas = element<HTMLCanvasElement>("canvas");
const slider = element<HTMLInputElement>("#threshold");
let threshold = 0.5;
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
const detector = new WorkerDetector();
let lab: Lab;
const camera = new Camera(video, () => lab.stop());
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
);
detector.onFatal = (error) => lab.fail(error);
function render(snapshot: Snapshot): void {
  const { state } = snapshot;
  const running = state === "running",
    paused = state === "paused",
    loading = state === "loading";
  const frameMatchesVideo =
    !video.videoWidth ||
    !video.videoHeight ||
    Math.abs(
      snapshot.width / snapshot.height - video.videoWidth / video.videoHeight,
    ) < 0.001;
  const detections = frameMatchesVideo
    ? filterDetections(snapshot.detections, threshold)
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
    `${((threshold - 0.05) / 0.95) * 100}%`,
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
      score.textContent = `${Math.round(detection.score * 100)}%`;
      const bar = document.createElement("div");
      bar.className = "score-bar";
      const fill = document.createElement("span");
      fill.style.width = `${detection.score * 100}%`;
      bar.append(fill);
      row.append(name, score, bar);
      results.append(row);
    }
  drawDetections(canvas, detections, snapshot.width, snapshot.height);
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
  const issue = unsupported();
  if (issue) lab.fail(new Error(issue));
  else void lab.start();
});
element("#pause").addEventListener("click", () => {
  if (lab.snapshot.state === "paused") lab.resume();
  else lab.pause();
});
element("#stop").addEventListener("click", () => lab.stop());
slider.addEventListener("input", () => {
  threshold = Number(slider.value);
  try {
    localStorage.setItem("visual-labs.threshold", String(threshold));
  } catch {
    /* Private mode may disallow persistence. */
  }
  render(lab.snapshot);
});
video.addEventListener("resize", () => render(lab.snapshot));
document.addEventListener("visibilitychange", () => {
  if (document.hidden) lab.pause();
});
window.addEventListener("pagehide", () => lab.stop());
render(lab.snapshot);
