#!/usr/bin/env node

/**
 * Deploy static files to NeoCities
 *
 * Recursively uploads all files from the neocities/ directory,
 * preserving subdirectory structure (e.g., assets/favicon.ico).
 *
 * Usage: node neocities/deploy.js
 *        npm run neocities:deploy
 *
 * Credentials: Set NEOCITIES_API_KEY in environment or .env.local
 */

import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join, relative, resolve } from 'path';

// Terminal colors (matching sync-cdn-assets.js pattern)
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const NC = '\x1b[0m';

const NEOCITIES_DIR = resolve(process.cwd(), 'neocities');
const SKIP = ['deploy.js', '.DS_Store'];

function getFiles(dir) {
	const files = [];
	for (const entry of readdirSync(dir)) {
		if (SKIP.includes(entry)) continue;
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			files.push(...getFiles(full));
		} else {
			files.push(full);
		}
	}
	return files;
}

function loadApiKey() {
	let apiKey = process.env.NEOCITIES_API_KEY;

	if (!apiKey) {
		const envLocalPath = resolve(process.cwd(), '.env.local');
		if (existsSync(envLocalPath)) {
			const content = readFileSync(envLocalPath, 'utf-8');
			for (const line of content.split('\n')) {
				const trimmed = line.trim();
				if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
				const [key, ...valueParts] = trimmed.split('=');
				const value = valueParts.join('=');
				if (key === 'NEOCITIES_API_KEY') apiKey = value;
			}
		}
	}

	if (!apiKey) {
		console.error(`${RED}Error: NEOCITIES_API_KEY not found${NC}`);
		console.error('Set NEOCITIES_API_KEY in environment or .env.local');
		process.exit(1);
	}

	return apiKey;
}

async function uploadFiles(apiKey, filePaths) {
	const formData = new FormData();

	for (const fullPath of filePaths) {
		const relativePath = relative(NEOCITIES_DIR, fullPath);
		const fileContent = readFileSync(fullPath);
		const blob = new Blob([fileContent]);
		formData.append(relativePath, blob, relativePath);
	}

	console.log(`  Uploading ${filePaths.length} files...\n`);

	const response = await fetch('https://neocities.org/api/upload', {
		method: 'POST',
		headers: { Authorization: `Bearer ${apiKey}` },
		body: formData
	});

	const result = await response.json();

	if (result.result === 'success') {
		for (const fullPath of filePaths) {
			const relativePath = relative(NEOCITIES_DIR, fullPath);
			console.log(`  ${GREEN}Uploaded${NC} ${relativePath}`);
		}
		return true;
	} else {
		console.log(`  ${RED}Failed${NC}: ${result.message || 'Unknown error'}`);
		return false;
	}
}

async function main() {
	console.log(`\n${YELLOW}Deploying to NeoCities...${NC}\n`);

	const apiKey = loadApiKey();
	const files = getFiles(NEOCITIES_DIR);

	if (files.length === 0) {
		console.error(`${RED}Error: No files to upload${NC}`);
		process.exit(1);
	}

	console.log(`  Found ${files.length} files:\n`);
	for (const f of files) {
		console.log(`    ${relative(NEOCITIES_DIR, f)}`);
	}
	console.log('');

	const success = await uploadFiles(apiKey, files);

	if (success) {
		console.log(`\n${GREEN}Deploy complete!${NC}`);
		console.log(`\n  ${CYAN}https://keyjay.neocities.org${NC}\n`);
	} else {
		console.error(`\n${RED}Deploy failed${NC}\n`);
		process.exit(1);
	}
}

main().catch((err) => {
	console.error(`\n${RED}Error: ${err.message}${NC}`);
	process.exit(1);
});
