import { seededRandom } from "../datasets/example";
import { TrainingUnstableError, type Vector } from "./softmax";
import { validateSettings, type TrainingData } from "./trainer";
import { CancelledError } from "./embeddings";
import { LIMITS } from "../datasets/limits";
import { ENCODER } from "./encoder";
import type { EpochRecord, TrainingSettings } from "./types";

/** Eight tanh hidden units and a softmax output; defaults preserve the numeric lesson.
 * Photo comparisons train on frozen features; this is not a saved model format. */
export interface TinyNetwork {
  dims: number;
  classes: number;
  input: Float64Array;
  hiddenBias: Float64Array;
  output: Float64Array;
  outputBias: Float64Array;
}
const keys = ["input", "hiddenBias", "output", "outputBias"] as const;
export function initNetwork(seed: number, dims = 2, classes = 2): TinyNetwork {
  const random = seededRandom(seed);
  const weights = (length: number, fanIn: number, fanOut: number) => {
    const limit = Math.sqrt(6 / (fanIn + fanOut));
    return Float64Array.from({ length }, () => (2 * random() - 1) * limit);
  };
  return {
    dims,
    classes,
    input: weights(dims * 8, dims, 8),
    hiddenBias: new Float64Array(8),
    output: weights(classes * 8, 8, classes),
    outputBias: new Float64Array(classes),
  };
}
function forward(model: TinyNetwork, x: Vector) {
  const hidden = Float64Array.from({ length: 8 }, (_, h) => {
    let sum = model.hiddenBias[h];
    for (let j = 0; j < model.dims; j++)
      sum += model.input[h * model.dims + j] * x[j];
    return Math.tanh(sum);
  });
  const scores = Float64Array.from({ length: model.classes }, (_, k) => {
    let sum = model.outputBias[k];
    for (let h = 0; h < 8; h++) sum += model.output[k * 8 + h] * hidden[h];
    return sum;
  });
  const max = Math.max(...scores),
    sum = scores.reduce((s, score) => s + Math.exp(score - max), 0);
  const probabilities = scores.map((score) => Math.exp(score - max) / sum);
  return { hidden, scores, probabilities, logSum: max + Math.log(sum) };
}
/** Exact mean CE gradient, including the tanh derivative and both layers' biases. */
export function networkGradients(
  model: TinyNetwork,
  xs: readonly Vector[],
  ys: readonly number[],
  indices = xs.map((_, i) => i),
  l2 = 0,
) {
  const gradient: TinyNetwork = {
    dims: model.dims,
    classes: model.classes,
    input: new Float64Array(model.input.length),
    hiddenBias: new Float64Array(8),
    output: new Float64Array(model.output.length),
    outputBias: new Float64Array(model.classes),
  };
  let loss = 0;
  for (const i of indices) {
    const { hidden, scores, probabilities, logSum } = forward(model, xs[i]);
    loss += logSum - scores[ys[i]];
    const dh = new Float64Array(8);
    for (let k = 0; k < model.classes; k++) {
      const delta = (probabilities[k] - (k === ys[i] ? 1 : 0)) / indices.length;
      gradient.outputBias[k] += delta;
      for (let h = 0; h < 8; h++) {
        gradient.output[k * 8 + h] += delta * hidden[h];
        dh[h] += delta * model.output[k * 8 + h];
      }
    }
    for (let h = 0; h < 8; h++) {
      const delta = dh[h] * (1 - hidden[h] ** 2);
      gradient.hiddenBias[h] += delta;
      for (let j = 0; j < model.dims; j++)
        gradient.input[h * model.dims + j] += delta * xs[i][j];
    }
  }
  const penalty = networkPenalty(model, l2);
  if (l2 > 0)
    for (const key of ["input", "output"] as const)
      for (let i = 0; i < model[key].length; i++)
        gradient[key][i] += l2 * model[key][i];
  return { ...gradient, loss: loss / indices.length + penalty };
}
function networkPenalty(model: TinyNetwork, l2: number) {
  if (!Number.isFinite(l2) || l2 < 0 || l2 > 1)
    throw new Error("Invalid L2 strength.");
  if (!l2) return 0;
  let sum = 0;
  for (const key of ["input", "output"] as const)
    for (const w of model[key]) sum += w * w;
  return l2 * 0.5 * sum;
}
export function evaluateNetwork(
  model: TinyNetwork,
  xs: readonly Vector[],
  ys: readonly number[],
) {
  let loss = 0,
    correct = 0;
  const predicted: number[] = [],
    confidence: number[] = [];
  xs.forEach((x, i) => {
    const result = forward(model, x);
    loss += result.logSum - result.scores[ys[i]];
    let best = 0;
    for (let k = 1; k < model.classes; k++)
      if (result.scores[k] > result.scores[best]) best = k;
    predicted.push(best);
    confidence.push(result.probabilities[best]);
    if (best === ys[i]) correct++;
  });
  return {
    loss: loss / xs.length,
    accuracy: correct / xs.length,
    predicted,
    confidence,
  };
}
export interface NetworkOptions {
  signal?: AbortSignal;
  onEpoch?: (row: EpochRecord) => void;
  yieldBetweenEpochs?: () => Promise<void>;
  yieldBetweenBatches?: () => Promise<void>;
}
/** Bounded feature training; no pixel, storage or test-split access. */
export async function trainNetwork(
  data: TrainingData,
  settings: TrainingSettings,
  options: NetworkOptions = {},
) {
  if (
    !Number.isInteger(data.dims) ||
    data.dims < 1 ||
    data.dims > ENCODER.dimensions ||
    !Number.isInteger(data.classes) ||
    data.classes < 2 ||
    data.classes > LIMITS.maxLabelsPerDataset ||
    !data.trainX.length ||
    !data.validationX.length ||
    data.trainX.length + data.validationX.length > LIMITS.maxImagesPerDataset ||
    [...data.trainX, ...data.validationX].some(
      (x) => x.length !== data.dims || !Array.from(x).every(Number.isFinite),
    ) ||
    data.trainY.length !== data.trainX.length ||
    data.validationY.length !== data.validationX.length ||
    [...data.trainY, ...data.validationY].some(
      (y) => !Number.isInteger(y) || y < 0 || y >= data.classes,
    ) ||
    validateSettings(settings).length ||
    !Number.isInteger(settings.seed) ||
    settings.seed < 0 ||
    settings.seed > 4294967295 ||
    !Number.isInteger(settings.batchSize) ||
    settings.batchSize < 1 ||
    settings.batchSize > LIMITS.maxImagesPerDataset
  )
    throw new Error("Invalid network data or training configuration.");
  const l2 = settings.l2 ?? 0;
  const initial = initNetwork(settings.seed, data.dims, data.classes),
    model = structuredClone(initial);
  const random = seededRandom(settings.seed ^ 0x5bd1e995);
  const history: EpochRecord[] = [];
  const record = (epoch: number) => {
    const t = evaluateNetwork(model, data.trainX, data.trainY),
      v = evaluateNetwork(model, data.validationX, data.validationY);
    const row: EpochRecord = {
      epoch,
      trainLoss: t.loss,
      trainAccuracy: t.accuracy,
      ...(l2 > 0 ? { trainObjective: t.loss + networkPenalty(model, l2) } : {}),
      validationLoss: v.loss,
      validationAccuracy: v.accuracy,
    };
    if (Object.values(row).some((x) => !Number.isFinite(x)))
      throw new TrainingUnstableError();
    history.push(row);
    options.onEpoch?.(row);
  };
  record(0);
  const pause =
    options.yieldBetweenEpochs ??
    (() => new Promise<void>((r) => setTimeout(r, 0)));
  let stoppedEarly = false;
  for (let epoch = 1; epoch <= settings.epochs; epoch++) {
    await pause();
    if (options.signal?.aborted) {
      stoppedEarly = true;
      break;
    }
    const order = data.trainX.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (let start = 0; start < order.length; start += settings.batchSize) {
      if (options.yieldBetweenBatches) await options.yieldBetweenBatches();
      if (options.signal?.aborted) throw new CancelledError();
      const gradient = networkGradients(
        model,
        data.trainX,
        data.trainY,
        order.slice(start, start + settings.batchSize),
        l2,
      );
      for (const key of keys)
        for (let j = 0; j < model[key].length; j++) {
          model[key][j] -= settings.learningRate * gradient[key][j];
          if (!Number.isFinite(model[key][j]))
            throw new TrainingUnstableError();
        }
    }
    record(epoch);
  }
  const change = (key: "input" | "output") =>
    model[key].reduce((sum, v, i) => sum + Math.abs(v - initial[key][i]), 0) /
    model[key].length;
  return {
    initial,
    model,
    history,
    stoppedEarly,
    evidence: {
      count:
        model.input.length +
        model.hiddenBias.length +
        model.output.length +
        model.outputBias.length,
      inputMeanAbsChange: change("input"),
      outputMeanAbsChange: change("output"),
    },
  };
}
