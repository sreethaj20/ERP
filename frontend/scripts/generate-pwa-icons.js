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

async function getTransparentLogoBuffer() {
  const meta = await sharp(rawUserIcon).metadata();

  // Extract logo and cut off rightmost 35px to remove stray line artifact
  const croppedBuffer = await sharp(rawUserIcon)
    .extract({ left: 0, top: 0, width: meta.width - 35, height: meta.height })
    .toBuffer();

  const { data, info } = await sharp(croppedBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Remove white background (R > 220, G > 220, B > 220)
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] > 220 && data[i + 1] > 220 && data[i + 2] > 220) {
      data[i + 3] = 0; // Make transparent
    }
  }

  return await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 }
  })
    .trim() // Trim transparent boundaries to center the logo perfectly
    .png()
    .toBuffer();
}

async function createIcon({ logoBuffer, size, paddingPercent, bgHex, outputPath }) {
  const innerSize = Math.round(size * (1 - paddingPercent * 2));

  // Resize transparent logo buffer to fit innerSize
  const resizedLogo = await sharp(logoBuffer)
    .resize(innerSize, innerSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toBuffer();

  // Create composite icon on solid #0b0f19 dark background
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
  console.log('Generating clean PWA icons without line artifacts for Android & iOS...');

  const logoBuffer = await getTransparentLogoBuffer();
  const bgHex = { r: 11, g: 15, b: 25, alpha: 1 }; // #0b0f19 theme background

  // 1. Standard icons (purpose: "any")
  await createIcon({
    logoBuffer,
    size: 192,
    paddingPercent: 0.15,
    bgHex,
    outputPath: path.join(outputDir, 'icon-192.png')
  });

  await createIcon({
    logoBuffer,
    size: 512,
    paddingPercent: 0.15,
    bgHex,
    outputPath: path.join(outputDir, 'icon-512.png')
  });

  await createIcon({
    logoBuffer,
    size: 192,
    paddingPercent: 0.15,
    bgHex,
    outputPath: path.join(outputDir, 'android-chrome-192x192.png')
  });

  await createIcon({
    logoBuffer,
    size: 512,
    paddingPercent: 0.15,
    bgHex,
    outputPath: path.join(outputDir, 'android-chrome-512x512.png')
  });

  await createIcon({
    logoBuffer,
    size: 180,
    paddingPercent: 0.12,
    bgHex,
    outputPath: path.join(outputDir, 'apple-touch-icon.png')
  });

  // 2. Android Maskable Icon (purpose: "maskable") - 22% padding for safe area
  await createIcon({
    logoBuffer,
    size: 512,
    paddingPercent: 0.22,
    bgHex,
    outputPath: path.join(outputDir, 'icon-512-maskable.png')
  });

  // 3. Also update public/favicon.png
  await createIcon({
    logoBuffer,
    size: 512,
    paddingPercent: 0.10,
    bgHex,
    outputPath: path.join(publicDir, 'favicon.png')
  });

  console.log('Successfully updated clean Android & iOS PWA icons!');
}

generateAllIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
