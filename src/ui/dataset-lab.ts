import { StorageError } from "../datasets/db";
import { LIMITS } from "../datasets/limits";
import {
  DatasetService,
  DeletionPendingError,
  UserError,
  type ImportSummary,
} from "../datasets/service";
import { directlyRelated } from "../datasets/splits";
import { SPLITS, type ImageRecord, type Split } from "../datasets/types";
import { mountAcceptanceChecklist } from "./acceptance-checklist";

const SPLIT_NAMES: Record<Split, string> = {
  train: "Training",
  validation: "Validation",
  test: "Test",
};
const PAGE = 60;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> & {
    dataset?: Record<string, string>;
  } = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  const { dataset, ...rest } = props;
  Object.assign(node, rest);
  if (dataset) Object.assign(node.dataset, dataset);
  node.append(...children);
  return node;
}

const button = (
  text: string,
  onClick: () => void,
  extra: Partial<HTMLButtonElement> & { dataset?: Record<string, string> } = {},
) => {
  const b = el(
    "button",
    { type: "button", className: "button secondary", ...extra },
    text,
  );
  b.addEventListener("click", onClick);
  return b;
};

function formatBytes(n: number) {
  return n < 1024 * 1024
    ? `${Math.round(n / 1024)} KB`
    : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * The Dataset lab: create datasets, labels and splits from photos picked on this device.
 * Everything is stored in this browser only; nothing is uploaded.
 */
export function mountDatasetLab(root: HTMLElement) {
  let service: DatasetService | null = null;
  let busy = false;
  let abort: AbortController | null = null;
  let shown = PAGE;
  let filter = "all";
  let lastSummary: ImportSummary | null = null;
  let progressText = "";
  /** "Delete all" is queued behind another open tab; storage is closed until it finishes. */
  let pendingDeletion = false;
  /** Decoded thumbnails, so re-rendering does not re-read storage (bounded by dataset size). */
  const thumbs = new Map<string, Promise<ImageBitmap | null>>();
  const thumbFor = (s: DatasetService, id: string) => {
    let t = thumbs.get(id);
    if (!t) {
      t = s
        .getBlob(id)
        .then((b) => (b ? createImageBitmap(b.thumb) : null))
        .catch(() => null);
      thumbs.set(id, t);
    }
    return t;
  };

  root.replaceChildren(
    el(
      "div",
      { className: "page-heading" },
      el(
        "div",
        {},
        el("div", { className: "eyebrow" }, "COLLECT. LABEL. SPLIT."),
        el("h1", {}, "Build a dataset", el("span", {}, ".")),
        el(
          "p",
          {},
          "A dataset is a set of example photos, each with a label. A model learns from them in the next lab.",
        ),
      ),
      el(
        "span",
        { className: "phase-badge" },
        "LAB 02 ",
        el("span", {}, "DATASETS"),
      ),
    ),
  );
  const status = el("p", { className: "ds-status", id: "ds-status" });
  status.setAttribute("role", "status");
  const body = el("div", { className: "ds-body" });
  root.append(status, body);

  const say = (text: string) => (status.textContent = text);

  async function run(action: () => Promise<void | string>) {
    if (busy) return;
    busy = true;
    render();
    try {
      const message = await action();
      say(typeof message === "string" ? message : "");
    } catch (error) {
      say(
        error instanceof UserError || error instanceof StorageError
          ? error.message
          : "Something went wrong. Nothing from this step was saved.",
      );
    } finally {
      busy = false;
      render();
    }
  }

  function datasetsPanel(s: DatasetService) {
    const panel = el("section", {
      className: "panel ds-panel",
      id: "ds-datasets",
    });
    panel.append(el("h2", {}, "Datasets"));
    if (s.datasets.length) {
      const select = el("select", { id: "ds-select", disabled: busy });
      select.setAttribute("aria-label", "Current dataset");
      for (const d of s.datasets)
        select.append(
          el(
            "option",
            { value: d.id, selected: d.id === s.current?.dataset.id },
            d.name,
          ),
        );
      select.addEventListener("change", () =>
        run(async () => {
          await s.select(select.value);
          shown = PAGE;
        }),
      );
      panel.append(select);
    }
    const name = el("input", {
      id: "ds-new-name",
      placeholder: "New dataset name",
      maxLength: LIMITS.maxDatasetNameLength,
    });
    name.setAttribute("aria-label", "New dataset name");
    panel.append(
      el(
        "div",
        { className: "ds-row" },
        name,
        button(
          "Create dataset",
          () =>
            run(async () => {
              await s.createDataset(name.value);
              shown = PAGE;
              return "Dataset created. Add a label next.";
            }),
          { disabled: busy, dataset: { testid: "ds-create" } },
        ),
      ),
      el(
        "div",
        { className: "ds-row" },
        button(
          "Load example dataset",
          () =>
            run(async () => {
              const result = await s.loadExample((d, t) => {
                progressText = `Generating example images: ${d} / ${t}`;
                render();
              });
              progressText = "";
              if (result.status === "reopened") {
                lastSummary = null;
                return "Opened the existing example dataset.";
              }
              lastSummary = result.summary;
              if (result.status === "complete")
                return "Example dataset ready: 60 generated shapes, plus one deliberate near-copy and one exact duplicate to show the checks.";
              const sum = result.summary;
              return `Example dataset is incomplete: ${sum.added} of 61 images were saved and ${sum.errors.length} problem${sum.errors.length === 1 ? "" : "s"} occurred${sum.stoppedReason ? ` (${sum.stoppedReason})` : ""}. Tap “Load example dataset” again to retry; the incomplete example will be replaced.`;
            }),
          { disabled: busy, dataset: { testid: "ds-example" } },
        ),
        ...(s.current
          ? [
              button(
                "Delete this dataset",
                () => {
                  if (
                    confirm(
                      `Delete “${s.current!.dataset.name}” and all its images from this device?`,
                    )
                  )
                    run(async () => {
                      await s.deleteDataset(s.current!.dataset.id);
                      return "Dataset deleted from this device.";
                    });
                },
                { disabled: busy, dataset: { testid: "ds-delete-dataset" } },
              ),
            ]
          : []),
      ),
    );
    return panel;
  }

  function labelsPanel(s: DatasetService) {
    const state = s.current!;
    const panel = el("section", {
      className: "panel ds-panel",
      id: "ds-labels",
    });
    panel.append(
      el("h2", {}, "Labels"),
      el(
        "p",
        { className: "ds-help" },
        "A label is a category, such as “mug” or “plant”. Each photo gets one label.",
      ),
    );
    const list = el("ul", { className: "ds-label-list" });
    for (const label of state.labels) {
      const input = el("input", {
        value: label.name,
        maxLength: LIMITS.maxLabelLength,
      });
      input.setAttribute("aria-label", `Name of label ${label.name}`);
      list.append(
        el(
          "li",
          {},
          input,
          button(
            "Rename",
            () => run(() => s.renameLabel(label.id, input.value)),
            {
              disabled: busy,
            },
          ),
          button(
            "Delete (keep photos unlabelled)",
            () => {
              if (
                confirm(
                  `Delete label “${label.name}”? Its photos stay, without a label.`,
                )
              )
                run(() => s.deleteLabel(label.id, "unlabel"));
            },
            { disabled: busy },
          ),
          button(
            "Delete with photos",
            () => {
              if (
                confirm(
                  `Delete label “${label.name}” and all its photos from this device?`,
                )
              )
                run(() => s.deleteLabel(label.id, "delete-images"));
            },
            { disabled: busy },
          ),
        ),
      );
    }
    const name = el("input", {
      id: "ds-new-label",
      placeholder: "New label",
      maxLength: LIMITS.maxLabelLength,
    });
    name.setAttribute("aria-label", "New label name");
    panel.append(
      list,
      el(
        "div",
        { className: "ds-row" },
        name,
        button(
          "Add label",
          () =>
            run(async () => {
              await s.addLabel(name.value);
            }),
          { disabled: busy, dataset: { testid: "ds-add-label" } },
        ),
      ),
    );
    return panel;
  }

  function importPanel(s: DatasetService) {
    const state = s.current!;
    const panel = el("section", {
      className: "panel ds-panel",
      id: "ds-import",
    });
    const label = el("select", { id: "ds-import-label", disabled: busy });
    label.setAttribute("aria-label", "Label for added photos");
    label.append(el("option", { value: "" }, "No label yet"));
    for (const l of state.labels)
      label.append(el("option", { value: l.id }, l.name));
    if (state.labels.length) label.value = state.labels.at(-1)!.id;
    const input = el("input", {
      type: "file",
      accept: "image/*",
      multiple: true,
      id: "ds-file",
      disabled: busy,
    });
    input.setAttribute("aria-label", "Choose photos");
    input.addEventListener("change", () => {
      const files = [...(input.files ?? [])];
      input.value = "";
      if (!files.length) return;
      abort = new AbortController();
      run(async () => {
        lastSummary = await s.importFiles(files, label.value || null, {
          signal: abort!.signal,
          onProgress: (d, t) => {
            progressText = `Adding photos: ${d} / ${t}`;
            status.textContent = progressText;
          },
        });
        progressText = "";
        abort = null;
        return describeSummary(lastSummary);
      });
    });
    panel.append(
      el("h2", {}, "Add photos"),
      el(
        "p",
        { className: "ds-help" },
        `Pick photos from your library or take a photo. Each is shrunk to at most ${LIMITS.storedLongSide} pixels and re-saved, which removes location and camera details. The original file is not kept. Up to ${LIMITS.maxFilesPerImport} at a time, ${LIMITS.maxFileBytes / 1024 / 1024} MB each, ${LIMITS.maxImagesPerDataset} per dataset.`,
      ),
      el("div", { className: "ds-row" }, label, input),
    );
    if (busy && abort)
      panel.append(
        button("Cancel adding photos", () => abort?.abort(), {
          dataset: { testid: "ds-cancel" },
        }),
      );
    if (progressText) panel.append(el("p", {}, progressText));
    if (lastSummary) panel.append(summaryList(lastSummary));
    return panel;
  }

  function describeSummary(sum: ImportSummary) {
    const parts = [`Added ${sum.added} photo${sum.added === 1 ? "" : "s"}.`];
    if (sum.duplicates.length)
      parts.push(
        `Skipped ${sum.duplicates.length} exact duplicate${sum.duplicates.length === 1 ? "" : "s"}.`,
      );
    if (sum.newlyRelated)
      parts.push(
        `${sum.newlyRelated} photo${sum.newlyRelated === 1 ? " is" : "s are"} now marked as related.`,
      );
    if (sum.errors.length)
      parts.push(`${sum.errors.length} could not be added.`);
    if (sum.cancelled) parts.push("Cancelled; photos already added were kept.");
    return parts.join(" ");
  }

  function summaryList(sum: ImportSummary) {
    const list = el("ul", { className: "ds-summary", id: "ds-summary" });
    for (const d of sum.duplicates)
      list.append(
        el(
          "li",
          {},
          `${d}: exact duplicate of a photo already in this dataset, skipped.`,
        ),
      );
    for (const e of sum.errors)
      list.append(el("li", {}, `${e.name}: ${e.message}`));
    for (const m of sum.moves)
      list.append(
        el(
          "li",
          {},
          `A photo moved from ${SPLIT_NAMES[m.from]} to ${SPLIT_NAMES[m.to]} because it looks related to photos there.`,
        ),
      );
    return list;
  }

  function statsPanel(s: DatasetService) {
    const st = s.stats()!;
    const panel = el("section", {
      className: "panel ds-panel",
      id: "ds-stats",
    });
    panel.append(el("h2", {}, "Statistics"));
    const table = el("table", { className: "ds-table" });
    table.append(
      el(
        "tr",
        {},
        el("th", { scope: "col" }, "Label"),
        ...SPLITS.map((sp) => el("th", { scope: "col" }, SPLIT_NAMES[sp])),
        el("th", { scope: "col" }, "Total"),
      ),
    );
    for (const l of st.labels)
      table.append(
        el(
          "tr",
          {},
          el("th", { scope: "row" }, l.name),
          ...SPLITS.map((sp) => el("td", {}, String(l.bySplit[sp]))),
          el("td", {}, String(l.total)),
        ),
      );
    table.append(
      el(
        "tr",
        {},
        el("th", { scope: "row" }, "All labels"),
        ...SPLITS.map((sp) => el("td", {}, String(st.bySplit[sp]))),
        el("td", {}, String(st.total - st.unlabelled)),
      ),
    );
    panel.append(
      table,
      el(
        "p",
        { dataset: { testid: "ds-stat-line" } },
        `${st.total} photos · ${st.unlabelled} unlabelled · ${st.relatedGroups} related group${st.relatedGroups === 1 ? "" : "s"} (${st.relatedImages} photos) · ${st.duplicatesSkipped} exact duplicate${st.duplicatesSkipped === 1 ? "" : "s"} skipped · ${formatBytes(st.storedBytes)} stored · version ${s.current!.dataset.version}`,
      ),
    );
    if (st.warnings.length) {
      const w = el("ul", { className: "ds-warnings" });
      for (const text of st.warnings) w.append(el("li", {}, text));
      panel.append(w);
    }
    panel.append(
      el(
        "p",
        { className: "ds-help" },
        "Training photos teach the model, validation photos check progress while you adjust settings, and test photos are kept aside for one final, honest check. Target shares are 70 / 15 / 15 per label. Unlabelled photos are not in any split.",
      ),
      el(
        "p",
        { className: "ds-notice", id: "ds-leak-notice" },
        "Leakage warning: photos the app identifies as related (exact copies and very similar shots) always stay in the same split. But the similarity check cannot recognise every similar photo — different crops, angles, edits, or very plain images can be missed or wrongly matched — so some similar photos may still end up in different splits.",
      ),
      button(
        "Re-split all photos",
        () => {
          if (
            confirm(
              "Re-split shuffles every photo into training, validation and test again. Results measured on the old splits will no longer apply. Continue?",
            )
          )
            run(async () => {
              await s.resplit();
              return "All photos were re-split.";
            });
        },
        { disabled: busy || !st.total, dataset: { testid: "ds-resplit" } },
      ),
    );
    return panel;
  }

  function imagesPanel(s: DatasetService) {
    const state = s.current!;
    const groups = s.groups();
    const groupOf = new Map<string, number>();
    groups.forEach((g, i) => {
      if (g.length > 1) for (const id of g) groupOf.set(id, i + 1);
    });
    const notRelated = new Set(state.dataset.notRelated);
    const panel = el("section", {
      className: "panel ds-panel",
      id: "ds-images",
    });
    const filterSelect = el("select", { id: "ds-filter" });
    filterSelect.setAttribute("aria-label", "Show photos");
    const options: [string, string][] = [
      ["all", "All photos"],
      ["unlabelled", "Unlabelled"],
      ["related", "Related groups"],
      ...SPLITS.map((sp) => [sp, SPLIT_NAMES[sp]] as [string, string]),
      ...state.labels.map(
        (l) => [`label:${l.id}`, `Label: ${l.name}`] as [string, string],
      ),
    ];
    for (const [v, t] of options)
      filterSelect.append(
        el("option", { value: v, selected: v === filter }, t),
      );
    filterSelect.addEventListener("change", () => {
      filter = filterSelect.value;
      shown = PAGE;
      render();
    });
    const matches = (img: ImageRecord) =>
      filter === "all" ||
      (filter === "unlabelled" && !img.labelId) ||
      (filter === "related" && groupOf.has(img.id)) ||
      img.split === filter ||
      filter === `label:${img.labelId}`;
    const visible = state.images.filter(matches);
    const grid = el("ul", { className: "ds-grid", id: "ds-grid" });
    for (const img of visible.slice(0, shown)) {
      const thumb = el("canvas", { width: 96, height: 96 });
      thumb.setAttribute("role", "img");
      thumb.setAttribute("aria-label", "Photo thumbnail");
      void thumbFor(s, img.id).then((bm) => {
        // Missing thumbnail: the card still shows its label and split.
        if (!bm) return;
        const k = Math.min(96 / bm.width, 96 / bm.height);
        thumb
          .getContext("2d")
          ?.drawImage(
            bm,
            (96 - bm.width * k) / 2,
            (96 - bm.height * k) / 2,
            bm.width * k,
            bm.height * k,
          );
      });
      const labelSelect = el("select", { disabled: busy });
      labelSelect.setAttribute("aria-label", "Label for this photo");
      labelSelect.append(el("option", { value: "" }, "No label"));
      for (const l of state.labels)
        labelSelect.append(
          el("option", { value: l.id, selected: l.id === img.labelId }, l.name),
        );
      labelSelect.addEventListener("change", () =>
        run(async () => {
          const moves = await s.setImageLabel(
            img.id,
            labelSelect.value || null,
          );
          return moves.length
            ? `${moves.length} related photo(s) moved split to stay together.`
            : "Label updated.";
        }),
      );
      const group = groupOf.get(img.id);
      const card = el(
        "li",
        {
          className: "ds-card",
          dataset: { testid: "ds-card", split: img.split ?? "none" },
        },
        thumb,
        labelSelect,
        el(
          "span",
          { className: `ds-split ds-split-${img.split ?? "none"}` },
          img.split ? SPLIT_NAMES[img.split] : "No split",
        ),
      );
      if (group) {
        card.append(
          el("span", { className: "ds-related" }, `Related group ${group}`),
        );
        if (directlyRelated(img.id, state.images, notRelated).length)
          card.append(
            button(
              "Not related",
              () =>
                run(async () => {
                  await s.separateImage(img.id);
                  return "Marked as not related to its group.";
                }),
              { disabled: busy },
            ),
          );
      }
      card.append(
        button(
          "Delete",
          () => {
            if (confirm("Delete this photo from the dataset?"))
              run(async () => {
                await s.deleteImage(img.id);
                return "Photo deleted.";
              });
          },
          { disabled: busy, dataset: { testid: "ds-delete-image" } },
        ),
      );
      grid.append(card);
    }
    panel.append(
      el("h2", {}, "Photos"),
      el(
        "div",
        { className: "ds-row" },
        filterSelect,
        el("span", {}, `${visible.length} shown`),
      ),
      grid,
    );
    if (visible.length > shown)
      panel.append(
        button("Show more", () => {
          shown += PAGE;
          render();
        }),
      );
    return panel;
  }

  function privacyPanel() {
    const panel = el("section", {
      className: "panel ds-panel",
      id: "ds-privacy",
    });
    panel.append(
      el("h2", {}, "Your data"),
      el(
        "p",
        { className: "ds-help" },
        "Datasets are stored only in this browser on this device and are never uploaded. Safari may delete a website's stored data if the site isn't used for about a week, and clearing website data removes it too, so treat datasets here as temporary." +
          (service?.persisted ? " This browser agreed to keep the data." : ""),
      ),
      button(
        "Delete all dataset data on this device",
        () => {
          if (
            confirm(
              "Delete every dataset, label and photo stored by Visual Labs on this device? This cannot be undone.",
            )
          )
            run(async () => {
              const old = service!;
              lastSummary = null;
              try {
                service = await old.deleteAll();
                return "All dataset data was deleted from this device.";
              } catch (error) {
                if (!(error instanceof DeletionPendingError)) {
                  // Deletion failed outright; reopen to show what still exists.
                  service = await DatasetService.open().catch(() => null);
                  throw error;
                }
                service = null;
                pendingDeletion = true;
                error.completion.then(
                  (fresh) => {
                    pendingDeletion = false;
                    service = fresh;
                    say("All dataset data was deleted from this device.");
                    render();
                  },
                  () => {
                    pendingDeletion = false;
                    say(
                      "Deletion failed. Dataset data may still exist on this device. Reload the page to see it.",
                    );
                    render();
                  },
                );
                return error.message;
              }
            });
        },
        {
          disabled: busy || !service,
          className: "button stop",
          dataset: { testid: "ds-delete-all" },
        },
      ),
    );
    return panel;
  }

  const checklist = el("div", { id: "ds-checklist" });
  mountAcceptanceChecklist(checklist);

  function render() {
    const s = service;
    if (!s) {
      if (pendingDeletion)
        body.replaceChildren(
          el(
            "p",
            { className: "ds-notice", id: "ds-pending" },
            "Dataset storage is closed while deletion waits for other Visual Labs tabs to close. This page updates by itself when deletion finishes.",
          ),
        );
      return;
    }
    const live = new Set(s.current?.images.map((i) => i.id) ?? []);
    for (const [id, t] of thumbs)
      if (!live.has(id)) {
        thumbs.delete(id);
        void t.then((bm) => bm?.close());
      }
    const sections: Node[] = [datasetsPanel(s)];
    if (s.current) {
      sections.push(
        labelsPanel(s),
        importPanel(s),
        statsPanel(s),
        imagesPanel(s),
      );
    } else {
      sections.push(
        el(
          "p",
          { className: "ds-help" },
          "No dataset yet. Create one, or load the example dataset to see how it works.",
        ),
      );
    }
    sections.push(privacyPanel(), checklist);
    body.replaceChildren(...sections);
  }

  say("Opening local dataset storage…");
  DatasetService.open()
    .then((s) => {
      service = s;
      say("");
      render();
    })
    .catch((error) => {
      say(
        error instanceof StorageError
          ? `${error.message} The Detection lab still works.`
          : "Dataset storage could not be opened. The Detection lab still works.",
      );
    });
}
