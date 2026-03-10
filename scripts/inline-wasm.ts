#!/usr/bin/env bun
/**
 * Reads the compiled WASM binary and the wasm-pack generated JS loader,
 * then produces a self-contained CJS module that loads WASM from inlined
 * base64 instead of readFileSync(__dirname + '...').
 *
 * Output: src/generated/pokurr-equity-inline.js
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs"
import { resolve, dirname } from "path"

const root = resolve(dirname(new URL(import.meta.url).pathname), "..")
const wasmPath = resolve(root, "packages/pokurr-equity/pkg-node/pokurr_equity_bg.wasm")
const loaderPath = resolve(root, "packages/pokurr-equity/pkg-node/pokurr_equity.js")
const outDir = resolve(root, "src/generated")
const outPath = resolve(outDir, "pokurr-equity-inline.js")

// Read and base64-encode the WASM binary
const wasmBytes = readFileSync(wasmPath)
const base64 = wasmBytes.toString("base64")
console.log(`[inline-wasm] WASM binary: ${wasmBytes.length} bytes → ${base64.length} chars base64`)

// Read the original JS loader
const loaderSource = readFileSync(loaderPath, "utf-8")

// Replace the file-system loading section with inline base64 decoding.
// Original lines (at end of file):
//   const wasmPath = `${__dirname}/pokurr_equity_bg.wasm`;
//   const wasmBytes = require('fs').readFileSync(wasmPath);
//   const wasmModule = new WebAssembly.Module(wasmBytes);
//   let wasm = new WebAssembly.Instance(wasmModule, __wbg_get_imports()).exports;
//   wasm.__wbindgen_start();
const replacement = `const _inlinedBase64 = "${base64}";
const wasmBytes = Uint8Array.from(atob(_inlinedBase64), c => c.charCodeAt(0));
const wasmModule = new WebAssembly.Module(wasmBytes);
let wasm = new WebAssembly.Instance(wasmModule, __wbg_get_imports()).exports;
wasm.__wbindgen_start();`

const pattern = /const wasmPath = .*?\n.*?readFileSync.*?\nconst wasmModule = .*?\nlet wasm = .*?\nwasm\.__wbindgen_start\(\);/s

if (!pattern.test(loaderSource)) {
  console.error("[inline-wasm] ERROR: Could not find the WASM loading pattern in pokurr_equity.js")
  console.error("[inline-wasm] The wasm-pack output format may have changed. Check pkg-node/pokurr_equity.js")
  process.exit(1)
}

const patchedSource = loaderSource.replace(pattern, replacement)

mkdirSync(outDir, { recursive: true })
writeFileSync(outPath, patchedSource)
console.log(`[inline-wasm] Wrote ${outPath} (${patchedSource.length} bytes)`)
