#!/usr/bin/env node
// Reescala imágenes a un máximo de --max px por lado (default 512), en sitio.
// Uso: node scripts/resize-assets.mjs <archivo-o-carpeta> [...] [--max 512]
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

const args = process.argv.slice(2);
const maxFlag = args.indexOf('--max');
const maxSize = maxFlag >= 0 ? Number(args[maxFlag + 1]) : 512;
const inputs =
  maxFlag >= 0 ? args.filter((a, i) => i !== maxFlag && i !== maxFlag + 1) : args;

if (inputs.length === 0 || !Number.isFinite(maxSize) || maxSize <= 0) {
  console.error('Uso: node scripts/resize-assets.mjs <archivo-o-carpeta> [...] [--max 512]');
  process.exit(1);
}

async function collect(target) {
  const stat = await fs.stat(target);
  if (stat.isFile()) {
    return EXTENSIONS.has(path.extname(target).toLowerCase()) ? [target] : [];
  }
  const entries = await fs.readdir(target, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((e) => collect(path.join(target, e.name))),
  );
  return nested.flat();
}

const files = (await Promise.all(inputs.map(collect))).flat();
for (const file of files) {
  const meta = await sharp(file).metadata();
  if ((meta.width ?? 0) <= maxSize && (meta.height ?? 0) <= maxSize) {
    console.log(`ok      ${file} (${meta.width}x${meta.height})`);
    continue;
  }
  const buffer = await sharp(file)
    .resize({ width: maxSize, height: maxSize, fit: 'inside' })
    .toBuffer();
  await fs.writeFile(file, buffer);
  const after = await sharp(file).metadata();
  console.log(`resized ${file} (${meta.width}x${meta.height} -> ${after.width}x${after.height})`);
}
