import { NetworkFileError, type NetworkFile } from "../learning/network-files";
import type { Evaluation } from "../learning/softmax";
import { classificationMetricsPanel } from "./classification-metrics";

export interface LoadedNetwork {
  file: NetworkFile;
  evaluation: Evaluation;
  truth: number[];
  names: string[];
  excluded: number;
  checkedVersion: number;
  warning: string | null;
}
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text = "") => {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
};
export function networkFilePanel(options: {
  busy: boolean;
  hasDataset: boolean;
  canExport: boolean;
  includeNames: boolean;
  loaded: LoadedNetwork | null;
  onNames(value: boolean): void;
  onExport(): void;
  onImport(file: File): void;
  onClear(): void;
}) {
  const panel = el("section");
  panel.id = "tr-network-files";
  panel.append(
    el("h3", "Neural-network model files — explicit export and reload"),
    el(
      "p",
      "Export the completed comparison's trained network, then reload it with the original dataset and labels. This file includes learned weights, settings, history, dataset/label IDs and image fingerprints, but no photos or cached embeddings. It is private, not anonymous, and is not a dataset backup. Label names are optional and off by default. Nothing is uploaded or saved automatically to the app database.",
    ),
  );
  if (options.canExport) {
    const names = el("input");
    names.type = "checkbox";
    names.checked = options.includeNames;
    names.disabled = options.busy;
    names.dataset.testid = "tr-network-export-names";
    names.addEventListener("change", () => options.onNames(names.checked));
    const label = el("label");
    label.className = "ds-row";
    label.append(names, " Include label names in the model file");
    const save = el("button", "Export trained network (.json)");
    save.type = "button";
    save.className = "button primary";
    save.dataset.testid = "tr-network-export";
    save.disabled = options.busy;
    save.addEventListener("click", options.onExport);
    panel.append(label, save);
  }
  const input = el("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.disabled = options.busy || !options.hasDataset;
  input.dataset.testid = "tr-network-file";
  input.setAttribute(
    "aria-label",
    "Reload a neural-network model file (maximum 1 MiB)",
  );
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    input.value = "";
    if (file) options.onImport(file);
  });
  const label = el(
    "label",
    "Reload and check on current validation (maximum 1 MiB) ",
  );
  label.className = "ds-row";
  label.append(input);
  panel.append(
    label,
    el(
      "p",
      "Reloading performs inference only; no weights learn. The original encoder and dataset/label IDs must match. A changed dataset is checked with a warning and recorded training copies are screened out. No test photos are opened. Imported training history and provenance are file-supplied claims, not independently verified evidence.",
    ),
  );
  if (options.loaded) {
    const { file, evaluation, truth, names, excluded, warning } =
      options.loaded;
    const result = el("div");
    result.id = "tr-network-loaded";
    result.append(
      el(
        "p",
        `Network file checked locally. Current validation cross-entropy ${evaluation.loss.toFixed(4)}; ${truth.length} photos checked, ${excluded} recorded training copies excluded. File-reported configuration: ${file.settings.epochs} epochs, learning rate ${file.settings.learningRate}, seed ${file.settings.seed}, L2 ${file.settings.l2 ?? 0}, dataset version ${file.dataset.version}. Recorded history and provenance are not independently verified. Screening cannot prove the model never learned from unrecorded copies. This is not a final test or proof of general improvement.`,
      ),
    );
    if (warning) result.append(el("p", warning));
    result.append(
      classificationMetricsPanel(names, truth, evaluation.predicted, {
        id: "tr-network-metrics",
        title: "Reloaded network — current validation",
      }),
    );
    const clear = el("button", "Clear reloaded network from page memory");
    clear.type = "button";
    clear.className = "button stop";
    clear.disabled = options.busy;
    clear.dataset.testid = "tr-network-clear";
    clear.addEventListener("click", options.onClear);
    result.append(clear);
    panel.append(result);
  }
  panel.append(
    el(
      "p",
      "The reloaded network remains only in page memory; reload or clear removes it. Deleting app data cannot delete exported files from Downloads/Files. Remove downloads separately; deleting a training photo does not unlearn it from an exported model. Neural-network final-test evaluation is not available yet.",
    ),
  );
  return panel;
}

/** Local, explicit download. Generic filename contains no user names or identifiers. */
export function downloadNetworkFile(json: string) {
  const url = URL.createObjectURL(
    new Blob([json], { type: "application/json" }),
  );
  const link = el("a");
  link.href = url;
  link.download = "visual-labs-network-model.json";
  try {
    document.body.append(link);
    link.click();
  } catch {
    throw new NetworkFileError(
      "This browser could not prepare the network download. Try again; the saved source model was not changed.",
    );
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}
