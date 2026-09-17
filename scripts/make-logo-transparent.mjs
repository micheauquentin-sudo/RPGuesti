import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const inputPath = path.resolve('public/astra-logo.png');
const outputPath = path.resolve('public/astra-logo.png');
const backupPath = path.resolve('public/astra-logo-original.png');

if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(inputPath, backupPath);
}

async function processLogo() {
  const image = sharp(backupPath);
  const metadata = await image.metadata();
  const { width, height } = metadata;

  // Extract raw RGBA
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Black background removal with smooth feathering and fringe decontamination
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Compute brightness / max channel
    const maxVal = Math.max(r, g, b);

    // Below 18 is pure background black
    if (maxVal <= 18) {
      data[i + 3] = 0;
    } else if (maxVal < 60) {
      // Smooth feathering
      const factor = (maxVal - 18) / (60 - 18);
      data[i + 3] = Math.round(factor * 255);
      // Brighten anti-aliased edge to prevent dark halo on bright elements
      data[i] = Math.min(255, Math.round(r / Math.max(0.1, factor)));
      data[i + 1] = Math.min(255, Math.round(g / Math.max(0.1, factor)));
      data[i + 2] = Math.min(255, Math.round(b / Math.max(0.1, factor)));
    }
  }

  // Create trimmed transparent PNG
  const processedBuffer = await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .trim() // Trim transparent boundaries tightly
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();

  fs.writeFileSync(outputPath, processedBuffer);
  fs.writeFileSync(path.resolve('public/logo.png'), processedBuffer);
  console.log('Transparent logo created successfully at', outputPath);
}

processLogo().catch(console.error);
