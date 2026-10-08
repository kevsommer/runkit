// Renders scripts/icon.svg into the PNG icons the PWA manifest needs.
// Usage: node scripts/generate-icons.mjs
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";

const svg = await readFile(new URL("./icon.svg", import.meta.url));
const out = (f) => new URL(`../public/icons/${f}`, import.meta.url).pathname;

for (const [file, size] of [["icon-192.png", 192], ["icon-512.png", 512], ["apple-touch-icon.png", 180]]) {
  // Apple and Android apply their own rounding; give them a full-bleed square.
  const flat = file === "apple-touch-icon.png" ? svg.toString().replace('rx="112"', 'rx="0"') : svg;
  await sharp(Buffer.from(flat)).resize(size, size).png().toFile(out(file));
}

// Maskable: artwork inside the 80% safe zone on a full-bleed background.
const inner = await sharp(Buffer.from(svg.toString().replace('rx="112"', 'rx="0"'))).resize(400, 400).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#FF5A1F" } })
  .composite([{ input: inner, left: 56, top: 56 }])
  .png()
  .toFile(out("maskable-512.png"));

await writeFile(new URL("../app/icon.svg", import.meta.url), svg);
console.log("icons written");
