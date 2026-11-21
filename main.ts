// Renders poster.html to entry.png (1024x1024) and copies it to the
// make.fun output directory.
//
// Usage:
//   deno run --allow-read --allow-write --allow-env --allow-run main.ts
//
// The render step shells out to headless Chromium; Deno itself does the
// file handling so the entry lands exactly where the harness expects it.

const REPO_DIR = new URL(".", import.meta.url).pathname;
const POSTER = `${REPO_DIR}poster.html`;
const ENTRY = `${REPO_DIR}entry.png`;

const CHROMIUM_CANDIDATES = [
  `${Deno.env.get("HOME") ?? ""}/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome`,
  "/opt/meta-chromium/chrome",
  "chromium",
  "google-chrome",
];

function findChromium(): string {
  for (const candidate of CHROMIUM_CANDIDATES) {
    try {
      const info = Deno.statSync(candidate);
      if (info.isFile) return candidate;
    } catch {
      // not present at this path; try the next one
    }
  }
  throw new Error("No headless Chromium found in any known location");
}

async function render(chrome: string): Promise<void> {
  const cmd = new Deno.Command(chrome, {
    args: [
      "--headless",
      "--disable-gpu",
      "--no-sandbox",
      "--hide-scrollbars",
      `--window-size=1024,1024`,
      `--screenshot=${ENTRY}`,
      `file://${POSTER}`,
    ],
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stderr } = await cmd.output();
  if (code !== 0) {
    throw new Error(
      `Chromium screenshot failed (exit ${code}): ${new TextDecoder().decode(stderr)}`,
    );
  }
}

function verifyPng(bytes: Uint8Array): { width: number; height: number } {
  const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < PNG_MAGIC.length; i++) {
    if (bytes[i] !== PNG_MAGIC[i]) throw new Error("entry.png is not a valid PNG");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  if (width > 1024 || height > 1024) {
    throw new Error(`entry.png is ${width}x${height}, over the 1024x1024 limit`);
  }
  if (bytes.length > 1024 * 1024) {
    throw new Error(`entry.png is ${bytes.length} bytes, over the 1 MiB limit`);
  }
  return { width, height };
}

const chrome = findChromium();
console.log(`Rendering poster.html with ${chrome} ...`);
await render(chrome);

const bytes = await Deno.readFile(ENTRY);
const { width, height } = verifyPng(bytes);
console.log(`entry.png: ${width}x${height}, ${bytes.length} bytes`);

const outDir = Deno.env.get("MAKEFUN_OUTPUT_DIR") ?? "/output";
await Deno.mkdir(outDir, { recursive: true });
const dest = `${outDir.replace(/\/$/, "")}/entry.png`;
await Deno.copyFile(ENTRY, dest);
console.log(`Copied entry.png to ${dest}`);
