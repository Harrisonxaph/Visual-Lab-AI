import { expect, test } from "vitest";
import {
  evaluateTrackingSequence,
  runSyntheticBenchmark,
} from "../src/tracking/benchmark";
import type {
  SyntheticFixture,
  PredictionFrame,
} from "../src/tracking/fixtures";
const box = { x: 0.1, y: 0.1, width: 0.2, height: 0.2 };
const fixture = (visibility: boolean[]): SyntheticFixture => ({
  id: "test",
  version: 1,
  frames: visibility.map((visible, i) => ({
    atMs: i * 100,
    truth: [{ id: "A", box, visible }],
    detections: [],
  })),
  occlusions: [{ truthId: "A", startMs: 200, endMs: 400 }],
});
const predictions = (ids: (number | null)[]): PredictionFrame[] =>
  ids.map((id, i) => ({
    atMs: i * 100,
    tracks: id === null ? [] : [{ id, birthOrder: id, box }],
  }));
test("independent evaluation includes initial misses, fragments and ID changes; occluded truth excluded", () => {
  const f = fixture([true, true, false, false, true, true]);
  const perfect = evaluateTrackingSequence(
    f,
    predictions([1, 1, null, null, 1, 1]),
  );
  expect(perfect).toMatchObject({
    visibleTruth: 4,
    misses: 0,
    fragments: 0,
    idChanges: 0,
    recoveryEligible: 1,
    recovered: 1,
  });
  expect(
    evaluateTrackingSequence(f, predictions([null, 1, null, null, null, 2])),
  ).toMatchObject({
    visibleTruth: 4,
    misses: 2,
    fragments: 1,
    idChanges: 1,
    recovered: 0,
  });
  expect(
    evaluateTrackingSequence(
      f,
      predictions([null, null, null, null, null, null]),
    ).recoveryRate,
  ).toBeNull();
});
test("missing recovery counts as failed; a different first ID cannot be rescued later", () => {
  const f = fixture([true, true, false, false, true, true]);
  expect(
    evaluateTrackingSequence(f, predictions([1, 1, null, null, null, null])),
  ).toMatchObject({ recoveryEligible: 1, recovered: 0, recoveryRate: 0 });
  const r = evaluateTrackingSequence(f, predictions([1, 1, null, null, 2, 1]));
  expect(r.recovered).toBe(0);
  expect(r.recoveries[0]).toMatchObject({ firstId: 2, preId: 1, startMs: 400 });
  const delayed = evaluateTrackingSequence(
    f,
    predictions([1, 1, null, null, null, 1]),
  );
  expect(delayed.recovered).toBe(1);
});
test("eligible assignment maximizes match count before IoU and includes equality .50", () => {
  const a = { x: 0, y: 0, width: 0.3, height: 0.2 },
    b = { x: 0.12, y: 0, width: 0.3, height: 0.2 };
  const f: SyntheticFixture = {
    id: "ambiguous",
    version: 1,
    frames: [
      {
        atMs: 0,
        detections: [],
        truth: [
          { id: "A", visible: true, box: a },
          { id: "B", visible: true, box: b },
        ],
      },
    ],
    occlusions: [],
  };
  const r = evaluateTrackingSequence(f, [
    {
      atMs: 0,
      tracks: [
        { id: 1, birthOrder: 1, box: { ...a, x: 0.05 } },
        { id: 2, birthOrder: 2, box: { ...a, x: -0.03 } },
      ],
    },
  ]);
  expect(r.misses).toBe(0);
  const eq = fixture([true]);
  eq.occlusions = [];
  expect(
    evaluateTrackingSequence(eq, [
      {
        atMs: 0,
        tracks: [{ id: 1, birthOrder: 1, box: { ...box, width: 0.1 } }],
      },
    ]).misses,
  ).toBe(0);
});
test("recovery window ends at the next declared occlusion or 1000 ms, with unscorable cases excluded", () => {
  const f = fixture([true, true, false, false, true, false, true]);
  f.occlusions.push({ truthId: "A", startMs: 500, endMs: 600 });
  const r = evaluateTrackingSequence(
    f,
    predictions([1, 1, null, null, null, null, 1]),
  );
  expect(r.recoveries[0]).toMatchObject({
    endMs: 500,
    firstId: null,
    success: false,
  });
  const long = fixture(Array.from({ length: 17 }, (_, i) => i < 2 || i >= 4));
  expect(
    evaluateTrackingSequence(
      long,
      predictions(
        Array.from({ length: 17 }, (_, i) => (i < 2 || i === 16 ? 1 : null)),
      ),
    ).recovered,
  ).toBe(0);
});
test("benchmark is cancellable at chunk boundaries and never yields a completed partial result", async () => {
  const controller = new AbortController();
  const f = fixture(Array(30).fill(true));
  let yields = 0;
  await expect(
    runSyntheticBenchmark([f], controller.signal, async () => {
      yields++;
      controller.abort();
    }),
  ).rejects.toThrow(/cancel/i);
  expect(yields).toBe(1);
  await expect(
    runSyntheticBenchmark(
      [{ ...f, frames: Array(121).fill(f.frames[0]) }],
      new AbortController().signal,
    ),
  ).rejects.toThrow(/limit/i);
});

test("equal global IoU ties preserve truth-ID then prediction birth-order across frames", () => {
  const f: SyntheticFixture = {
    id: "ties",
    version: 1,
    occlusions: [],
    frames: [0, 100].map((atMs) => ({
      atMs,
      detections: [],
      truth: [
        { id: "A", box, visible: true },
        { id: "B", box, visible: true },
      ],
    })),
  };
  const r = evaluateTrackingSequence(f, [
    {
      atMs: 0,
      tracks: [
        { id: 1, birthOrder: 1, box },
        { id: 2, birthOrder: 2, box },
      ],
    },
    {
      atMs: 100,
      tracks: [
        { id: 1, birthOrder: 1, box: { ...box, width: 0.16 } },
        { id: 2, birthOrder: 2, box: { ...box, width: 0.18 } },
      ],
    },
  ]);
  expect(r.idChanges).toBe(0);
});

test("bundled numeric fixtures report actual outcomes without detector inference", async () => {
  const { SYNTHETIC_FIXTURES } = await import("../src/tracking/fixtures");
  const reports = await runSyntheticBenchmark(
    SYNTHETIC_FIXTURES,
    new AbortController().signal,
    async () => {},
  );
  expect(reports).toHaveLength(6);
  expect(reports.find((r) => r.fixtureId === "single-motion")).toMatchObject({
    visibleTruth: 40,
    misses: 1,
    idChanges: 0,
  });
  expect(reports.find((r) => r.fixtureId === "short-occlusion")).toMatchObject({
    recoveryEligible: 1,
    recovered: 1,
  });
  expect(reports.every((r) => r.detectorInference === "not run")).toBe(true);
  console.log(
    "SYNTHETIC_OUTCOMES",
    JSON.stringify(
      reports.map(
        ({
          fixtureId,
          misses,
          idChanges,
          fragments,
          recovered,
          recoveryEligible,
        }) => ({
          fixtureId,
          misses,
          idChanges,
          fragments,
          recovered,
          recoveryEligible,
        }),
      ),
    ),
  );
});
