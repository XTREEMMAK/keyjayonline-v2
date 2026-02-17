/**
 * Generate PWA icons and OG social image from favicon SVG
 *
 * Usage: node scripts/generate-icons.js
 *
 * Generates:
 *   static/icons/icon-180.png    (apple-touch-icon)
 *   static/icons/icon-192.png    (PWA standard)
 *   static/icons/icon-512.png    (PWA standard)
 *   static/icons/icon-maskable-512.png (PWA maskable)
 *   static/img/og-social.png     (1200x630 OG social image)
 */

import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const faviconPath = resolve(projectRoot, 'static/img/favicon.svg');
const iconsDir = resolve(projectRoot, 'static/icons');

// Ensure output directory exists
mkdirSync(iconsDir, { recursive: true });

const svgBuffer = readFileSync(faviconPath);

// PWA icon sizes
const iconSizes = [
	{ name: 'icon-180.png', size: 180 },
	{ name: 'icon-192.png', size: 192 },
	{ name: 'icon-512.png', size: 512 },
	{ name: 'icon-maskable-512.png', size: 512 }
];

async function generateIcons() {
	// Generate square PWA icons
	for (const { name, size } of iconSizes) {
		const outputPath = resolve(iconsDir, name);
		await sharp(svgBuffer)
			.resize(size, size)
			.png()
			.toFile(outputPath);
		console.log(`Generated ${name} (${size}x${size})`);
	}

	// Generate OG social image (1200x630)
	// Create a gradient background matching the favicon, then composite the logo centered
	const ogWidth = 1200;
	const ogHeight = 630;
	const logoSize = 400; // Logo size within the OG image

	// Create gradient background SVG
	const bgSvg = Buffer.from(`
		<svg xmlns="http://www.w3.org/2000/svg" width="${ogWidth}" height="${ogHeight}">
			<defs>
				<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" stop-color="#667eea"/>
					<stop offset="100%" stop-color="#2a1a4e"/>
				</linearGradient>
			</defs>
			<rect width="${ogWidth}" height="${ogHeight}" fill="url(#bg)"/>
		</svg>
	`);

	// Resize favicon logo for compositing
	const logoPng = await sharp(svgBuffer)
		.resize(logoSize, logoSize)
		.png()
		.toBuffer();

	const ogOutputPath = resolve(projectRoot, 'static/img/og-social.png');
	await sharp(bgSvg)
		.resize(ogWidth, ogHeight)
		.composite([{
			input: logoPng,
			left: Math.round((ogWidth - logoSize) / 2),
			top: Math.round((ogHeight - logoSize) / 2)
		}])
		.png()
		.toFile(ogOutputPath);

	console.log(`Generated og-social.png (${ogWidth}x${ogHeight})`);
}

generateIcons().catch(err => {
	console.error('Failed to generate icons:', err);
	process.exit(1);
});
