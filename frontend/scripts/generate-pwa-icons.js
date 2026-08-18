import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');
const rawUserIcon = path.join(projectRoot, 'src', 'assets', 'mercure-m-icon.jpg');
const outputDir = path.join(projectRoot, 'public', 'icons');
const publicDir = path.join(projectRoot, 'public');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function getCleanLogoBuffer() {
  const meta = await sharp(rawUserIcon).metadata();

  // Cut off ONLY the last 4px at the extreme right edge (x >= 206) to remove the stray line,
  // preserving 100% of the 3D "M" logo edges and curves intact!
  const croppedBuffer = await sharp(rawUserIcon)
    .extract({ left: 0, top: 0, width: meta.width - 4, height: meta.height })
    .toBuffer();

  return await sharp(croppedBuffer)
    .png()
    .toBuffer();
}

async function createIcon({ logoBuffer, size, paddingPercent, bgHex, outputPath }) {
  const innerSize = Math.round(size * (1 - paddingPercent * 2));

  // Resize logo buffer to fit innerSize cleanly
  const resizedLogo = await sharp(logoBuffer)
    .resize(innerSize, innerSize, {
      fit: 'contain',
      background: bgHex
    })
    .toBuffer();

  // Create composite icon on solid pure white background (#ffffff)
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
  console.log('Generating full, uncut PWA icons on WHITE background for Android & iOS...');

  const logoBuffer = await getCleanLogoBuffer();
  const bgHex = { r: 255, g: 255, b: 255, alpha: 1 }; // Pure White #ffffff

  // 1. Standard icons (purpose: "any") - 12% padding (preserves full logo visibility)
  await createIcon({
    logoBuffer,
    size: 192,
    paddingPercent: 0.12,
    bgHex,
    outputPath: path.join(outputDir, 'icon-192.png')
  });

  await createIcon({
    logoBuffer,
    size: 512,
    paddingPercent: 0.12,
    bgHex,
    outputPath: path.join(outputDir, 'icon-512.png')
  });

  await createIcon({
    logoBuffer,
    size: 192,
    paddingPercent: 0.12,
    bgHex,
    outputPath: path.join(outputDir, 'android-chrome-192x192.png')
  });

  await createIcon({
    logoBuffer,
    size: 512,
    paddingPercent: 0.12,
    bgHex,
    outputPath: path.join(outputDir, 'android-chrome-512x512.png')
  });

  await createIcon({
    logoBuffer,
    size: 180,
    paddingPercent: 0.10,
    bgHex,
    outputPath: path.join(outputDir, 'apple-touch-icon.png')
  });

  // 2. Android Maskable Icon (purpose: "maskable") - 18% padding for safe area on white background
  await createIcon({
    logoBuffer,
    size: 512,
    paddingPercent: 0.18,
    bgHex,
    outputPath: path.join(outputDir, 'icon-512-maskable.png')
  });

  // 3. Also update public/favicon.png
  await createIcon({
    logoBuffer,
    size: 512,
    paddingPercent: 0.08,
    bgHex,
    outputPath: path.join(publicDir, 'favicon.png')
  });

  console.log('Successfully updated full, uncut Android & iOS PWA icons with WHITE background!');
}

generateAllIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
