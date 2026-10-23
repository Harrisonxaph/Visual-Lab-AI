import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const modelPath = new URL('../public/models/efficientdet_lite0.tflite', import.meta.url);
const expected = '40338edf5ec70d43e318b0a716a84d4564cd1802759a7a07170c7e43796dbf58';
await mkdir(new URL('../public/models/', import.meta.url), { recursive: true });
await mkdir(new URL('../public/wasm/', import.meta.url), { recursive: true });
let bytes;
try { bytes = await readFile(modelPath); } catch {
  const response = await fetch('https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float32/1/efficientdet_lite0.tflite');
  if (!response.ok) throw new Error(`Model download failed: ${response.status}`);
  bytes = Buffer.from(await response.arrayBuffer());
}
if (createHash('sha256').update(bytes).digest('hex') !== expected) throw new Error('Model checksum mismatch');
await writeFile(modelPath, bytes);
for (const variant of ['internal', 'nosimd_internal']) {
  const name = `vision_wasm_${variant}`;
  for (const extension of ['js', 'wasm']) {
    await copyFile(new URL(`../node_modules/@mediapipe/tasks-vision/wasm/${name}.${extension}`, import.meta.url), new URL(`../public/wasm/${name}.${extension}`, import.meta.url));
  }
  // Expose the vendor's classic-script factory when loaded as an ES module.
  const loader = new URL(`../public/wasm/${name}.js`, import.meta.url);
  await writeFile(loader, (await readFile(loader, 'utf8')) + '\n;globalThis.ModuleFactory = ModuleFactory;\n');
}
console.log('Pinned Lite0 checksum verified; MediaPipe 0.10.32 WASM assets copied.');
