import { CancelledError } from "./embeddings";
import {
  FinalCheckError,
  finalModelSignature,
  finalChoiceSignature,
  prepareFinalPlan,
  type FinalCheckRecord,
  type FinalResult,
  type NetworkFinalChoice,
} from "./final-evaluation";
import { classificationMetrics } from "./metrics";
import type { ModelRecord } from "./types";

/** Same database/transaction as datasets and models: one durable choice per dataset, across tabs. */
export class FinalCheckStore {
  constructor(private db: IDBDatabase) {}

  async read(datasetId: string): Promise<FinalCheckRecord | undefined> {
    return new Promise((resolve, reject) => {
      try {
        const request = this.db
          .transaction("finalChecks")
          .objectStore("finalChecks")
          .get(datasetId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(
            new FinalCheckError(
              "Final-check history could not be read. No new final check is allowed until storage recovers.",
            ),
          );
      } catch {
        reject(new FinalCheckError("Final-check storage is unavailable."));
      }
    });
  }

  claim(
    candidate: ModelRecord,
    fingerprint: string,
    signal?: AbortSignal,
    networkChoice?: NetworkFinalChoice,
  ) {
    return this.transition(candidate, { fingerprint, networkChoice }, signal);
  }
  complete(
    lock: FinalCheckRecord,
    candidate: ModelRecord,
    result: FinalResult,
    signal?: AbortSignal,
  ) {
    return this.transition(
      candidate,
      {
        fingerprint: lock.modelFingerprint,
        lockId: lock.id,
        result,
        networkChoice: lock.networkChoice,
      },
      signal,
    );
  }

  private async transition(
    candidate: ModelRecord,
    action: {
      fingerprint: string;
      lockId?: string;
      result?: FinalResult;
      networkChoice?: NetworkFinalChoice;
    },
    signal?: AbortSignal,
  ): Promise<FinalCheckRecord> {
    if (signal?.aborted) throw new CancelledError();
    let tx: IDBTransaction;
    try {
      tx = this.db.transaction(
        ["datasets", "labels", "images", "models", "finalChecks"],
        "readwrite",
      );
    } catch {
      throw new FinalCheckError(
        "Final-check storage is unavailable; no result was saved.",
      );
    }
    return new Promise((resolve, reject) => {
      let output: FinalCheckRecord,
        error: unknown,
        remaining = 5;
      const abort = () => {
        error ??= new CancelledError();
        try {
          tx.abort();
        } catch {
          /* already finished */
        }
      };
      const cleanup = () => signal?.removeEventListener("abort", abort);
      tx.oncomplete = () => {
        cleanup();
        resolve(output);
      };
      tx.onerror = (event) => {
        error ??= (event.target as IDBRequest)?.error ?? tx.error;
      };
      tx.onabort = () => {
        cleanup();
        reject(
          error instanceof FinalCheckError || error instanceof CancelledError
            ? error
            : new FinalCheckError(
                "The final-check choice or result could not be saved. No partial result was published. Check available storage and retry the same choice.",
              ),
        );
      };
      signal?.addEventListener("abort", abort, { once: true });
      const dataset = tx.objectStore("datasets").get(candidate.datasetId);
      const model = tx.objectStore("models").get(candidate.id);
      const labels = tx
        .objectStore("labels")
        .index("datasetId")
        .getAll(candidate.datasetId);
      const images = tx
        .objectStore("images")
        .index("datasetId")
        .getAll(candidate.datasetId);
      const existing = tx.objectStore("finalChecks").get(candidate.datasetId);
      const ready = () => {
        if (--remaining) return;
        try {
          if (!dataset.result || !model.result)
            throw new FinalCheckError(
              "The dataset or chosen model was deleted; no final result was saved.",
            );
          if (
            finalModelSignature(model.result) !== finalModelSignature(candidate)
          )
            throw new FinalCheckError(
              "The chosen model changed; the final check cannot use different parameters.",
            );
          if (!/^[0-9a-f]{64}$/.test(action.fingerprint))
            throw new FinalCheckError("The model fingerprint is invalid.");
          const ordered = images.result.sort((a, b) => a.order - b.order);
          const plan = prepareFinalPlan(
            dataset.result,
            labels.result,
            ordered,
            model.result,
            action.networkChoice,
          );
          const old = existing.result as FinalCheckRecord | undefined;
          if (
            old &&
            (old.status === "complete" ||
              old.modelId !== candidate.id ||
              old.modelFingerprint !== action.fingerprint ||
              finalChoiceSignature(candidate, old.networkChoice) !==
                finalChoiceSignature(candidate, plan.networkChoice) ||
              old.datasetVersion !== plan.datasetVersion ||
              JSON.stringify(old.test) !== JSON.stringify(plan.test))
          )
            throw new FinalCheckError(
              "This dataset already has a locked or completed final choice. It cannot be replaced or reset by changing settings or splits.",
            );
          const store = tx.objectStore("finalChecks");
          if (action.result) {
            if (!old || old.id !== action.lockId)
              throw new FinalCheckError(
                "The original final-check lock is missing; nothing was saved.",
              );
            const result = action.result;
            const truth = old.test.map((r) => old.labelIds.indexOf(r.labelId));
            if (
              !Number.isFinite(result.loss) ||
              result.loss < 0 ||
              !Number.isFinite(Date.parse(result.completedAt)) ||
              JSON.stringify(result.truth) !== JSON.stringify(truth)
            )
              throw new FinalCheckError(
                "Invalid final measurements; no result was saved.",
              );
            classificationMetrics(truth, result.predicted, old.labelIds.length);
            output = {
              ...old,
              status: "complete",
              result: structuredClone(result),
            };
            store.put(output);
          } else if (old) output = old;
          else {
            output = {
              ...plan,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
              modelFingerprint: action.fingerprint,
              status: "locked",
            };
            store.add(output);
          }
        } catch (caught) {
          error =
            (caught as { name?: string })?.name === "QuotaExceededError"
              ? new FinalCheckError(
                  "Not enough space to save final-check history. Free unused storage and retry the same choice; no partial result was published.",
                )
              : caught instanceof Error
                ? new FinalCheckError(caught.message)
                : caught;
          try {
            tx.abort();
          } catch {
            /* already aborted */
          }
        }
      };
      for (const request of [dataset, model, labels, images, existing])
        request.onsuccess = ready;
      if (signal?.aborted) abort();
    });
  }
}
