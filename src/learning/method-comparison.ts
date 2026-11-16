import type { DatasetState } from "../datasets/service";
import { CancelledError } from "./embeddings";
import { BaselineError, prepareBaseline } from "./nearest-neighbour";
import {
  evaluateNetwork,
  trainNetwork,
  type NetworkOptions,
} from "./nonlinear";
import { runTraining, type TrainingData } from "./trainer";
import type { EpochRecord, ModelRecord, TrainingSettings } from "./types";

/** Reuse the exact snapshot, capped order, copy exclusions and sealed-test guards. */
export function prepareMethodComparison(
  state: DatasetState,
  source: ModelRecord,
) {
  if (
    source.stoppedEarly ||
    source.history.at(-1)?.epoch !== source.settings.epochs
  )
    throw new BaselineError(
      "Choose a completed saved run for an equal-epoch comparison.",
    );
  return prepareBaseline(state, source);
}

/** Both methods learn afresh on shared current features; never compare historical training
 * features with recomputed ones. No model persistence or final-test evaluation here. */
export async function runMethodComparison(
  data: TrainingData,
  settings: TrainingSettings,
  options: Omit<NetworkOptions, "onEpoch"> & {
    onEpoch?: (method: "linear" | "network", row: EpochRecord) => void;
  } = {},
) {
  const linear = await runTraining(data, settings, {
    ...options,
    onEpoch: (row) => options.onEpoch?.("linear", row),
  });
  if (linear.stoppedEarly || options.signal?.aborted)
    throw new CancelledError();
  const network = await trainNetwork(data, settings, {
    ...options,
    yieldBetweenBatches:
      options.yieldBetweenBatches ??
      (() => new Promise<void>((r) => setTimeout(r, 0))),
    onEpoch: (row) => options.onEpoch?.("network", row),
  });
  if (network.stoppedEarly || options.signal?.aborted)
    throw new CancelledError();
  return {
    linear,
    network,
    networkEvaluation: evaluateNetwork(
      network.model,
      data.validationX,
      data.validationY,
    ),
  };
}
export type MethodRun = Awaited<ReturnType<typeof runMethodComparison>>;
