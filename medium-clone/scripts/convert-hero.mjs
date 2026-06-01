// One-shot PNG → WebP conversion for the hero stack illustration.
// Trims excess transparent padding (so the image fits its bounding box) and
// emits an alpha-channel WebP at q90 for crisp scaling in next/image.

import sharp from "sharp";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..", "..", "..");
const SRC = path.join(PROJECT_ROOT, "hero-stack-raw.png");
const OUT = path.resolve(__dirname, "..", "public", "hero-stack.webp");

const input = readFileSync(SRC);
const inputKB = (input.length / 1024).toFixed(1);
const meta = await sharp(input).metadata();
console.log(`Input:  ${SRC}`);
console.log(`        ${meta.width}×${meta.height}  ${inputKB} KB`);

// Trim transparent padding, then re-pad slightly so shadows have breathing room
const trimmed = await sharp(input)
  .trim({ background: { r: 255, g: 255, b: 255, alpha: 0 }, threshold: 5 })
  .extend({
    top: 40,
    bottom: 40,
    left: 40,
    right: 40,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .toBuffer();

await sharp(trimmed).webp({ quality: 90, alphaQuality: 90 }).toFile(OUT);

const outMeta = await sharp(OUT).metadata();
const outKB = (statSync(OUT).size / 1024).toFixed(1);
console.log(`Output: ${OUT}`);
console.log(`        ${outMeta.width}×${outMeta.height}  ${outKB} KB`);
