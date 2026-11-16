import { expect, it } from "vitest";
import { finalFixture } from "./fixtures/final-check";
import {
  feedbackEvidence,
  cleanFeedback,
} from "../src/learning/feedback-evidence";
import { serializeRunReport } from "../src/learning/run-report";
it("persists allowlisted feedback evidence in reports and rejects invalid comparisons", () => {
  const f = finalFixture(),
    metrics = { accuracy: 0.5, loss: 0.6 };
  const added = { ...f.images[0], id: "new", sha256: "sha-new" };
  const value = feedbackEvidence(
    f.model,
    f.images.slice(0, 2),
    [added],
    f.images.slice(2, 4),
    {
      savedSource: metrics,
      control: { after: metrics },
      expanded: { after: metrics },
    } as any,
  );
  const model = {
    ...f.model,
    id: "expanded",
    datasetVersion: 2,
    trainCount: 3,
    history: [0, 1].map((epoch) => ({
      epoch,
      trainLoss: 0.6,
      trainAccuracy: 0.5,
      validationLoss: 0.6,
      validationAccuracy: 0.5,
    })),
    experiment: {
      ...f.model.experiment!,
      train: [
        ...f.model.experiment!.train,
        { id: added.id, sha256: added.sha256, labelId: added.labelId! },
      ],
    },
    feedback: { ...value, secret: "must not export" },
  };
  const json = serializeRunReport(model);
  expect(json).toContain('"feedback"');
  expect(json).not.toContain("must not export");
  expect(cleanFeedback(value)).toEqual(value);
  expect(() =>
    serializeRunReport({
      ...model,
      feedback: { ...value, expanded: { accuracy: 0.9, loss: 0.6 } },
    }),
  ).toThrow();
  expect(() =>
    cleanFeedback({ ...value, approved: value.originalTrain }),
  ).toThrow();
  expect(() =>
    cleanFeedback({ ...value, control: { accuracy: 2, loss: 0 } }),
  ).toThrow();
});
