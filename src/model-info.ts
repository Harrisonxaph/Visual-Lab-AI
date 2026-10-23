import type { DetectorConfiguration } from "./inference/types";
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
    outputNotes: `Output floor: ${config.floor * 100}%; at most ${config.maxResults} results after model postprocessing. Other predictions may be omitted. No tracking, alternative-class analysis or retraining in this phase.`,
  };
}
