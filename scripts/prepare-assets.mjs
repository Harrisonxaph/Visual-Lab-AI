import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { MODEL } from "../src/inference/types.ts";
import { ENCODER } from "../src/learning/encoder.ts";

/** Downloads (or reuses) a pinned model file and refuses it unless the checksum matches. */
async function prepareModel({ modelPath, assetUrl, sha256, name }) {
  const path = new URL(`../public/${modelPath}`, import.meta.url);
  await mkdir(new URL(".", path), { recursive: true });
  let bytes;
  try {
    bytes = await readFile(path);
  } catch {
    const response = await fetch(assetUrl, {
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok)
      throw new Error(`${name} download failed: ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
  }
  if (createHash("sha256").update(bytes).digest("hex") !== sha256)
    throw new Error(`${name} checksum mismatch`);
  await writeFile(path, bytes);
}

await prepareModel(MODEL);
await prepareModel(ENCODER);
await mkdir(new URL(`../public/${MODEL.wasmPath}`, import.meta.url), {
  recursive: true,
});
for (const variant of ["internal", "nosimd_internal"]) {
  const name = `vision_wasm_${variant}`;
  for (const extension of ["js", "wasm"]) {
    await copyFile(
      new URL(
        `../node_modules/@mediapipe/tasks-vision/wasm/${name}.${extension}`,
        import.meta.url,
      ),
      new URL(
        `../public/${MODEL.wasmPath}${name}.${extension}`,
        import.meta.url,
      ),
    );
  }
  // Expose the vendor's classic-script factory when loaded as an ES module.
  const loader = new URL(
    `../public/${MODEL.wasmPath}${name}.js`,
    import.meta.url,
  );
  await writeFile(
    loader,
    (await readFile(loader, "utf8")) +
      "\n;globalThis.ModuleFactory = ModuleFactory;\n",
  );
}
console.log(
  `${MODEL.name} and ${ENCODER.name} checksums verified; ${MODEL.runtime} WASM assets copied.`,
);

await copyFile(
  new URL("../THIRD_PARTY_NOTICES.md", import.meta.url),
  new URL("../public/THIRD_PARTY_NOTICES.txt", import.meta.url),
);
await copyFile(
  new URL("../licenses/Apache-2.0.txt", import.meta.url),
  new URL("../public/Apache-2.0.txt", import.meta.url),
);
