const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const PUBLIC_DIR = path.join(__dirname, 'public');
const ICONS_DIR = path.join(PUBLIC_DIR, 'icons');
const SPLASH_DIR = path.join(PUBLIC_DIR, 'splash');
const SCREENSHOTS_DIR = path.join(PUBLIC_DIR, 'screenshots');
const SOURCE_SVG = path.join(PUBLIC_DIR, 'favicon.svg');

// Create directories if they don't exist
[ICONS_DIR, SPLASH_DIR, SCREENSHOTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

const SPLASH_SIZES = [
  { w: 2048, h: 2732 }, // iPad Pro 12.9"
  { w: 1668, h: 2388 }, // iPad Pro 11"
  { w: 1536, h: 2048 }, // iPad Air / mini
  { w: 1125, h: 2436 }, // iPhone X/XS
  { w: 828,  h: 1792 }, // iPhone XR/11
  { w: 750,  h: 1334 }  // iPhone 8/SE
];

async function generate() {
  try {
    // 1. Generate icons
    for (const size of ICON_SIZES) {
      await sharp(SOURCE_SVG)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(path.join(ICONS_DIR, `icon-${size}.png`));
      console.log(`Generated icon-${size}.png`);
    }

    // 2. Generate maskable icon (filled background or fully contained)
    await sharp(SOURCE_SVG)
      .resize(512, 512, { fit: 'contain', background: { r: 10, g: 10, b: 10, alpha: 1 } }) // #0A0A0A
      .png()
      .toFile(path.join(ICONS_DIR, 'icon-512-maskable.png'));
    console.log(`Generated icon-512-maskable.png`);

    // 3. Apple touch icon
    await sharp(SOURCE_SVG)
      .resize(180, 180, { fit: 'contain', background: { r: 10, g: 10, b: 10, alpha: 1 } })
      .png()
      .toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));
    console.log(`Generated apple-touch-icon.png`);

    // 4. Generate splash screens
    for (const { w, h } of SPLASH_SIZES) {
      // Calculate icon size for splash (usually about 20% of the min dimension or a fixed size)
      const iconSize = Math.floor(Math.min(w, h) * 0.2);
      
      const iconBuffer = await sharp(SOURCE_SVG)
        .resize(iconSize, iconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();

      await sharp({
        create: {
          width: w,
          height: h,
          channels: 4,
          background: { r: 10, g: 10, b: 10, alpha: 1 } // #0A0A0A
        }
      })
        .composite([{ input: iconBuffer, gravity: 'center' }])
        .png()
        .toFile(path.join(SPLASH_DIR, `splash-${w}x${h}.png`));
      console.log(`Generated splash-${w}x${h}.png`);
    }

    // 5. Generate dummy screenshots just so manifest doesn't fail
    await sharp({ create: { width: 1280, height: 800, channels: 4, background: { r: 20, g: 20, b: 20, alpha: 1 } } })
      .composite([{ input: await sharp(SOURCE_SVG).resize(200, 200).toBuffer(), gravity: 'center' }])
      .png()
      .toFile(path.join(SCREENSHOTS_DIR, 'desktop.png'));
    
    await sharp({ create: { width: 390, height: 844, channels: 4, background: { r: 20, g: 20, b: 20, alpha: 1 } } })
      .composite([{ input: await sharp(SOURCE_SVG).resize(150, 150).toBuffer(), gravity: 'center' }])
      .png()
      .toFile(path.join(SCREENSHOTS_DIR, 'mobile.png'));
    console.log(`Generated dummy screenshots.`);

  } catch (err) {
    console.error('Error generating assets:', err);
  }
}

generate();
