import type { EmbeddingRecord, ModelRecord } from "../learning/types";
import type {
  BlobRecord,
  DatasetRecord,
  ImageRecord,
  LabelRecord,
} from "./types";

export const DB_NAME = "visual-labs-datasets";
/** v1: datasets, labels, images, blobs. v2 adds cached embeddings and saved models. */
export const DB_VERSION = 2;

interface StoreMap {
  datasets: DatasetRecord;
  labels: LabelRecord;
  images: ImageRecord;
  blobs: BlobRecord;
  embeddings: EmbeddingRecord;
  models: ModelRecord;
}
type StoreName = keyof StoreMap;
const STORES: StoreName[] = [
  "datasets",
  "labels",
  "images",
  "blobs",
  "embeddings",
  "models",
];

/** A batch of writes applied together: all succeed or none do. */
export interface Commit {
  put?: { [K in StoreName]?: StoreMap[K][] };
  delete?: { [K in StoreName]?: string[] };
}

export class StorageError extends Error {
  constructor(
    message: string,
    readonly kind: "quota" | "unavailable" | "failed",
  ) {
    super(message);
  }
}

function describe(error: unknown): StorageError {
  const name = (error as { name?: string } | null)?.name;
  if (name === "QuotaExceededError")
    return new StorageError(
      "Not enough storage space on this device. Delete some images or datasets and try again.",
      "quota",
    );
  return new StorageError(
    "The browser could not save dataset changes. Nothing from this step was saved.",
    "failed",
  );
}

const request = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

/** Thin, typed wrapper over IndexedDB. All data stays in this browser on this device. */
export class DatasetDb {
  private constructor(private db: IDBDatabase) {}

  static async open(name = DB_NAME): Promise<DatasetDb> {
    let factory: IDBFactory | undefined;
    try {
      factory = globalThis.indexedDB;
    } catch {
      factory = undefined;
    }
    if (!factory)
      throw new StorageError(
        "This browser does not allow saving datasets here (storage is unavailable, for example in some private modes).",
        "unavailable",
      );
    try {
      const open = factory.open(name, DB_VERSION);
      // Each step only adds stores, so upgrading keeps every existing dataset.
      open.onupgradeneeded = ({ oldVersion }) => {
        const db = open.result;
        if (oldVersion < 1) {
          db.createObjectStore("datasets", { keyPath: "id" });
          db.createObjectStore("labels", { keyPath: "id" }).createIndex(
            "datasetId",
            "datasetId",
          );
          db.createObjectStore("images", { keyPath: "id" }).createIndex(
            "datasetId",
            "datasetId",
          );
          db.createObjectStore("blobs", { keyPath: "id" });
        }
        if (oldVersion < 2) {
          db.createObjectStore("embeddings", {
            keyPath: "imageId",
          }).createIndex("datasetId", "datasetId");
          db.createObjectStore("models", { keyPath: "id" }).createIndex(
            "datasetId",
            "datasetId",
          );
        }
      };
      const db = await request(open);
      // Let "Delete all" (here or in another tab) proceed instead of being blocked.
      db.onversionchange = () => db.close();
      return new DatasetDb(db);
    } catch {
      throw new StorageError(
        "The browser refused to open local dataset storage. Datasets cannot be saved in this session.",
        "unavailable",
      );
    }
  }

  async listDatasets(): Promise<DatasetRecord[]> {
    const tx = this.db.transaction("datasets", "readonly");
    const all = await request(tx.objectStore("datasets").getAll());
    return (all as DatasetRecord[]).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
  }

  async loadDataset(
    datasetId: string,
  ): Promise<{ labels: LabelRecord[]; images: ImageRecord[] }> {
    const tx = this.db.transaction(["labels", "images"], "readonly");
    const [labels, images] = await Promise.all([
      request(tx.objectStore("labels").index("datasetId").getAll(datasetId)),
      request(tx.objectStore("images").index("datasetId").getAll(datasetId)),
    ]);
    return {
      labels: (labels as LabelRecord[]).sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt),
      ),
      images: (images as ImageRecord[]).sort((a, b) => a.order - b.order),
    };
  }

  async getBlob(id: string): Promise<BlobRecord | undefined> {
    const tx = this.db.transaction("blobs", "readonly");
    return (await request(tx.objectStore("blobs").get(id))) as
      | BlobRecord
      | undefined;
  }

  async getEmbeddings(imageIds: readonly string[]) {
    const tx = this.db.transaction("embeddings", "readonly");
    const store = tx.objectStore("embeddings");
    const found = await Promise.all(
      imageIds.map((id) => request(store.get(id))),
    );
    return found.filter((e): e is EmbeddingRecord => !!e);
  }

  /** Ids of every cached embedding and saved model belonging to a dataset. */
  async learningKeys(datasetId: string) {
    const tx = this.db.transaction(["embeddings", "models"], "readonly");
    const [embeddings, models] = await Promise.all([
      request(
        tx.objectStore("embeddings").index("datasetId").getAllKeys(datasetId),
      ),
      request(
        tx.objectStore("models").index("datasetId").getAllKeys(datasetId),
      ),
    ]);
    return { embeddings: embeddings as string[], models: models as string[] };
  }

  async listModels(datasetId: string): Promise<ModelRecord[]> {
    const tx = this.db.transaction("models", "readonly");
    const all = await request(
      tx.objectStore("models").index("datasetId").getAll(datasetId),
    );
    return (all as ModelRecord[]).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
  }

  /** Applies every put and delete in one transaction. */
  async commit(change: Commit): Promise<void> {
    const names = STORES.filter(
      (s) => change.put?.[s]?.length || change.delete?.[s]?.length,
    );
    if (!names.length) return;
    let tx: IDBTransaction;
    try {
      tx = this.db.transaction(names, "readwrite");
    } catch (error) {
      throw describe(error);
    }
    await new Promise<void>((resolve, reject) => {
      // A failed request (including asynchronous ones such as quota errors) aborts the whole
      // transaction by default, rolling back every write in this batch. Keep the first error so
      // the message explains the real cause.
      let firstError: unknown = null;
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => {
        firstError ??= (e.target as IDBRequest | null)?.error ?? tx.error;
      };
      tx.onabort = () => reject(describe(firstError ?? tx.error));
      try {
        for (const s of names) {
          const store = tx.objectStore(s);
          for (const item of change.put?.[s] ?? []) store.put(item);
          for (const key of change.delete?.[s] ?? []) store.delete(key);
        }
      } catch (error) {
        try {
          tx.abort();
        } catch {
          /* already finished */
        }
        reject(describe(error));
      }
    });
  }

  close() {
    this.db.close();
  }

  /**
   * Starts removing the whole dataset database from this device. The promise settles when the
   * browser finishes. If another connection (for example another tab) stays open, deletion waits
   * for it to close, which can take indefinitely long; callers decide how long to wait.
   */
  static destroy(name = DB_NAME): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const r = indexedDB.deleteDatabase(name);
      r.onsuccess = () => resolve();
      r.onerror = () =>
        reject(
          new StorageError(
            "Deletion failed. Dataset data may still exist on this device.",
            "failed",
          ),
        );
    });
  }
}
