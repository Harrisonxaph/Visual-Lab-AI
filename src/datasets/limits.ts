/** Practical limits that keep phone memory and browser storage use predictable. */
export const LIMITS = {
  maxDatasets: 5,
  maxImagesPerDataset: 500,
  maxLabelsPerDataset: 10,
  maxLabelLength: 40,
  maxDatasetNameLength: 60,
  maxFileBytes: 25 * 1024 * 1024,
  maxFilesPerImport: 50,
  /** Stored images are downscaled so their longest side is at most this many pixels. */
  storedLongSide: 512,
  storedQuality: 0.85,
  thumbLongSide: 128,
  thumbQuality: 0.7,
  /** Conservative per-image storage estimate used before importing. */
  estimatedBytesPerImage: 160 * 1024,
} as const;

/** Default split proportions: 70% training, 15% validation, 15% test. */
export const DEFAULT_RATIOS = {
  train: 0.7,
  validation: 0.15,
  test: 0.15,
} as const;

/**
 * Two images whose difference hashes differ in at most this many of 64 bits are flagged as
 * likely related. Lower means fewer false matches but more missed near-duplicates.
 */
export const NEAR_DUPLICATE_MAX_DISTANCE = 6;

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function validateLabelName(
  name: string,
  existing: readonly string[],
): string | null {
  const n = normalizeName(name);
  if (!n) return "Enter a label name.";
  if (n.length > LIMITS.maxLabelLength)
    return `Label names can be at most ${LIMITS.maxLabelLength} characters.`;
  if (existing.some((e) => e.toLowerCase() === n.toLowerCase()))
    return `A label called “${n}” already exists.`;
  if (existing.length >= LIMITS.maxLabelsPerDataset)
    return `A dataset can have at most ${LIMITS.maxLabelsPerDataset} labels.`;
  return null;
}

export function validateDatasetName(name: string): string | null {
  const n = normalizeName(name);
  if (!n) return "Enter a dataset name.";
  if (n.length > LIMITS.maxDatasetNameLength)
    return `Dataset names can be at most ${LIMITS.maxDatasetNameLength} characters.`;
  return null;
}
