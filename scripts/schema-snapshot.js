#!/usr/bin/env node
/**
 * Directus Schema Snapshot Export
 *
 * Exports the current Directus schema snapshot and saves it to
 * docker/directus/schema.json for use by first-run.sh on container startup.
 *
 * Usage:
 *   npm run schema:snapshot
 *   node scripts/schema-snapshot.js
 *
 * Environment variables:
 *   DEV_DIRECTUS_URL      - Directus URL (default: http://192.168.10.24:8057)
 *   DEV_ADMIN_EMAIL       - Admin email (default: contact@keyjayonline.com)
 *   DEV_ADMIN_PASSWORD    - Admin password (required)
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DIRECTUS_URL = process.env.DEV_DIRECTUS_URL || 'http://192.168.10.24:8057';
const ADMIN_EMAIL = process.env.DEV_ADMIN_EMAIL || 'contact@keyjayonline.com';
const ADMIN_PASSWORD = process.env.DEV_ADMIN_PASSWORD;
const OUTPUT_FILE = resolve(__dirname, '..', 'docker', 'directus', 'schema.json');

if (!ADMIN_PASSWORD) {
	console.error('ERROR: DEV_ADMIN_PASSWORD is required');
	console.error('  Set it via environment variable or .env.local');
	process.exit(1);
}

async function apiRequest(path, options = {}) {
	const url = `${DIRECTUS_URL}${path}`;
	const res = await fetch(url, {
		headers: { 'Content-Type': 'application/json', ...options.headers },
		...options
	});

	const text = await res.text();
	if (res.status === 204) return { status: 204, data: null };

	let json;
	try {
		json = JSON.parse(text);
	} catch {
		throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
	}

	if (json.errors) {
		throw new Error(`API Error: ${json.errors.map((e) => e.message).join(', ')}`);
	}

	return json;
}

async function main() {
	console.log(`Exporting schema from ${DIRECTUS_URL}...`);

	// Login to get admin JWT (static tokens can't access schema endpoints)
	console.log('  Authenticating...');
	const authResult = await apiRequest('/auth/login', {
		method: 'POST',
		body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
	});
	const token = authResult.data.access_token;

	// Get schema snapshot
	console.log('  Taking snapshot...');
	const snapshotResult = await apiRequest(`/schema/snapshot?access_token=${token}`);
	const snapshotData = snapshotResult.data;

	// Save extracted data (not the API wrapper)
	const json = JSON.stringify(snapshotData, null, 2);
	writeFileSync(OUTPUT_FILE, json);

	console.log(`  Saved to ${OUTPUT_FILE}`);
	console.log(`  Size: ${(json.length / 1024).toFixed(0)} KB`);
	console.log(`  Collections: ${snapshotData.collections?.length || 0}`);
	console.log(`  Fields: ${snapshotData.fields?.length || 0}`);
	console.log('Done.');
}

main().catch((err) => {
	console.error(`\nFATAL: ${err.message}`);
	process.exit(1);
});
