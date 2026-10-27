import { DatasetDb, StorageError } from "./db";
import { EXAMPLE_LABELS, generateExampleItems } from "./example";
import { ImportError, prepareImage, type PreparedImage } from "./importer";
import {
  LIMITS,
  normalizeName,
  validateDatasetName,
  validateLabelName,
} from "./limits";
import {
  assignSplits,
  directlyRelated,
  pairKey,
  relatedGroups,
} from "./splits";
import { datasetStats } from "./stats";
import type { EmbeddingRecord, ModelRecord } from "../learning/types";
import type {
  BlobRecord,
  DatasetRecord,
  ImageRecord,
  LabelRecord,
  SplitMove,
} from "./types";

export interface DatasetState {
  dataset: DatasetRecord;
  labels: LabelRecord[];
  images: ImageRecord[];
}

export interface ImportSummary {
  added: number;
  duplicates: string[];
  errors: { name: string; message: string }[];
  moves: SplitMove[];
  newlyRelated: number;
  cancelled: boolean;
  stoppedReason?: string;
}

export class UserError extends Error {}

/**
 * "Delete all" could not finish in time because another connection (usually another tab) is
 * still open. The browser keeps the deletion queued: `completion` settles when it finally
 * finishes (resolving with fresh, empty storage) or fails.
 */
export class DeletionPendingError extends Error {
  constructor(readonly completion: Promise<DatasetService>) {
    super(
      "Deletion is waiting because another tab is using Visual Labs datasets. Close other Visual Labs tabs; deletion finishes then. Until then the data still exists on this device.",
    );
  }
}

export type ExampleResult =
  | { status: "reopened" }
  | { status: "complete" | "incomplete"; summary: ImportSummary };

const newId = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const randomSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];

/** Images whose stored record differs from the original state (by identity). */
function differing(original: ImageRecord[], next: ImageRecord[]) {
  const before = new Map(original.map((i) => [i.id, i]));
  return next.filter((i) => before.get(i.id) !== i);
}

/** Recomputes related groups and splits; returns changed images and moves. */
function recompute(dataset: DatasetRecord, images: ImageRecord[]) {
  const notRelated = new Set(dataset.notRelated);
  const groups = relatedGroups(images, notRelated);
  const { splits, moves } = assignSplits(images, groups, dataset.seed);
  const updated = images.map((img) => {
    const split = splits.get(img.id) ?? null;
    return split === img.split ? img : { ...img, split };
  });
  return {
    images: updated,
    changed: updated.filter((img, i) => img !== images[i]),
    moves,
    groups,
  };
}

/**
 * Owns the dataset currently shown. Every change is computed in memory, written in one
 * IndexedDB transaction, and only then applied to the in-memory state, so a failed write
 * leaves both the stored data and the screen unchanged.
 */
export class DatasetService {
  datasets: DatasetRecord[] = [];
  current: DatasetState | null = null;
  persisted: boolean | null = null;

  private constructor(private db: DatasetDb) {}

  static async open(): Promise<DatasetService> {
    const service = new DatasetService(await DatasetDb.open());
    await service.refreshList();
    if (service.datasets.length) await service.select(service.datasets[0].id);
    return service;
  }

  private async refreshList() {
    this.datasets = await this.db.listDatasets();
  }

  async select(id: string) {
    const dataset = this.datasets.find((d) => d.id === id);
    if (!dataset) throw new UserError("That dataset no longer exists.");
    const { labels, images } = await this.db.loadDataset(id);
    this.current = { dataset, labels, images };
  }

  private requireCurrent(): DatasetState {
    if (!this.current) throw new UserError("Create or choose a dataset first.");
    return this.current;
  }

  private bumped(dataset: DatasetRecord, patch: Partial<DatasetRecord> = {}) {
    return { ...dataset, ...patch, version: dataset.version + 1 };
  }

  private apply(state: DatasetState) {
    this.current = state;
    this.datasets = this.datasets.map((d) =>
      d.id === state.dataset.id ? state.dataset : d,
    );
  }

  async createDataset(name: string, isExample = false): Promise<DatasetRecord> {
    const problem = validateDatasetName(name);
    if (problem) throw new UserError(problem);
    if (this.datasets.length >= LIMITS.maxDatasets)
      throw new UserError(
        `You can keep at most ${LIMITS.maxDatasets} datasets. Delete one first.`,
      );
    const dataset: DatasetRecord = {
      id: newId(),
      name: normalizeName(name),
      createdAt: now(),
      seed: randomSeed(),
      version: 1,
      isExample,
      ...(isExample ? { exampleComplete: false } : {}),
      nextOrder: 1,
      duplicatesSkipped: 0,
      notRelated: [],
    };
    await this.db.commit({ put: { datasets: [dataset] } });
    this.datasets = [...this.datasets, dataset];
    this.current = { dataset, labels: [], images: [] };
    return dataset;
  }

  async addLabel(name: string): Promise<LabelRecord> {
    const state = this.requireCurrent();
    const problem = validateLabelName(
      name,
      state.labels.map((l) => l.name),
    );
    if (problem) throw new UserError(problem);
    const label: LabelRecord = {
      id: newId(),
      datasetId: state.dataset.id,
      name: normalizeName(name),
      createdAt: now(),
    };
    const dataset = this.bumped(state.dataset);
    await this.db.commit({ put: { labels: [label], datasets: [dataset] } });
    this.apply({ ...state, dataset, labels: [...state.labels, label] });
    return label;
  }

  async renameLabel(id: string, name: string) {
    const state = this.requireCurrent();
    const label = state.labels.find((l) => l.id === id);
    if (!label) throw new UserError("That label no longer exists.");
    const problem = validateLabelName(
      name,
      state.labels.filter((l) => l.id !== id).map((l) => l.name),
    );
    if (problem) throw new UserError(problem);
    const renamed = { ...label, name: normalizeName(name) };
    const dataset = this.bumped(state.dataset);
    await this.db.commit({ put: { labels: [renamed], datasets: [dataset] } });
    this.apply({
      ...state,
      dataset,
      labels: state.labels.map((l) => (l.id === id ? renamed : l)),
    });
  }

  /** Deletes a label; its images either become unlabelled or are deleted too. */
  async deleteLabel(id: string, mode: "unlabel" | "delete-images") {
    const state = this.requireCurrent();
    if (!state.labels.some((l) => l.id === id))
      throw new UserError("That label no longer exists.");
    const affected = state.images.filter((i) => i.labelId === id);
    let images =
      mode === "delete-images"
        ? state.images.filter((i) => i.labelId !== id)
        : state.images.map((i) =>
            i.labelId === id ? { ...i, labelId: null, split: null } : i,
          );
    const r = recompute(state.dataset, images);
    images = r.images;
    const removed = mode === "delete-images" ? affected.map((i) => i.id) : [];
    const dataset = this.bumped(state.dataset, {
      notRelated: state.dataset.notRelated.filter(
        (k) => !k.split("|").some((part) => removed.includes(part)),
      ),
    });
    await this.db.commit({
      put: { datasets: [dataset], images: differing(state.images, images) },
      delete: {
        labels: [id],
        images: removed,
        blobs: removed,
        embeddings: removed,
      },
    });
    this.apply({
      dataset,
      labels: state.labels.filter((l) => l.id !== id),
      images,
    });
  }

  async setImageLabel(imageId: string, labelId: string | null) {
    const state = this.requireCurrent();
    if (labelId && !state.labels.some((l) => l.id === labelId))
      throw new UserError("That label no longer exists.");
    if (!state.images.some((i) => i.id === imageId))
      throw new UserError("That image no longer exists.");
    const images = state.images.map((i) =>
      i.id === imageId ? { ...i, labelId, split: labelId ? i.split : null } : i,
    );
    const r = recompute(state.dataset, images);
    const dataset = this.bumped(state.dataset);
    await this.db.commit({
      put: { datasets: [dataset], images: differing(state.images, r.images) },
    });
    this.apply({ ...state, dataset, images: r.images });
    return r.moves;
  }

  /** "Not related": unlink an image from every image it is directly linked to. */
  async separateImage(imageId: string) {
    const state = this.requireCurrent();
    const notRelated = new Set(state.dataset.notRelated);
    const partners = directlyRelated(imageId, state.images, notRelated);
    if (!partners.length) return [];
    for (const p of partners) notRelated.add(pairKey(imageId, p));
    const dataset = this.bumped(state.dataset, { notRelated: [...notRelated] });
    const r = recompute(dataset, state.images);
    await this.db.commit({
      put: { datasets: [dataset], images: r.changed },
    });
    this.apply({ ...state, dataset, images: r.images });
    return r.moves;
  }

  async deleteImage(imageId: string) {
    const state = this.requireCurrent();
    if (!state.images.some((i) => i.id === imageId))
      throw new UserError("That image no longer exists.");
    const dataset = this.bumped(state.dataset, {
      notRelated: state.dataset.notRelated.filter(
        (k) => !k.split("|").includes(imageId),
      ),
    });
    const r = recompute(
      dataset,
      state.images.filter((i) => i.id !== imageId),
    );
    await this.db.commit({
      put: { datasets: [dataset], images: r.changed },
      delete: { images: [imageId], blobs: [imageId], embeddings: [imageId] },
    });
    this.apply({ ...state, dataset, images: r.images });
  }

  /** Reassigns every split with a new seed. Earlier results no longer apply. */
  async resplit() {
    const state = this.requireCurrent();
    const dataset = this.bumped(state.dataset, { seed: randomSeed() });
    const r = recompute(
      dataset,
      state.images.map((i) => ({ ...i, split: null })),
    );
    await this.db.commit({ put: { datasets: [dataset], images: r.images } });
    this.apply({ ...state, dataset, images: r.images });
  }

  async deleteDataset(id: string) {
    const target = this.datasets.find((d) => d.id === id);
    if (!target) return;
    const { labels, images } = await this.db.loadDataset(id);
    const learning = await this.db.learningKeys(id);
    const imageIds = images.map((i) => i.id);
    await this.db.commit({
      delete: {
        datasets: [id],
        labels: labels.map((l) => l.id),
        images: imageIds,
        blobs: imageIds,
        embeddings: learning.embeddings,
        models: learning.models,
      },
    });
    this.datasets = this.datasets.filter((d) => d.id !== id);
    if (this.current?.dataset.id === id) this.current = null;
    if (!this.current && this.datasets.length)
      await this.select(this.datasets[0].id);
  }

  /**
   * Deletes every dataset, label and image this app stored on this device. This service is
   * unusable afterwards; use the returned (or eventually resolved) replacement.
   */
  async deleteAll(timeoutMs = 10000): Promise<DatasetService> {
    this.db.close();
    const completion = DatasetDb.destroy().then(() => DatasetService.open());
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<"timeout">((resolve) => {
      timer = setTimeout(() => resolve("timeout"), timeoutMs);
    });
    try {
      const outcome = await Promise.race([completion, timedOut]);
      if (outcome === "timeout") throw new DeletionPendingError(completion);
      return outcome;
    } finally {
      clearTimeout(timer);
    }
  }

  getBlob(id: string): Promise<BlobRecord | undefined> {
    return this.db.getBlob(id);
  }

  /** Re-reads the dataset list and the current dataset (another lab may have changed them). */
  async reload() {
    await this.refreshList();
    const id = this.current?.dataset.id;
    this.current = null;
    const next = this.datasets.find((d) => d.id === id) ?? this.datasets[0];
    if (next) await this.select(next.id);
  }

  close() {
    this.db.close();
  }

  getEmbeddings(imageIds: readonly string[]) {
    return this.db.getEmbeddings(imageIds);
  }

  /** Refused (nothing saved) if any of the photos was deleted meanwhile. */
  saveEmbeddings(records: EmbeddingRecord[]) {
    return this.db.commit({
      put: { embeddings: records },
      require: { images: records.map((r) => r.imageId) },
    });
  }

  listModels(datasetId: string) {
    return this.db.listModels(datasetId);
  }

  /** Refused (nothing saved) if the model's dataset was deleted meanwhile. */
  saveModel(model: ModelRecord) {
    return this.db.commit({
      put: { models: [model] },
      require: { datasets: [model.datasetId] },
    });
  }

  /** Whether a dataset still exists in storage (another lab may have deleted it). */
  datasetExists(id: string) {
    return this.db.datasetExists(id);
  }

  deleteModel(id: string) {
    return this.db.commit({ delete: { models: [id] } });
  }

  groups(): string[][] {
    const state = this.current;
    if (!state) return [];
    return relatedGroups(state.images, new Set(state.dataset.notRelated));
  }

  stats() {
    const state = this.current;
    if (!state) return null;
    return datasetStats(
      state.images,
      state.labels,
      this.groups(),
      state.dataset.duplicatesSkipped,
    );
  }

  private async checkSpace(fileCount: number) {
    const storage = globalThis.navigator?.storage;
    if (this.persisted === null) {
      try {
        this.persisted = (await storage?.persist?.()) ?? false;
      } catch {
        this.persisted = false;
      }
    }
    try {
      const estimate = await storage?.estimate?.();
      if (estimate?.quota !== undefined && estimate.usage !== undefined) {
        const free = estimate.quota - estimate.usage;
        if (free < fileCount * LIMITS.estimatedBytesPerImage)
          throw new UserError(
            "Not enough free browser storage for these images. Delete some images or datasets first.",
          );
      }
    } catch (error) {
      if (error instanceof UserError) throw error;
      /* estimate unavailable: rely on write errors */
    }
  }

  /**
   * Imports files one at a time. Each image is saved together with any split changes in one
   * transaction, so a cancelled or failed import never leaves half-saved images.
   */
  async importFiles(
    files: readonly File[],
    labelId: string | null,
    options: {
      signal?: AbortSignal;
      onProgress?: (done: number, total: number) => void;
      prepare?: (file: File) => Promise<PreparedImage>;
    } = {},
  ): Promise<ImportSummary> {
    const state0 = this.requireCurrent();
    if (labelId && !state0.labels.some((l) => l.id === labelId))
      throw new UserError("That label no longer exists.");
    if (files.length > LIMITS.maxFilesPerImport)
      throw new UserError(
        `Choose at most ${LIMITS.maxFilesPerImport} files at a time.`,
      );
    if (state0.images.length + files.length > LIMITS.maxImagesPerDataset)
      throw new UserError(
        `A dataset can hold at most ${LIMITS.maxImagesPerDataset} images; it has ${state0.images.length}.`,
      );
    await this.checkSpace(files.length);
    const prepare = options.prepare ?? prepareImage;
    const summary: ImportSummary = {
      added: 0,
      duplicates: [],
      errors: [],
      moves: [],
      newlyRelated: 0,
      cancelled: false,
    };
    const relatedBefore = new Set(
      this.groups()
        .filter((g) => g.length > 1)
        .flat(),
    );
    for (let i = 0; i < files.length; i++) {
      if (options.signal?.aborted) {
        summary.cancelled = true;
        break;
      }
      const file = files[i];
      const name = file.name || `image ${i + 1}`;
      try {
        const prepared = await prepare(file);
        const state = this.requireCurrent();
        if (state.images.some((img) => img.sha256 === prepared.sha256)) {
          const dataset = this.bumped(state.dataset, {
            duplicatesSkipped: state.dataset.duplicatesSkipped + 1,
          });
          await this.db.commit({ put: { datasets: [dataset] } });
          this.apply({ ...state, dataset });
          summary.duplicates.push(name);
          continue;
        }
        const record: ImageRecord = {
          id: newId(),
          datasetId: state.dataset.id,
          labelId,
          sha256: prepared.sha256,
          dhash: prepared.dhash,
          width: prepared.width,
          height: prepared.height,
          bytes: prepared.image.size + prepared.thumb.size,
          order: state.dataset.nextOrder,
          addedAt: now(),
          source: state.dataset.isExample ? "example" : "upload",
          split: null,
        };
        const dataset = this.bumped(state.dataset, {
          nextOrder: state.dataset.nextOrder + 1,
        });
        const r = recompute(dataset, [...state.images, record]);
        const saved = r.images.at(-1)!;
        await this.db.commit({
          put: {
            datasets: [dataset],
            images: [...r.changed.filter((c) => c.id !== saved.id), saved],
            blobs: [
              { id: saved.id, image: prepared.image, thumb: prepared.thumb },
            ],
          },
        });
        this.apply({ ...state, dataset, images: r.images });
        summary.added++;
        summary.moves.push(...r.moves);
      } catch (error) {
        if (error instanceof StorageError) {
          summary.errors.push({ name, message: error.message });
          summary.stoppedReason = error.message;
          break;
        }
        summary.errors.push({
          name,
          message:
            error instanceof ImportError || error instanceof UserError
              ? error.message
              : "This file could not be imported.",
        });
      } finally {
        options.onProgress?.(i + 1, files.length);
      }
    }
    summary.newlyRelated = this.groups()
      .filter((g) => g.length > 1)
      .flat()
      .filter((id) => !relatedBefore.has(id)).length;
    return summary;
  }

  /**
   * Creates the generated shapes dataset, or reopens it if a complete one exists. An incomplete
   * example (for example after a storage error) is deleted and regenerated, so a retry never
   * mistakes a partial example for a finished one.
   */
  async loadExample(
    onProgress?: (done: number, total: number) => void,
  ): Promise<ExampleResult> {
    const existing = this.datasets.find((d) => d.isExample);
    if (existing && existing.exampleComplete !== false) {
      await this.select(existing.id);
      return { status: "reopened" };
    }
    if (existing) await this.deleteDataset(existing.id);
    const items = await generateExampleItems();
    await this.createDataset("Example: shapes", true);
    const labelIds = new Map<string, string>();
    for (const name of EXAMPLE_LABELS)
      labelIds.set(name, (await this.addLabel(name)).id);
    const summary: ImportSummary = {
      added: 0,
      duplicates: [],
      errors: [],
      moves: [],
      newlyRelated: 0,
      cancelled: false,
    };
    let done = 0;
    for (const name of EXAMPLE_LABELS) {
      const batch = items.filter((i) => i.label === name).map((i) => i.file);
      const s = await this.importFiles(batch, labelIds.get(name)!, {
        onProgress: (d) => onProgress?.(done + d, items.length),
      });
      done += batch.length;
      summary.added += s.added;
      summary.duplicates.push(...s.duplicates);
      summary.errors.push(...s.errors);
      summary.moves.push(...s.moves);
      summary.newlyRelated += s.newlyRelated;
      if (s.stoppedReason) summary.stoppedReason = s.stoppedReason;
    }
    const expectedDuplicates = items.filter(
      (i) => i.kind === "exact-duplicate",
    ).length;
    const complete =
      !summary.errors.length &&
      summary.duplicates.length === expectedDuplicates &&
      summary.added === items.length - expectedDuplicates;
    if (complete) {
      const state = this.requireCurrent();
      const dataset = this.bumped(state.dataset, { exampleComplete: true });
      await this.db.commit({ put: { datasets: [dataset] } });
      this.apply({ ...state, dataset });
    }
    return { status: complete ? "complete" : "incomplete", summary };
  }
}
