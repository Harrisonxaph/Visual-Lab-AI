import { seededRandom } from "../datasets/example";

/**
 * A softmax classifier ("multinomial logistic regression"): the only part of the system that
 * learns. For each label k it keeps one weight per embedding number (row k of `weights`) and a
 * bias. A photo's score for label k is weights[k] · x + bias[k]; softmax turns the scores into
 * probabilities that add up to 1.
 */
export interface SoftmaxModel {
  classes: number;
  dims: number;
  /** classes × dims, row-major: weights[k * dims + j]. */
  weights: Float64Array;
  bias: Float64Array;
}

export type Vector = ArrayLike<number>;

export class TrainingUnstableError extends Error {
  constructor() {
    super(
      "Training became unstable (the numbers grew too large to represent). Lower the learning rate and train again.",
    );
  }
}

/** Standard normal sample from two uniform samples (Box–Muller). */
function normal(random: () => number) {
  const u = Math.max(random(), Number.MIN_VALUE);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
}

/** Small random starting weights (standard deviation `scale`) and zero biases. Same seed, same start. */
export function initModel(
  classes: number,
  dims: number,
  seed: number,
  scale = 0.01,
): SoftmaxModel {
  if (classes < 2 || dims < 1) throw new Error("Need at least two classes.");
  const random = seededRandom(seed);
  const weights = new Float64Array(classes * dims);
  for (let i = 0; i < weights.length; i++) weights[i] = scale * normal(random);
  return { classes, dims, weights, bias: new Float64Array(classes) };
}

export function cloneModel(m: SoftmaxModel): SoftmaxModel {
  return { ...m, weights: m.weights.slice(), bias: m.bias.slice() };
}

/** Class probabilities for one embedding, computed stably (subtracting the largest score). */
export function predict(m: SoftmaxModel, x: Vector): Float64Array {
  if (x.length !== m.dims) throw new Error("Embedding size does not match.");
  const p = new Float64Array(m.classes);
  let max = -Infinity;
  for (let k = 0; k < m.classes; k++) {
    let s = m.bias[k];
    const row = k * m.dims;
    for (let j = 0; j < m.dims; j++) s += m.weights[row + j] * x[j];
    p[k] = s;
    if (s > max) max = s;
  }
  let sum = 0;
  for (let k = 0; k < m.classes; k++) sum += p[k] = Math.exp(p[k] - max);
  for (let k = 0; k < m.classes; k++) p[k] /= sum;
  return p;
}

/** Cross-entropy for one example, from its scores via log-sum-exp (no log(0)). */
function exampleLoss(m: SoftmaxModel, x: Vector, label: number) {
  let max = -Infinity;
  const scores = new Float64Array(m.classes);
  for (let k = 0; k < m.classes; k++) {
    let s = m.bias[k];
    const row = k * m.dims;
    for (let j = 0; j < m.dims; j++) s += m.weights[row + j] * x[j];
    scores[k] = s;
    if (s > max) max = s;
  }
  let sum = 0;
  for (let k = 0; k < m.classes; k++) sum += Math.exp(scores[k] - max);
  return max + Math.log(sum) - scores[label];
}

export interface Gradients {
  loss: number;
  weights: Float64Array;
  bias: Float64Array;
}

/**
 * Mean cross-entropy loss over the given examples and its exact gradient:
 * for each example, (probabilities − one-hot label) times the embedding, averaged.
 */
export function lossAndGradients(
  m: SoftmaxModel,
  xs: readonly Vector[],
  ys: readonly number[],
  indices: readonly number[] = xs.map((_, i) => i),
): Gradients {
  const gw = new Float64Array(m.weights.length);
  const gb = new Float64Array(m.classes);
  let loss = 0;
  const n = indices.length;
  for (const i of indices) {
    const x = xs[i];
    const p = predict(m, x);
    loss -= Math.log(Math.max(p[ys[i]], Number.MIN_VALUE));
    for (let k = 0; k < m.classes; k++) {
      const d = (p[k] - (k === ys[i] ? 1 : 0)) / n;
      gb[k] += d;
      const row = k * m.dims;
      for (let j = 0; j < m.dims; j++) gw[row + j] += d * x[j];
    }
  }
  return { loss: loss / n, weights: gw, bias: gb };
}

export interface Evaluation {
  loss: number;
  accuracy: number;
  /** Predicted class index per example. */
  predicted: number[];
  /** Probability the model gave its prediction (confidence, not correctness). */
  confidence: number[];
}

export function evaluate(
  m: SoftmaxModel,
  xs: readonly Vector[],
  ys: readonly number[],
): Evaluation {
  const predicted: number[] = [];
  const confidence: number[] = [];
  let loss = 0,
    correct = 0;
  xs.forEach((x, i) => {
    const p = predict(m, x);
    let best = 0;
    for (let k = 1; k < m.classes; k++) if (p[k] > p[best]) best = k;
    predicted.push(best);
    confidence.push(p[best]);
    if (best === ys[i]) correct++;
    loss += exampleLoss(m, x, ys[i]);
  });
  const n = xs.length;
  return {
    loss: n ? loss / n : NaN,
    accuracy: n ? correct / n : NaN,
    predicted,
    confidence,
  };
}

/** Deterministic Fisher–Yates shuffle of 0..n-1. */
export function shuffledIndices(n: number, random: () => number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

const allFinite = (a: Float64Array) => a.every(Number.isFinite);

/**
 * One pass over the training examples with mini-batch gradient descent: shuffle (seeded), then
 * for each batch step every weight a little against its gradient. Updates `m` in place.
 * Throws TrainingUnstableError if any number stops being finite.
 */
export function trainEpoch(
  m: SoftmaxModel,
  xs: readonly Vector[],
  ys: readonly number[],
  learningRate: number,
  batchSize: number,
  random: () => number,
) {
  const order = shuffledIndices(xs.length, random);
  for (let start = 0; start < order.length; start += batchSize) {
    const g = lossAndGradients(
      m,
      xs,
      ys,
      order.slice(start, start + batchSize),
    );
    for (let i = 0; i < m.weights.length; i++)
      m.weights[i] -= learningRate * g.weights[i];
    for (let k = 0; k < m.classes; k++) m.bias[k] -= learningRate * g.bias[k];
    if (!Number.isFinite(g.loss) || !allFinite(m.weights) || !allFinite(m.bias))
      throw new TrainingUnstableError();
  }
}

export interface ParameterEvidence {
  count: number;
  normBefore: number;
  normAfter: number;
  meanAbsChange: number;
  /** Length of each label's weight row after training. */
  rowNorms: number[];
}

/** Numbers that show the parameters really changed. */
export function parameterEvidence(
  before: SoftmaxModel,
  after: SoftmaxModel,
): ParameterEvidence {
  const all = (m: SoftmaxModel) => [...m.weights, ...m.bias];
  const a = all(before),
    b = all(after);
  const norm = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  let change = 0;
  for (let i = 0; i < a.length; i++) change += Math.abs(b[i] - a[i]);
  const rowNorms = Array.from({ length: after.classes }, (_, k) =>
    norm(
      Array.from(after.weights.subarray(k * after.dims, (k + 1) * after.dims)),
    ),
  );
  return {
    count: a.length,
    normBefore: norm(a),
    normAfter: norm(b),
    meanAbsChange: change / a.length,
    rowNorms,
  };
}
