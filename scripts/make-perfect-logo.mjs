import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const inputPath = path.resolve('public/astra-logo-original.png');
const outputPath = path.resolve('public/astra-logo.png');
const logoCopyPath = path.resolve('public/logo.png');

async function createFlawlessLogo() {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;

  // 1. Calculate the precise top arch contour of the dome
  const domeTopY = new Int32Array(w);
  domeTopY.fill(-1);

  for (let x = 0; x < w; x++) {
    // Dome rib boundaries: x between 118 and 910
    if (x < 118 || x > 910) {
      continue;
    }
    for (let y = 180; y < 630; y++) {
      const idx = (y * w + x) * 4;
      const val = Math.max(data[idx], data[idx + 1], data[idx + 2]);
      if (val >= 110) {
        domeTopY[x] = y;
        break;
      }
    }
  }

  // Smooth out domeTopY slightly to ensure no jaggedness on contour
  const smoothTopY = new Int32Array(w);
  smoothTopY.fill(-1);
  for (let x = 118; x <= 910; x++) {
    let sum = 0;
    let count = 0;
    for (let dx = -2; dx <= 2; dx++) {
      const nx = x + dx;
      if (nx >= 118 && nx <= 910 && domeTopY[nx] > 0) {
        sum += domeTopY[nx];
        count++;
      }
    }
    smoothTopY[x] = count > 0 ? Math.round(sum / count) : domeTopY[x];
  }

  // 2. Process all pixels
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const offset = (y * w + x) * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const maxVal = Math.max(r, g, b);

      // Outside horizontal logo boundaries
      if (x < 118 || x > 910) {
        data[offset] = 0;
        data[offset + 1] = 0;
        data[offset + 2] = 0;
        data[offset + 3] = 0;
        continue;
      }

      // Below letters (letters end strictly at y <= 762)
      if (y > 763) {
        data[offset] = 0;
        data[offset + 1] = 0;
        data[offset + 2] = 0;
        data[offset + 3] = 0;
        continue;
      }

      // Above dome top arch: clear background haze
      const topArch = smoothTopY[x];
      if (topArch > 0 && y < topArch - 2) {
        data[offset] = 0;
        data[offset + 1] = 0;
        data[offset + 2] = 0;
        data[offset + 3] = 0;
        continue;
      }

      // In the gap between dome (ends ~630) and letters (start ~643)
      if (y > 628 && y < 643 && maxVal < 50) {
        data[offset] = 0;
        data[offset + 1] = 0;
        data[offset + 2] = 0;
        data[offset + 3] = 0;
        continue;
      }

      // In the letter zone (y >= 643): anything outside the letter columns
      if (y >= 643 && (x < 155 || x > 855)) {
        data[offset] = 0;
        data[offset + 1] = 0;
        data[offset + 2] = 0;
        data[offset + 3] = 0;
        continue;
      }

      // Core pixel transparency handling:
      // Dark background / gaps between ribs
      if (maxVal <= 34) {
        data[offset] = 0;
        data[offset + 1] = 0;
        data[offset + 2] = 0;
        data[offset + 3] = 0;
      } else if (maxVal < 95) {
        // Smoothstep edge feathering
        const t = (maxVal - 34) / (95 - 34);
        const smoothT = t * t * (3 - 2 * t);
        data[offset + 3] = Math.round(smoothT * 255);

        // Decontaminate anti-aliased edge to remove dark halo
        const factor = Math.min(2.2, 1 / Math.max(0.3, smoothT));
        data[offset] = Math.min(255, Math.round(r * factor));
        data[offset + 1] = Math.min(255, Math.round(g * factor));
        data[offset + 2] = Math.min(255, Math.round(b * factor));
      } else {
        // Full opacity for metallic ribs and letters
        data[offset + 3] = 255;
      }
    }
  }

  // 3. Trim exactly to visible bounds
  const trimmed = await sharp(data, {
    raw: {
      width: w,
      height: h,
      channels: 4,
    },
  })
    .trim()
    .png({ compressionLevel: 9 })
    .toBuffer();

  const meta = await sharp(trimmed).metadata();
  console.log('Final clean trimmed logo dimensions:', meta.width, 'x', meta.height);

  fs.writeFileSync(outputPath, trimmed);
  fs.writeFileSync(logoCopyPath, trimmed);

  // Generate test previews on dark cards
  const previewCard = await sharp({
    create: {
      width: 700,
      height: 520,
      channels: 4,
      background: { r: 15, g: 17, b: 24, alpha: 1 }, // #0f1118 card background
    },
  })
    .composite([
      {
        input: await sharp(trimmed).resize(440).toBuffer(),
        gravity: 'center',
      },
    ])
    .png()
    .toFile('preview-card-dark.png');

  console.log('Generated preview-card-dark.png successfully!');
}

createFlawlessLogo().catch(console.error);
