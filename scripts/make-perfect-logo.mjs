import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function createCleanLogo() {
  const inputPath = path.resolve('public/astra-logo-original.png');
  const outputPath = path.resolve('public/astra-logo.png');
  const logoCopyPath = path.resolve('public/logo.png');

  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;

  // 1. Flood fill from the 4 outer borders with threshold 34
  // Marks 100% of the outside background without touching any rib or letter
  const visited = new Uint8Array(w * h);
  const queue = [];

  for (let x = 0; x < w; x++) {
    queue.push(0 * w + x);
    queue.push((h - 1) * w + x);
    visited[0 * w + x] = 1;
    visited[(h - 1) * w + x] = 1;
  }
  for (let y = 0; y < h; y++) {
    queue.push(y * w + 0);
    queue.push(y * w + (w - 1));
    visited[y * w + 0] = 1;
    visited[y * w + (w - 1)] = 1;
  }

  const bgThreshold = 34;

  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    const px = idx % w;
    const py = Math.floor(idx / w);

    const neighbors = [
      px > 0 ? idx - 1 : -1,
      px < w - 1 ? idx + 1 : -1,
      py > 0 ? idx - w : -1,
      py < h - 1 ? idx + w : -1,
    ];

    for (const n of neighbors) {
      if (n >= 0 && !visited[n]) {
        const nOffset = n * 4;
        const val = Math.max(data[nOffset], data[nOffset + 1], data[nOffset + 2]);
        if (val <= bgThreshold) {
          visited[n] = 1;
          queue.push(n);
        }
      }
    }
  }

  // 2. Set alpha for all pixels
  for (let i = 0; i < w * h; i++) {
    const offset = i * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const maxVal = Math.max(r, g, b);

    // If marked by flood fill or deep black -> pure transparent
    if (visited[i] || maxVal <= 32) {
      data[offset] = 0;
      data[offset + 1] = 0;
      data[offset + 2] = 0;
      data[offset + 3] = 0;
      continue;
    }

    // Inside logo: smooth feathering on anti-aliased edges
    if (maxVal < 70) {
      const t = (maxVal - 32) / (70 - 32);
      const alpha = Math.round(t * t * (3 - 2 * t) * 255);
      data[offset + 3] = alpha;

      // Brighten anti-aliased edge to prevent dark halo
      const scale = Math.min(2.0, 1 / Math.max(0.35, t));
      data[offset] = Math.min(255, Math.round(r * scale));
      data[offset + 1] = Math.min(255, Math.round(g * scale));
      data[offset + 2] = Math.min(255, Math.round(b * scale));
    } else {
      data[offset + 3] = 255;
    }
  }

  // 3. Trim to tight bounding box of visible logo
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
}

createCleanLogo().catch(console.error);
