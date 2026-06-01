/**
 * One-shot: convert public/seed/authors/*.png to 256x256 WebP at q=82.
 * The audit flagged these as 2 MB+ files served at 77x77 display size.
 *   node scripts/convert-authors.mjs
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const dir = path.join(process.cwd(), "public", "seed", "authors");
const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".png"));

let totalBefore = 0;
let totalAfter = 0;

for (const file of files) {
  const inputPath = path.join(dir, file);
  const outputPath = path.join(dir, file.replace(/\.png$/i, ".webp"));

  const inputSize = (await fs.stat(inputPath)).size;
  totalBefore += inputSize;

  await sharp(inputPath)
    .resize(256, 256, { fit: "cover", position: "centre" })
    .webp({ quality: 82 })
    .toFile(outputPath);

  const outputSize = (await fs.stat(outputPath)).size;
  totalAfter += outputSize;

  console.log(
    `${file} → ${path.basename(outputPath)}: ${kb(inputSize)} → ${kb(outputSize)} (${pct(
      inputSize,
      outputSize,
    )}% smaller)`,
  );

  // Remove the giant PNG.
  await fs.unlink(inputPath);
}

console.log(
  `\nTotal: ${kb(totalBefore)} → ${kb(totalAfter)} (${pct(totalBefore, totalAfter)}% smaller across ${files.length} files)`,
);

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}
function pct(before, after) {
  return ((1 - after / before) * 100).toFixed(1);
}
