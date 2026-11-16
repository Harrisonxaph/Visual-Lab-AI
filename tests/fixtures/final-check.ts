import type {
  DatasetRecord,
  ImageRecord,
  LabelRecord,
} from "../../src/datasets/types";
import type { ModelRecord } from "../../src/learning/types";
import { ENCODER_KEY, ENCODER } from "../../src/learning/encoder";
import { createRunManifest } from "../../src/learning/experiments";
import { selectExamples } from "../../src/learning/examples";
export function finalFixture() {
  const dataset: DatasetRecord = {
    id: "d",
    name: "Fixture",
    createdAt: "2026-11-16T00:00:00Z",
    version: 1,
    seed: 7,
    isExample: false,
    nextOrder: 6,
    duplicatesSkipped: 0,
    notRelated: [],
  };
  const labels = [
    { id: "a", datasetId: "d", name: "a", createdAt: "2026-11-16T00:00:00Z" },
    { id: "b", datasetId: "d", name: "b", createdAt: "2026-11-16T00:00:01Z" },
  ] as LabelRecord[];
  const images = [
    ["ta", "a", "train", "0000000000000000"],
    ["tb", "b", "train", "ffffffffffffffff"],
    ["va", "a", "validation", "ffffffff00000000"],
    ["vb", "b", "validation", "00000000ffffffff"],
    ["xa", "a", "test", "aaaaaaaaaaaaaaaa"],
    ["xb", "b", "test", "5555555555555555"],
  ].map(([id, labelId, split, dhash], order) => ({
    id,
    labelId,
    split,
    dhash,
    order,
    datasetId: "d",
    sha256: `sha-${id}`,
  })) as ImageRecord[];
  const selection = selectExamples(images, labels, ["a", "b"], null, 7);
  const model: ModelRecord = {
    id: "m",
    datasetId: "d",
    datasetVersion: 1,
    name: "Model",
    createdAt: "2026-11-16T00:00:00Z",
    encoderKey: ENCODER_KEY,
    dims: ENCODER.dimensions,
    labelIds: ["a", "b"],
    labelNames: ["a", "b"],
    weights: new Float64Array(2 * ENCODER.dimensions),
    bias: new Float64Array([1, 0]),
    settings: {
      learningRate: 0.5,
      epochs: 1,
      batchSize: 16,
      perLabelCap: null,
      seed: 42,
    },
    history: [
      {
        epoch: 1,
        trainLoss: 0.5,
        trainAccuracy: 0.5,
        validationLoss: 0.5,
        validationAccuracy: 0.5,
      },
    ],
    stoppedEarly: false,
    trainCount: 2,
    validationCount: 2,
    experiment: createRunManifest(7, selection),
    trainImages: images
      .filter((i) => i.split === "train")
      .map(({ id, sha256, dhash }) => ({ id, sha256, dhash })),
  };
  return { dataset, labels, images, model };
}
