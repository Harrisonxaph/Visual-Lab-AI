import { seededRandom } from "../datasets/example";
import { TrainingUnstableError, type Vector } from "./softmax";
import type { TrainingData } from "./trainer";
import type { EpochRecord, TrainingSettings } from "./types";

/** Fixed educational network: 2 numeric inputs → 8 tanh units → 2 softmax outputs.
 * This is not a saved photo classifier and does not consume encoder features. */
export interface TinyNetwork {
  input: Float64Array;
  hiddenBias: Float64Array;
  output: Float64Array;
  outputBias: Float64Array;
}
const keys = ["input", "hiddenBias", "output", "outputBias"] as const;
export function initNetwork(seed: number): TinyNetwork {
  const random = seededRandom(seed),
    limit = Math.sqrt(6 / 10);
  const weights = () =>
    Float64Array.from({ length: 16 }, () => (2 * random() - 1) * limit);
  return {
    input: weights(),
    hiddenBias: new Float64Array(8),
    output: weights(),
    outputBias: new Float64Array(2),
  };
}
function forward(model: TinyNetwork, x: Vector) {
  const hidden = Float64Array.from({ length: 8 }, (_, h) =>
    Math.tanh(
      model.hiddenBias[h] +
        model.input[h * 2] * x[0] +
        model.input[h * 2 + 1] * x[1],
    ),
  );
  const scores = Float64Array.from({ length: 2 }, (_, k) => {
    let sum = model.outputBias[k];
    for (let h = 0; h < 8; h++) sum += model.output[k * 8 + h] * hidden[h];
    return sum;
  });
  const max = Math.max(...scores),
    sum = Math.exp(scores[0] - max) + Math.exp(scores[1] - max);
  const probabilities = scores.map((score) => Math.exp(score - max) / sum);
  return { hidden, scores, probabilities, logSum: max + Math.log(sum) };
}
/** Exact mean CE gradient, including the tanh derivative and both layers' biases. */
export function networkGradients(
  model: TinyNetwork,
  xs: readonly Vector[],
  ys: readonly number[],
  indices = xs.map((_, i) => i),
) {
  const gradient: TinyNetwork = {
    input: new Float64Array(16),
    hiddenBias: new Float64Array(8),
    output: new Float64Array(16),
    outputBias: new Float64Array(2),
  };
  let loss = 0;
  for (const i of indices) {
    const { hidden, scores, probabilities, logSum } = forward(model, xs[i]);
    loss += logSum - scores[ys[i]];
    const dh = new Float64Array(8);
    for (let k = 0; k < 2; k++) {
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
      for (let j = 0; j < 2; j++) gradient.input[h * 2 + j] += delta * xs[i][j];
    }
  }
  return { ...gradient, loss: loss / indices.length };
}
function evaluate(
  model: TinyNetwork,
  xs: readonly Vector[],
  ys: readonly number[],
) {
  let loss = 0,
    correct = 0;
  xs.forEach((x, i) => {
    const result = forward(model, x);
    loss += result.logSum - result.scores[ys[i]];
    if ((result.scores[1] > result.scores[0] ? 1 : 0) === ys[i]) correct++;
  });
  return { loss: loss / xs.length, accuracy: correct / xs.length };
}
export interface NetworkOptions {
  signal?: AbortSignal;
  onEpoch?: (row: EpochRecord) => void;
  yieldBetweenEpochs?: () => Promise<void>;
}
/** Only bounded two-feature lesson data; no images, storage, encoder, regularisation or test set. */
export async function trainNetwork(
  data: TrainingData,
  settings: TrainingSettings,
  options: NetworkOptions = {},
) {
  if (
    data.dims !== 2 ||
    data.classes !== 2 ||
    !data.trainX.length ||
    !data.validationX.length ||
    data.trainX.length + data.validationX.length > 150 ||
    [...data.trainX, ...data.validationX].some(
      (x) => x.length !== 2 || !Array.from(x).every(Number.isFinite),
    ) ||
    data.trainY.length !== data.trainX.length ||
    data.validationY.length !== data.validationX.length ||
    [...data.trainY, ...data.validationY].some((y) => y !== 0 && y !== 1) ||
    !Number.isInteger(settings.epochs) ||
    settings.epochs < 1 ||
    settings.epochs > 150 ||
    !Number.isFinite(settings.learningRate) ||
    settings.learningRate <= 0 ||
    settings.learningRate > 2 ||
    !Number.isInteger(settings.batchSize) ||
    settings.batchSize < 1 ||
    settings.batchSize > 150 ||
    (settings.l2 ?? 0) !== 0
  )
    throw new Error(
      "This network supports bounded, unregularised two-feature lessons only.",
    );
  const initial = initNetwork(settings.seed),
    model = structuredClone(initial);
  const random = seededRandom(settings.seed ^ 0x5bd1e995);
  const history: EpochRecord[] = [];
  const record = (epoch: number) => {
    const t = evaluate(model, data.trainX, data.trainY),
      v = evaluate(model, data.validationX, data.validationY);
    const row = {
      epoch,
      trainLoss: t.loss,
      trainAccuracy: t.accuracy,
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
      const gradient = networkGradients(
        model,
        data.trainX,
        data.trainY,
        order.slice(start, start + settings.batchSize),
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
      count: 42,
      inputMeanAbsChange: change("input"),
      outputMeanAbsChange: change("output"),
    },
  };
}
