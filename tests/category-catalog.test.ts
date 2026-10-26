import { expect, test } from "vitest";
import { MODEL } from "../src/inference/types";
import {
  catalogFor,
  searchCategories,
  COCO_CATALOG,
} from "../src/data/coco-labels";
test("pinned catalog has 80 unique documented labels without numeric class assumptions", () => {
  expect(new Set(COCO_CATALOG.labels).size).toBe(80);
  expect(COCO_CATALOG.modelSha256).toBe(MODEL.sha256);
  for (const q of ["PERSON", "cup", "hair drier"])
    expect(searchCategories(MODEL, q)).toContain(q.toLowerCase());
  expect(catalogFor({ ...MODEL, sha256: "other" })).toBeNull();
  expect(searchCategories({ ...MODEL, sha256: "other" }, "")).toEqual([]);
});
