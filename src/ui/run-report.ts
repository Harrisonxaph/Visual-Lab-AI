import { RunReportError, serializeRunReport } from "../learning/run-report";
import type { ModelRecord } from "../learning/types";

/** Explicit local file download; never uploads or writes to the application database. */
export function downloadRunReport(
  model: ModelRecord,
  includeClassNames: boolean,
) {
  const json = serializeRunReport(model, includeClassNames);
  const url = URL.createObjectURL(
    new Blob([json], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  // Constant filename: dataset names and user-controlled text never enter the filename.
  link.download = "visual-labs-run-report.json";
  try {
    document.body.append(link);
    link.click();
  } catch {
    throw new RunReportError(
      "This browser could not prepare the report download. The saved model was not changed. Try again or use another browser.",
    );
  } finally {
    link.remove();
    // Give the browser time to acquire the download before releasing the temporary blob.
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}
