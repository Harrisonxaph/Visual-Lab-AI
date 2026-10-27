import { seededRandom } from "../datasets/example";
import {
  cloneModel,
  evaluate,
  initModel,
  parameterEvidence,
  trainEpoch,
  type Evaluation,
  type ParameterEvidence,
  type SoftmaxModel,
  type Vector,
} from "./softmax";
import type { EpochRecord, TrainingSettings } from "./types";

export const DEFAULT_SETTINGS = {
  learningRate: 0.5,
  epochs: 50,
  batchSize: 16,
} as const;
export const SETTING_RANGES = {
  learningRate: { min: 0.01, max: 2 },
  epochs: { min: 1, max: 300 },
} as const;

/** Problems with the chosen settings, in plain words; empty when they are usable. */
export function validateSettings(
  s: Pick<TrainingSettings, "learningRate" | "epochs" | "perLabelCap">,
) {
  const problems: string[] = [];
  const { learningRate: lr, epochs } = SETTING_RANGES;
  if (!(s.learningRate >= lr.min && s.learningRate <= lr.max))
    problems.push(`Learning rate must be between ${lr.min} and ${lr.max}.`);
  if (
    !Number.isInteger(s.epochs) ||
    s.epochs < epochs.min ||
    s.epochs > epochs.max
  )
    problems.push(
      `Epochs must be a whole number from ${epochs.min} to ${epochs.max}.`,
    );
  if (
    s.perLabelCap !== null &&
    (!Number.isInteger(s.perLabelCap) || s.perLabelCap < 1)
  )
    problems.push(
      "The photo limit per label must be a whole number of at least 1, or blank.",
    );
  return problems;
}

export interface TrainingData {
  trainX: readonly Vector[];
  trainY: readonly number[];
  validationX: readonly Vector[];
  validationY: readonly number[];
  classes: number;
  dims: number;
}

export interface TrainingRun {
  initial: SoftmaxModel;
  model: SoftmaxModel;
  history: EpochRecord[];
  stoppedEarly: boolean;
  /** Validation results with the starting weights and with the final weights (null without validation photos). */
  before: Evaluation | null;
  after: Evaluation | null;
  evidence: ParameterEvidence;
}

function record(epoch: number, m: SoftmaxModel, d: TrainingData): EpochRecord {
  const t = evaluate(m, d.trainX, d.trainY);
  const v = d.validationX.length
    ? evaluate(m, d.validationX, d.validationY)
    : null;
  return {
    epoch,
    trainLoss: t.loss,
    trainAccuracy: t.accuracy,
    validationLoss: v?.loss ?? null,
    validationAccuracy: v?.accuracy ?? null,
  };
}

/** Lets the browser draw and respond between epochs. */
const nextTask = () => new Promise<void>((r) => setTimeout(r, 0));

/**
 * Trains the classifier one epoch at a time. Epoch 0 in the history is the untrained starting
 * point. Cancelling keeps everything learned so far (marked as stopped early). Same data,
 * settings and seed always give the same weights.
 */
export async function runTraining(
  data: TrainingData,
  settings: TrainingSettings,
  options: {
    signal?: AbortSignal;
    onEpoch?: (r: EpochRecord, m: SoftmaxModel) => void;
    yieldBetweenEpochs?: () => Promise<void>;
  } = {},
): Promise<TrainingRun> {
  const pause = options.yieldBetweenEpochs ?? nextTask;
  const initial = initModel(data.classes, data.dims, settings.seed);
  const model = cloneModel(initial);
  const random = seededRandom(settings.seed ^ 0x5bd1e995);
  const history = [record(0, model, data)];
  options.onEpoch?.(history[0], model);
  let stoppedEarly = false;
  for (let epoch = 1; epoch <= settings.epochs; epoch++) {
    await pause();
    if (options.signal?.aborted) {
      stoppedEarly = true;
      break;
    }
    trainEpoch(
      model,
      data.trainX,
      data.trainY,
      settings.learningRate,
      settings.batchSize,
      random,
    );
    history.push(record(epoch, model, data));
    options.onEpoch?.(history.at(-1)!, model);
  }
  const hasValidation = data.validationX.length > 0;
  return {
    initial,
    model,
    history,
    stoppedEarly,
    before: hasValidation
      ? evaluate(initial, data.validationX, data.validationY)
      : null,
    after: hasValidation
      ? evaluate(model, data.validationX, data.validationY)
      : null,
    evidence: parameterEvidence(initial, model),
  };
}

/** One honest sentence about what changed on the validation photos. */
export function describeOutcome(
  run: Pick<TrainingRun, "history" | "stoppedEarly">,
) {
  const first = run.history[0],
    last = run.history.at(-1)!;
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const epochs = last.epoch;
  const prefix = run.stoppedEarly
    ? `Stopped early after ${epochs} of the planned epochs. `
    : `Trained for ${epochs} epochs. `;
  if (!epochs) return prefix + "No training happened, so nothing changed.";
  const lossText = `Training loss went from ${first.trainLoss.toFixed(3)} to ${last.trainLoss.toFixed(3)}.`;
  if (first.validationAccuracy === null || last.validationAccuracy === null)
    return `${prefix}${lossText} There were no validation photos, so there is no check on unseen photos.`;
  const a = first.validationAccuracy,
    b = last.validationAccuracy;
  const verdict =
    b > a
      ? `Validation accuracy improved from ${pct(a)} to ${pct(b)}.`
      : b === a
        ? `Validation accuracy did not change (${pct(a)}).`
        : `Validation accuracy got worse, from ${pct(a)} to ${pct(b)}.`;
  return `${prefix}${lossText} ${verdict}`;
}
