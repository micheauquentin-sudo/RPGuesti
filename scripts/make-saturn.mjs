import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svg = `
<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="space" cx="50%" cy="50%" r="75%">
      <stop offset="0%" stop-color="#1c1236"/>
      <stop offset="60%" stop-color="#0b0818"/>
      <stop offset="100%" stop-color="#05040a"/>
    </radialGradient>
    <radialGradient id="saturnBody" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#fff0bd"/>
      <stop offset="35%" stop-color="#e5b85c"/>
      <stop offset="70%" stop-color="#a6711d"/>
      <stop offset="100%" stop-color="#3d2100"/>
    </radialGradient>
    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff2c2"/>
      <stop offset="30%" stop-color="#e5b85c"/>
      <stop offset="70%" stop-color="#8a5a0f"/>
      <stop offset="100%" stop-color="#ffe8a3"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="5" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <rect width="400" height="400" fill="url(#space)"/>
  <circle cx="60" cy="70" r="1.5" fill="#fff" opacity="0.9"/>
  <circle cx="340" cy="50" r="2.2" fill="#ffd77a" opacity="0.95"/>
  <circle cx="90" cy="330" r="2" fill="#fff" opacity="0.8"/>
  <circle cx="310" cy="340" r="1.5" fill="#fff" opacity="0.85"/>
  <circle cx="180" cy="40" r="1.5" fill="#e5b85c" opacity="0.7"/>
  <circle cx="280" cy="110" r="1.2" fill="#fff" opacity="0.8"/>
  
  <!-- Back of Ring -->
  <g transform="translate(200, 200) rotate(-22)">
    <ellipse cx="0" cy="0" rx="160" ry="40" fill="none" stroke="url(#ringGrad)" stroke-width="20" filter="url(#glow)"/>
    <ellipse cx="0" cy="0" rx="136" ry="32" fill="none" stroke="#fff8dc" stroke-width="3" opacity="0.9"/>
  </g>
  
  <!-- Planet Body -->
  <circle cx="200" cy="200" r="85" fill="url(#saturnBody)"/>
  
  <!-- Front of Ring -->
  <g transform="translate(200, 200) rotate(-22)">
    <path d="M -160 0 A 160 40 0 0 0 160 0" fill="none" stroke="url(#ringGrad)" stroke-width="20" filter="url(#glow)"/>
    <path d="M -136 0 A 136 32 0 0 0 136 0" fill="none" stroke="#fff8dc" stroke-width="3" opacity="0.9"/>
  </g>
</svg>
`;

async function makeSaturn() {
  const buf = await sharp(Buffer.from(svg))
    .resize(400, 400)
    .jpeg({ quality: 90 })
    .toBuffer();
  fs.writeFileSync(path.resolve('public/avatars/avatar-saturn.jpg'), buf);
  console.log('Saturn avatar created at public/avatars/avatar-saturn.jpg');
}

makeSaturn().catch(console.error);
