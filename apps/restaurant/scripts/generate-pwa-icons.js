#!/usr/bin/env node

/**
 * PWA Icon Generator for Epictete Backoffice
 *
 * This script generates PNG icons from the SVG source.
 *
 * Prerequisites:
 * npm install sharp
 *
 * Usage:
 * node scripts/generate-pwa-icons.js
 *
 * Or manually convert the SVG to PNG:
 * - Use an online tool like https://cloudconvert.com/svg-to-png
 * - Upload public/backoffice-icon.svg
 * - Export as 192x192 and 512x512 PNG
 * - Save as public/backoffice-icon-192.png and public/backoffice-icon-512.png
 */

const fs = require('fs');
const path = require('path');

async function generateIcons() {
  try {
    // Try to use sharp if available
    const sharp = require('sharp');

    const svgPath = path.join(__dirname, '../public/backoffice-icon.svg');
    const svgBuffer = fs.readFileSync(svgPath);

    // Generate 192x192 icon
    await sharp(svgBuffer)
      .resize(192, 192)
      .png()
      .toFile(path.join(__dirname, '../public/backoffice-icon-192.png'));

    console.log('✓ Generated backoffice-icon-192.png');

    // Generate 512x512 icon
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(path.join(__dirname, '../public/backoffice-icon-512.png'));

    console.log('✓ Generated backoffice-icon-512.png');

    // Generate Apple touch icon (180x180)
    await sharp(svgBuffer)
      .resize(180, 180)
      .png()
      .toFile(path.join(__dirname, '../public/apple-touch-icon-backoffice.png'));

    console.log('✓ Generated apple-touch-icon-backoffice.png');

    console.log('\n✅ All icons generated successfully!');

  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log(`
╔══════════════════════════════════════════════════════════════╗
║  Sharp module not found. Please install it first:            ║
║                                                              ║
║    npm install sharp                                         ║
║                                                              ║
║  Or manually convert the SVG:                                ║
║  1. Open public/backoffice-icon.svg in a browser            ║
║  2. Use an online converter (cloudconvert.com/svg-to-png)   ║
║  3. Export as 192x192 → backoffice-icon-192.png             ║
║  4. Export as 512x512 → backoffice-icon-512.png             ║
║  5. Place files in the public/ folder                        ║
╚══════════════════════════════════════════════════════════════╝
      `);
    } else {
      console.error('Error generating icons:', error);
    }
  }
}

generateIcons();
