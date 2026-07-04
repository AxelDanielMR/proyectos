#!/usr/bin/env node
/**
 * Escala imágenes pixel art sin suavizado (nearest-neighbor).
 * Uso: node scripts/scale-pixelart.js [factor]
 * Ejemplo: node scripts/scale-pixelart.js 8  (escala al 800%)
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SCALE_FACTOR = parseInt(process.argv[2]) || 4;
const ASSET_DIR = path.join(__dirname, '../src/features/microgames/games/hat-match/assets');

const images = [
  'cowboy.png',
  'cowboy_hat.png',
  'driver.png',
  'driver_hat.png',
  'ecologist.png',
  'ecologist_hat.png',
  'firefighter.png',
  'firefighter_hat.png',
  'mayor.png',
  'mayor_hat.png',
];

async function scaleImage(filename) {
  const inputPath = path.join(ASSET_DIR, filename);
  const tempPath = path.join(ASSET_DIR, `.${filename}.tmp`);

  try {
    const metadata = await sharp(inputPath).metadata();
    const newWidth = metadata.width * SCALE_FACTOR;
    const newHeight = metadata.height * SCALE_FACTOR;

    await sharp(inputPath)
      .resize(newWidth, newHeight, {
        kernel: 'nearest',
      })
      .toFile(tempPath);

    fs.renameSync(tempPath, inputPath);
    console.log(`✓ ${filename}: ${metadata.width}x${metadata.height} → ${newWidth}x${newHeight}`);
  } catch (err) {
    console.error(`✗ ${filename}: ${err.message}`);
  }
}

async function main() {
  console.log(`Escalando imágenes pixel art al ${SCALE_FACTOR * 100}% (nearest-neighbor)...\n`);
  for (const img of images) {
    await scaleImage(img);
  }
  console.log('\n✓ Listo.');
}

main();
