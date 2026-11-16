import { seededRandom } from "../datasets/example";
import { runTraining, type TrainingData } from "./trainer";
import type { TrainingSettings } from "./types";
import { trainNetwork, type NetworkOptions } from "./nonlinear";

export const LESSON_IDS = ["learnable", "overfitting", "underfitting"] as const;
export type LessonId = (typeof LESSON_IDS)[number];

export interface LearningLesson {
  id: LessonId;
  title: string;
  explanation: string;
  data: TrainingData;
  settings: TrainingSettings;
}

const unit = (values: number[]) => {
  const length = Math.hypot(...values);
  return values.map((v) => v / length);
};

/** Small controlled numeric tasks, not photos, embeddings from a model, or a test dataset. */
export function createLesson(id: LessonId): LearningLesson {
  const random = seededRandom(2026);
  const settings: TrainingSettings = {
    seed: 42,
    learningRate: 0.5,
    epochs: 50,
    batchSize: 16,
    perLabelCap: null,
  };
  let classes: number,
    dims: number,
    trainCount: number,
    validationCount: number;
  let sample: (i: number) => { x: number[]; y: number };
  let title: string, explanation: string;
  switch (id) {
    case "learnable":
      classes = 3;
      dims = 12;
      trainCount = 24;
      validationCount = 90;
      title = "Learning a useful relationship";
      explanation =
        "Each label has a consistent numeric direction, with some noise. The same relationship appears in separate validation examples, so both losses should fall. This is a deliberately easy task.";
      sample = (i) => ({
        y: i % classes,
        x: unit(
          Array.from(
            { length: dims },
            (_, j) => (j === i % classes ? 1 : 0) + (random() - 0.5) * 0.25,
          ),
        ),
      });
      break;
    case "overfitting":
      classes = 3;
      dims = 48;
      trainCount = 24;
      validationCount = 90;
      settings.epochs = 150;
      title = "Overfitting: memorising random labels";
      explanation =
        "Labels are assigned independently of the random features. With enough weights the classifier can memorise the small training set. Separate validation examples have no useful label relationship to learn. A high training score is not evidence of useful predictions.";
      sample = (i) => ({
        y: i % classes,
        x: unit(Array.from({ length: dims }, () => random() - 0.5)),
      });
      break;
    case "underfitting":
      classes = 2;
      dims = 2;
      trainCount = 48;
      validationCount = 80;
      settings.epochs = 100;
      title = "Underfitting: a model that is too simple";
      explanation =
        "The label depends on whether two signs match (an XOR-style rule). A single straight decision boundary cannot separate all four groups. More passes alone cannot give this linear classifier the missing nonlinear capacity.";
      sample = (i) => {
        const x = i % 4 < 2 ? 1 : -1;
        const y = i % 2 ? 1 : -1;
        return {
          y: x === y ? 0 : 1,
          x: unit([x + (random() - 0.5) * 0.1, y + (random() - 0.5) * 0.1]),
        };
      };
      break;
    default:
      throw new Error("Unknown learning lesson.");
  }
  const training = Array.from({ length: trainCount }, (_, i) => sample(i));
  const validation = Array.from({ length: validationCount }, (_, i) =>
    sample(i),
  );
  return {
    id,
    title,
    explanation,
    settings,
    data: {
      classes,
      dims,
      trainX: training.map((s) => s.x),
      trainY: training.map((s) => s.y),
      validationX: validation.map((s) => s.x),
      validationY: validation.map((s) => s.y),
    },
  };
}

/** Uses the same real optimiser as the photo classifier, with separate numeric examples. */
export async function runLesson(
  id: LessonId,
  options: Parameters<typeof runTraining>[2] = {},
) {
  const lesson = createLesson(id);
  const run = await runTraining(lesson.data, lesson.settings, options);
  return { lesson, run };
}

/** Both methods receive exactly the same generated examples, settings and shuffle seed.
 * Equal epochs are not equal compute; initialisation and parameter counts differ. */
export async function runCapacityComparison(
  options: Omit<NetworkOptions, "onEpoch"> & {
    onEpoch?: (
      method: "linear" | "network",
      row: import("./types").EpochRecord,
    ) => void;
  } = {},
) {
  const lesson = createLesson("underfitting");
  const linear = await runTraining(lesson.data, lesson.settings, {
    ...options,
    onEpoch: (row) => options.onEpoch?.("linear", row),
  });
  if (linear.stoppedEarly || options.signal?.aborted)
    return { lesson, linear, network: null, complete: false };
  const network = await trainNetwork(lesson.data, lesson.settings, {
    ...options,
    onEpoch: (row) => options.onEpoch?.("network", row),
  });
  return {
    lesson,
    linear,
    network,
    complete: !network.stoppedEarly && !options.signal?.aborted,
  };
}
