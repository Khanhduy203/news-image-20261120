// news-image-20261120 — hand-in for the 20 November 2026 world-news image.
//
// The poster was rendered earlier and committed as entry.png (1024x1024).
// This program only delivers that file to the output directory: it copies
// entry.png next to this script into $MAKEFUN_OUTPUT_DIR/entry.png and
// checks the copy byte-for-byte. Node 22 only, standard library only,
// no network, no rendering, no shelling out.

import { copyFileSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = process.env.MAKEFUN_OUTPUT_DIR;
if (!outDir) {
  throw new Error("MAKEFUN_OUTPUT_DIR is not set");
}

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, "entry.png");
const target = join(outDir, "entry.png");

const expected = readFileSync(source);
mkdirSync(outDir, { recursive: true });
copyFileSync(source, target);

const written = readFileSync(target);
if (!written.equals(expected)) {
  throw new Error("entry.png copy mismatch: bytes differ after write");
}

const size = statSync(target).size;
console.log(`entry.png written: ${size} bytes`);
