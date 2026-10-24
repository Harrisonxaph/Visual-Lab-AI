import { defineConfig } from "vitest/config";
import { readFileSync } from "node:fs";
// Match the proposed deployment response headers in local production verification.
const deployment = JSON.parse(
  readFileSync(new URL("./vercel.json", import.meta.url), "utf8"),
);
const headers = Object.fromEntries(
  deployment.headers[0].headers.map(
    (header: { key: string; value: string }) => [header.key, header.value],
  ),
);
export default defineConfig({
  test: { include: ["tests/**/*.test.ts"] },
  preview: { headers },
  worker: { format: "es" },
});
