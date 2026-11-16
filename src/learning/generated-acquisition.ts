import { EXAMPLE_LABELS, generateExampleItems } from "../datasets/example";
import { prepareImage } from "../datasets/importer";
import {
  runAcquisitionExperiment,
  type AcquisitionSample,
} from "./acquisition";
import { CancelledError } from "./embeddings";
export const ACQUISITION_GENERATOR_SEED = 502026;
/** Always freshly generated labelled shapes. Never reads or changes a user's stored dataset. */
export async function generatedAcquisition(
  embed: (image: Blob) => Promise<Float32Array>,
  signal: AbortSignal,
  progress: (message: string) => void,
) {
  const check = () => {
    if (signal.aborted) throw new CancelledError();
  };
  check();
  const items = (await generateExampleItems(ACQUISITION_GENERATOR_SEED)).filter(
    (i) => i.kind === "normal",
  );
  const samples: AcquisitionSample[] = [];
  for (const [index, item] of items.entries()) {
    check();
    progress(
      `Preparing generated shapes: ${index + 1} of ${items.length}. No personal photos are used.`,
    );
    const prepared = await prepareImage(item.file);
    check();
    const x = await embed(prepared.image);
    check();
    samples.push({
      id: `shape-${index}`,
      label: EXAMPLE_LABELS.indexOf(item.label),
      sha256: prepared.sha256,
      dhash: prepared.dhash,
      x,
    });
  }
  return runAcquisitionExperiment(samples, EXAMPLE_LABELS.length, {
    signal,
    onProgress: (arm, epoch) =>
      progress(
        `Training ${arm}: epoch ${epoch} of 50. No partial report is published.`,
      ),
  });
}
