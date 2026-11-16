import { seededRandom } from "../datasets/example";
import { relatedGroups } from "../datasets/splits";
import { CancelledError } from "./embeddings";
import { predict, shuffledIndices, type SoftmaxModel } from "./softmax";
import { runTraining, type TrainingRun } from "./trainer";
export interface AcquisitionSample {
  id: string;
  label: number;
  sha256: string;
  dhash: string;
  x: Float32Array;
}
export const ACQUISITION_SETTINGS = {
  seed: 42,
  learningRate: 0.5,
  epochs: 50,
  batchSize: 16,
  perLabelCap: null,
  l2: 0,
} as const;
/** The selector has no truth field. Oracle labels are revealed only after it returns IDs. */
export function chooseBatch(
  pool: readonly Pick<AcquisitionSample, "id" | "x">[],
  model: SoftmaxModel,
  budget: number,
  seed: number,
) {
  if (
    !Number.isInteger(budget) ||
    budget < 1 ||
    budget > pool.length ||
    new Set(pool.map((s) => s.id)).size !== pool.length
  )
    throw new Error("Invalid acquisition budget or pool.");
  const margins = pool.map((s) => {
    const p = Array.from(predict(model, s.x)).sort((a, b) => b - a);
    if (p.length < 2 || !p.every(Number.isFinite))
      throw new Error("Invalid acquisition predictions.");
    return { id: s.id, margin: p[0] - p[1] };
  });
  return {
    uncertainty: margins
      .sort((a, b) => a.margin - b.margin || a.id.localeCompare(b.id))
      .slice(0, budget)
      .map((s) => s.id),
    random: shuffledIndices(pool.length, seededRandom(seed))
      .slice(0, budget)
      .map((i) => pool[i].id),
  };
}
/** A controlled oracle simulation on generated data, never a personal-photo human-review result. */
export async function runAcquisitionExperiment(
  input: readonly AcquisitionSample[],
  classes: number,
  options: {
    signal?: AbortSignal;
    yieldBetweenEpochs?: () => Promise<void>;
    onProgress?: (arm: string, epoch: number) => void;
  } = {},
) {
  if (options.signal?.aborted) throw new CancelledError();
  const dims = input[0]?.x.length ?? 0;
  if (
    classes < 2 ||
    classes > 10 ||
    !Number.isInteger(classes) ||
    input.length > 60 ||
    dims < 1 ||
    dims > 1024 ||
    new Set(input.map((s) => s.id)).size !== input.length ||
    input.some(
      (s) =>
        !s.id ||
        !s.sha256 ||
        !/^[0-9a-f]{16}$/.test(s.dhash) ||
        !Number.isInteger(s.label) ||
        s.label < 0 ||
        s.label >= classes ||
        s.x.length !== dims ||
        !s.x.every(Number.isFinite),
    )
  )
    throw new Error("Invalid generated experiment inputs.");
  const hashes = new Set<string>();
  const unique = input.filter((s) => {
    if (hashes.has(s.sha256)) return false;
    hashes.add(s.sha256);
    return true;
  });
  const representatives = new Set(relatedGroups(unique).map((g) => g[0]));
  const samples = unique.filter((s) => representatives.has(s.id));
  const initial: AcquisitionSample[] = [],
    validation: AcquisitionSample[] = [],
    pool: AcquisitionSample[] = [];
  // Predeclared balanced seed/validation design; never tuned from model scores or validation results.
  for (let k = 0; k < classes; k++) {
    const mine = samples.filter((s) => s.label === k);
    if (mine.length < 8)
      throw new Error(
        "Too few independent generated examples for the fixed experiment.",
      );
    initial.push(...mine.slice(0, 2));
    validation.push(...mine.slice(-4));
    pool.push(...mine.slice(2, -4));
  }
  const settings = { ...ACQUISITION_SETTINGS },
    budget = 2 * classes;
  const data = (train: AcquisitionSample[]) => ({
    trainX: train.map((s) => s.x),
    trainY: train.map((s) => s.label),
    validationX: validation.map((s) => s.x),
    validationY: validation.map((s) => s.label),
    classes,
    dims,
  });
  const train = async (items: AcquisitionSample[], arm: string) => {
    const result = await runTraining(data(items), settings, {
      ...options,
      onEpoch: (row) => options.onProgress?.(arm, row.epoch),
    });
    if (result.stoppedEarly || options.signal?.aborted)
      throw new CancelledError();
    return result;
  };
  const base = await train(initial, "initial");
  const chosen = chooseBatch(
    pool.map(({ id, x }) => ({ id, x })),
    base.model,
    budget,
    settings.seed,
  );
  // Acquisition chooses membership, not SGD ordering. Identical sets must train identically.
  const reveal = (ids: string[]) => {
    const selected = new Set(ids);
    return pool.filter((s) => selected.has(s.id));
  };
  const a = await train(
    [...initial, ...reveal(chosen.uncertainty)],
    "uncertainty",
  );
  const b = await train([...initial, ...reveal(chosen.random)], "random");
  const measurement = (run: TrainingRun) => ({
    loss: run.after!.loss,
    accuracy: run.after!.accuracy,
    meanParameterChange: run.evidence.meanAbsChange,
  });
  return {
    protocol: "matched-acquisition/v1" as const,
    settings,
    classes,
    dims,
    budget,
    excluded: input.length - samples.length,
    initial: initial.map((s) => s.id),
    initialExamples: initial.map(({ id, sha256, dhash, label }) => ({
      id,
      sha256,
      dhash,
      label,
    })),
    validation: validation.map(({ id, sha256, dhash, label }) => ({
      id,
      sha256,
      dhash,
      label,
    })),
    pool: pool.map(({ id, sha256, dhash }) => ({ id, sha256, dhash })),
    before: measurement(base),
    uncertainty: {
      ...measurement(a),
      selected: chosen.uncertainty,
      trainingOrder: [...initial, ...reveal(chosen.uncertainty)].map(
        (s) => s.id,
      ),
    },
    random: {
      ...measurement(b),
      selected: chosen.random,
      trainingOrder: [...initial, ...reveal(chosen.random)].map((s) => s.id),
    },
    overlap: chosen.uncertainty.filter((id) => chosen.random.includes(id))
      .length,
  };
}
export type AcquisitionResult = Awaited<
  ReturnType<typeof runAcquisitionExperiment>
>;
