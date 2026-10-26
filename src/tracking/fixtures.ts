import type { NormalizedDetection, UnitBox } from "./types";
export interface TruthObject {
  id: string;
  box: UnitBox;
  visible: boolean;
}
export interface SyntheticFixture {
  id: string;
  version: number;
  frames: {
    atMs: number;
    truth: TruthObject[];
    detections: NormalizedDetection[];
  }[];
  occlusions: { truthId: string; startMs: number; endMs: number }[];
}
export interface PredictionFrame {
  atMs: number;
  tracks: { id: number; birthOrder: number; box: UnitBox }[];
}
export const SYNTHETIC_FIXTURES: SyntheticFixture[] = [
  "single-motion",
  "crossing",
  "stationary-class-flip",
  "short-occlusion",
  "long-expiry",
  "empty-invalid",
].map((id) => {
  const occlusions =
    id === "short-occlusion"
      ? [{ truthId: "A", startMs: 800, endMs: 1300 }]
      : id === "long-expiry"
        ? [{ truthId: "A", startMs: 800, endMs: 2800 }]
        : [];
  const frames = Array.from({ length: 40 }, (_, i) => {
    const atMs = i * 100;
    const truth: TruthObject[] =
      id === "empty-invalid"
        ? []
        : [
            {
              id: "A",
              box: {
                x:
                  id === "single-motion"
                    ? 0.1 + i * 0.01
                    : id === "crossing"
                      ? 0.1 + i * 0.015
                      : 0.2,
                y: 0.2,
                width: 0.1,
                height: 0.1,
              },
              visible: !occlusions.some(
                (o) => atMs >= o.startMs && atMs < o.endMs,
              ),
            },
            ...(id === "crossing"
              ? [
                  {
                    id: "B",
                    box: {
                      x: 0.8 - i * 0.015,
                      y: 0.2,
                      width: 0.1,
                      height: 0.1,
                    },
                    visible: true,
                  },
                ]
              : []),
          ];
    const detections: NormalizedDetection[] = truth
      .filter((t) => t.visible)
      .map((t, sourceIndex) => ({
        sourceIndex,
        label: id === "stationary-class-flip" && i >= 20 ? "bottle" : "cup",
        score: 0.8,
        box: { ...t.box },
      }));
    if (id === "empty-invalid" && i % 2)
      detections.push({
        sourceIndex: 0,
        label: "cup",
        score: NaN,
        box: { x: 0, y: 0, width: 0, height: 0 },
      });
    return { atMs, truth, detections };
  });
  return { id, version: 1, frames, occlusions };
});
