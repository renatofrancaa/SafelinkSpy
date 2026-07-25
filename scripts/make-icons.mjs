import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

async function make(size, file) {
  const r = Math.round(size * 0.22);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#14532d"/>
      <stop offset="100%" stop-color="#0b0f14"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" rx="${r}" fill="url(#g)"/>
  <circle cx="${size * 0.5}" cy="${size * 0.42}" r="${size * 0.12}" fill="#22c55e"/>
  <rect x="${size * 0.28}" y="${size * 0.58}" width="${size * 0.44}" height="${size * 0.08}" rx="${size * 0.04}" fill="#4ade80" opacity="0.9"/>
  <rect x="${size * 0.34}" y="${size * 0.7}" width="${size * 0.32}" height="${size * 0.06}" rx="${size * 0.03}" fill="#86efac" opacity="0.55"/>
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(file);
  console.log("wrote", file);
}

await make(180, "public/icons/apple-touch-icon.png");
await make(192, "public/icons/icon-192.png");
await make(512, "public/icons/icon-512.png");
