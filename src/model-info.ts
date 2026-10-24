import type { DetectorConfiguration } from "./inference/types";
/** Round display text to hundredths of a percentage point, without changing inference values. */
export function formatPercentage(value: number): string {
  return `${Number((value * 100).toFixed(2))}%`;
}
export function modelDetails(config: DetectorConfiguration) {
  return {
    name: config.name,
    version: config.version,
    runtime: `${config.runtime} · ${config.delegate}/WASM`,
    coverage: `${config.categories} ${config.labelSet} categories`,
    size: `${(config.bytes / 1024 ** 2).toFixed(1)} MiB`,
    source: config.source,
    compatibility: config.compatibility,
    stageLabel: `${config.name} · ${config.delegate}`,
    outputNotes: `Output floor: ${formatPercentage(config.floor)}; at most ${config.maxResults} results after model postprocessing. Other predictions may be omitted. No tracking, alternative-class analysis or retraining in this phase.`,
  };
}
