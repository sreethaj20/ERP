import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');
const sourceLogo = path.join(projectRoot, 'src', 'assets', 'mercure-logo.png');
const outputDir = path.join(projectRoot, 'public', 'icons');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function createIcon({ size, paddingPercent, bgHex, outputPath }) {
  const innerSize = Math.round(size * (1 - paddingPercent * 2));
  
  // Resize source logo to fit within innerSize x innerSize while maintaining aspect ratio
  const resizedLogo = await sharp(sourceLogo)
    .resize(innerSize, innerSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toBuffer();

  // Create solid background canvas of size x size with color bgHex (#0b0f19)
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: bgHex
    }
  })
    .composite([
      {
        input: resizedLogo,
        gravity: 'center'
      }
    ])
    .png()
    .toFile(outputPath);

  console.log(`Generated: ${outputPath} (${size}x${size}, padding: ${paddingPercent * 100}%)`);
}

async function generateAllIcons() {
  console.log('Generating high-quality PWA icons for Android & iOS...');
  
  const bgHex = { r: 11, g: 15, b: 25, alpha: 1 }; // #0b0f19

  // 1. Standard icons (purpose: "any") - 15% padding
  await createIcon({
    size: 192,
    paddingPercent: 0.15,
    bgHex,
    outputPath: path.join(outputDir, 'icon-192.png')
  });

  await createIcon({
    size: 512,
    paddingPercent: 0.15,
    bgHex,
    outputPath: path.join(outputDir, 'icon-512.png')
  });

  await createIcon({
    size: 192,
    paddingPercent: 0.15,
    bgHex,
    outputPath: path.join(outputDir, 'android-chrome-192x192.png')
  });

  await createIcon({
    size: 512,
    paddingPercent: 0.15,
    bgHex,
    outputPath: path.join(outputDir, 'android-chrome-512x512.png')
  });

  await createIcon({
    size: 180,
    paddingPercent: 0.12,
    bgHex,
    outputPath: path.join(outputDir, 'apple-touch-icon.png')
  });

  // 2. Maskable Icon (purpose: "maskable") - 25% padding (guarantees 50% safe zone diameter)
  await createIcon({
    size: 512,
    paddingPercent: 0.25,
    bgHex,
    outputPath: path.join(outputDir, 'icon-512-maskable.png')
  });

  console.log('All Android and iOS PWA icons generated successfully!');
}

generateAllIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
