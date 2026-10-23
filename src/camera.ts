/** Owns camera permission and track cleanup, including late permission grants. */
export class Camera {
  private generation = 0;
  private stream?: MediaStream;
  private removeEnded?: () => void;
  constructor(
    private video: HTMLVideoElement,
    private ended: () => void,
    private acquire: () => Promise<MediaStream> = () => navigator.mediaDevices.getUserMedia({
      audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } },
    }),
  ) {}
  async start(): Promise<void> {
    this.stop();
    const generation = this.generation;
    const stream = await this.acquire();
    if (generation !== this.generation) { stream.getTracks().forEach(track => track.stop()); return; }
    this.stream = stream;
    const onEnded = () => { if (this.stream === stream) { this.stop(); this.ended(); } };
    stream.getTracks().forEach(track => track.addEventListener('ended', onEnded));
    this.removeEnded = () => stream.getTracks().forEach(track => track.removeEventListener('ended', onEnded));
    this.video.srcObject = stream;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        this.video.play(),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Camera preview timed out. Try starting again.')), 15000); }),
      ]);
    } catch (error) {
      if (generation === this.generation) this.stop();
      throw error;
    } finally { clearTimeout(timer); }
  }
  stop(): void {
    this.generation++;
    this.removeEnded?.(); this.removeEnded = undefined;
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = undefined;
    this.video.pause(); this.video.srcObject = null;
  }
}
export function cameraError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') return 'Camera access was denied. Allow camera access in your browser settings, then try again.';
    if (error.name === 'NotFoundError') return 'No camera was found. Connect a camera and try again.';
    if (error.name === 'NotReadableError') return 'Camera is unavailable or in use by another app. Close other camera apps and try again.';
  }
  return error instanceof Error ? error.message : 'The camera or detector could not start. Please try again.';
}
