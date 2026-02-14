#!/usr/bin/env node

/**
 * Directus Schema Migration: Tech Projects Enhancement
 *
 * Creates:
 *   1. M2M junction: kjov2_tech_projects ↔ kjov2_tech_stack (via kjov2_tech_projects_tech_stack)
 *   2. O2M collection: kjov2_tech_project_embeds (video embeds on projects)
 *   3. M2O field: kjov2_tech_projects.gallery → kjov2_galleries
 *
 * Idempotent — safe to re-run. Checks if collections/fields exist before creating.
 *
 * Usage: npm run migrate:tech-projects
 *        node scripts/migrate-tech-projects.js
 *
 * Credentials: Set DIRECTUS_URL/DIRECTUS_TOKEN in environment or .env.local
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Colors for terminal output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const NC = '\x1b[0m';

function loadEnv() {
	const vars = {};

	// Load .env.development first, then .env.local (overrides)
	for (const file of ['.env.development', '.env.local']) {
		const filePath = resolve(process.cwd(), file);
		if (!existsSync(filePath)) continue;
		const content = readFileSync(filePath, 'utf-8');
		for (const line of content.split('\n')) {
			const trimmed = line.trim();
			if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
			const [key, ...valueParts] = trimmed.split('=');
			vars[key.trim()] = valueParts.join('=').trim();
		}
	}

	return {
		url: process.env.DIRECTUS_URL || vars.DIRECTUS_URL || 'http://localhost:8055',
		token: process.env.DIRECTUS_TOKEN || vars.DIRECTUS_TOKEN
	};
}

// --- Directus REST helpers ---

let DIRECTUS_URL;
let DIRECTUS_TOKEN;

async function api(method, path, body = null) {
	const url = `${DIRECTUS_URL}${path}`;
	const opts = {
		method,
		headers: {
			'Authorization': `Bearer ${DIRECTUS_TOKEN}`,
			'Content-Type': 'application/json'
		}
	};
	if (body) opts.body = JSON.stringify(body);

	const res = await fetch(url, opts);
	const text = await res.text();

	if (!res.ok) {
		let errorDetail;
		try { errorDetail = JSON.parse(text); } catch { errorDetail = text; }
		return { ok: false, status: res.status, error: errorDetail };
	}

	try {
		return { ok: true, data: JSON.parse(text)?.data };
	} catch {
		return { ok: true, data: null };
	}
}

async function collectionExists(collection) {
	const result = await api('GET', `/collections/${collection}`);
	return result.ok;
}

async function fieldExists(collection, field) {
	const result = await api('GET', `/fields/${collection}/${field}`);
	return result.ok;
}

async function getFieldInfo(collection, field) {
	const result = await api('GET', `/fields/${collection}/${field}`);
	return result.ok ? result.data : null;
}

function log(icon, msg) {
	console.log(`  ${icon}  ${msg}`);
}

// --- Migration Steps ---

async function createJunctionTable() {
	console.log(`\n${CYAN}Step 1: M2M Junction — kjov2_tech_projects ↔ kjov2_tech_stack${NC}`);

	const junctionName = 'kjov2_tech_projects_tech_stack';

	// 1a. Create junction collection
	if (await collectionExists(junctionName)) {
		log(`${YELLOW}⊘${NC}`, `Collection ${junctionName} already exists — skipping`);
	} else {
		const result = await api('POST', '/collections', {
			collection: junctionName,
			meta: {
				icon: 'import_export',
				hidden: true,
				note: 'Junction: tech projects ↔ tech stack (M2M)'
			},
			schema: {}
		});
		if (result.ok) {
			log(`${GREEN}✓${NC}`, `Created collection ${junctionName}`);
		} else {
			log(`${RED}✗${NC}`, `Failed to create ${junctionName}: ${JSON.stringify(result.error)}`);
			return false;
		}
	}

	// 1b. Create junction fields
	const junctionFields = [
		{
			field: 'kjov2_tech_projects_id',
			type: 'uuid',
			meta: { hidden: true },
			schema: {}
		},
		{
			field: 'kjov2_tech_stack_id',
			type: 'integer',
			meta: { hidden: true },
			schema: {}
		},
		{
			field: 'sort',
			type: 'integer',
			meta: {
				interface: 'input',
				special: null,
				note: 'Display order within project'
			},
			schema: { is_nullable: true }
		}
	];

	for (const fieldDef of junctionFields) {
		if (await fieldExists(junctionName, fieldDef.field)) {
			log(`${YELLOW}⊘${NC}`, `Field ${junctionName}.${fieldDef.field} already exists — skipping`);
		} else {
			const result = await api('POST', `/fields/${junctionName}`, fieldDef);
			if (result.ok) {
				log(`${GREEN}✓${NC}`, `Created field ${junctionName}.${fieldDef.field}`);
			} else {
				log(`${RED}✗${NC}`, `Failed to create ${junctionName}.${fieldDef.field}: ${JSON.stringify(result.error)}`);
			}
		}
	}

	// 1c. Create M2M relation on kjov2_tech_projects.technologies
	// Check if field exists and is the wrong type (JSONB instead of M2M alias)
	const techField = await getFieldInfo('kjov2_tech_projects', 'technologies');
	if (techField && techField.type === 'json') {
		log(`${YELLOW}⚠${NC}`, `Field kjov2_tech_projects.technologies exists as JSONB — converting to M2M alias`);
		const delResult = await api('DELETE', '/fields/kjov2_tech_projects/technologies');
		if (delResult.ok) {
			log(`${GREEN}✓${NC}`, `Deleted JSONB technologies field`);
		} else {
			log(`${RED}✗${NC}`, `Failed to delete JSONB technologies field: ${JSON.stringify(delResult.error)}`);
		}
	}

	if (techField && techField.type !== 'json' && techField.meta?.special?.includes('m2m')) {
		log(`${YELLOW}⊘${NC}`, `Field kjov2_tech_projects.technologies already exists as M2M alias — skipping`);
	} else if (!techField || techField.type === 'json') {
		// Create the alias field on the parent collection
		const fieldResult = await api('POST', '/fields/kjov2_tech_projects', {
			field: 'technologies',
			type: 'alias',
			meta: {
				interface: 'list-m2m',
				special: ['m2m'],
				note: 'Relational tech stack (M2M → kjov2_tech_stack)',
				options: {
					layout: 'table',
					enableCreate: false,
					enableSelect: true
				}
			}
		});

		if (fieldResult.ok) {
			log(`${GREEN}✓${NC}`, `Created field kjov2_tech_projects.technologies`);
		} else {
			log(`${RED}✗${NC}`, `Failed to create technologies field: ${JSON.stringify(fieldResult.error)}`);
		}

		// Create the M2M relation
		const relationResult = await api('POST', '/relations', {
			collection: junctionName,
			field: 'kjov2_tech_projects_id',
			related_collection: 'kjov2_tech_projects',
			meta: {
				one_field: 'technologies',
				sort_field: 'sort',
				junction_field: 'kjov2_tech_stack_id'
			},
			schema: {
				on_delete: 'SET NULL'
			}
		});

		if (relationResult.ok) {
			log(`${GREEN}✓${NC}`, `Created M2M relation (projects side)`);
		} else {
			log(`${RED}✗${NC}`, `Failed to create M2M relation (projects side): ${JSON.stringify(relationResult.error)}`);
		}

		// Create the reverse side of the junction
		const reverseResult = await api('POST', '/relations', {
			collection: junctionName,
			field: 'kjov2_tech_stack_id',
			related_collection: 'kjov2_tech_stack',
			meta: {
				one_field: null,
				junction_field: 'kjov2_tech_projects_id'
			},
			schema: {
				on_delete: 'SET NULL'
			}
		});

		if (reverseResult.ok) {
			log(`${GREEN}✓${NC}`, `Created M2M relation (tech stack side)`);
		} else {
			log(`${RED}✗${NC}`, `Failed to create M2M relation (tech stack side): ${JSON.stringify(reverseResult.error)}`);
		}
	}

	return true;
}

async function createEmbedsCollection() {
	console.log(`\n${CYAN}Step 2: O2M Collection — kjov2_tech_project_embeds${NC}`);

	const collName = 'kjov2_tech_project_embeds';

	// 2a. Create the collection
	if (await collectionExists(collName)) {
		log(`${YELLOW}⊘${NC}`, `Collection ${collName} already exists — skipping`);
	} else {
		const result = await api('POST', '/collections', {
			collection: collName,
			meta: {
				icon: 'smart_display',
				note: 'Video embeds for tech projects (YouTube/Vimeo)',
				sort_field: 'display_order'
			},
			schema: {}
		});
		if (result.ok) {
			log(`${GREEN}✓${NC}`, `Created collection ${collName}`);
		} else {
			log(`${RED}✗${NC}`, `Failed to create ${collName}: ${JSON.stringify(result.error)}`);
			return false;
		}
	}

	// 2b. Create fields
	const embedFields = [
		{
			field: 'tech_project_id',
			type: 'uuid',
			meta: {
				interface: 'select-dropdown-m2o',
				hidden: true,
				note: 'Parent tech project'
			},
			schema: { is_nullable: true }
		},
		{
			field: 'embed_url',
			type: 'string',
			meta: {
				interface: 'input',
				required: true,
				note: 'YouTube or Vimeo URL',
				options: { placeholder: 'https://www.youtube.com/watch?v=...' }
			},
			schema: {}
		},
		{
			field: 'embed_type',
			type: 'string',
			meta: {
				interface: 'select-dropdown',
				note: 'Video platform',
				options: {
					choices: [
						{ text: 'YouTube', value: 'youtube' },
						{ text: 'Vimeo', value: 'vimeo' }
					]
				},
				width: 'half'
			},
			schema: { default_value: 'youtube' }
		},
		{
			field: 'title',
			type: 'string',
			meta: {
				interface: 'input',
				note: 'Display title for the embed'
			},
			schema: { is_nullable: true }
		},
		{
			field: 'description',
			type: 'text',
			meta: {
				interface: 'input-multiline',
				note: 'Optional description'
			},
			schema: { is_nullable: true }
		},
		{
			field: 'thumbnail_url',
			type: 'uuid',
			meta: {
				interface: 'file-image',
				special: ['file'],
				note: 'Custom thumbnail (optional, falls back to platform thumbnail)'
			},
			schema: { is_nullable: true }
		},
		{
			field: 'display_order',
			type: 'integer',
			meta: {
				interface: 'input',
				note: 'Sort order (lower = first)',
				width: 'half'
			},
			schema: { default_value: 0 }
		},
		{
			field: 'featured',
			type: 'boolean',
			meta: {
				interface: 'boolean',
				note: 'Featured embed (shown first)',
				width: 'half'
			},
			schema: { default_value: false }
		}
	];

	for (const fieldDef of embedFields) {
		if (await fieldExists(collName, fieldDef.field)) {
			log(`${YELLOW}⊘${NC}`, `Field ${collName}.${fieldDef.field} already exists — skipping`);
		} else {
			const result = await api('POST', `/fields/${collName}`, fieldDef);
			if (result.ok) {
				log(`${GREEN}✓${NC}`, `Created field ${collName}.${fieldDef.field}`);
			} else {
				log(`${RED}✗${NC}`, `Failed to create ${collName}.${fieldDef.field}: ${JSON.stringify(result.error)}`);
			}
		}
	}

	// 2c. Create O2M relation: kjov2_tech_projects.embeds → kjov2_tech_project_embeds
	if (await fieldExists('kjov2_tech_projects', 'embeds')) {
		log(`${YELLOW}⊘${NC}`, `Field kjov2_tech_projects.embeds already exists — skipping`);
	} else {
		// Create alias field on parent
		const fieldResult = await api('POST', '/fields/kjov2_tech_projects', {
			field: 'embeds',
			type: 'alias',
			meta: {
				interface: 'list-o2m',
				special: ['o2m'],
				note: 'Video embeds (YouTube/Vimeo)',
				options: {
					layout: 'table'
				}
			}
		});

		if (fieldResult.ok) {
			log(`${GREEN}✓${NC}`, `Created field kjov2_tech_projects.embeds`);
		} else {
			log(`${RED}✗${NC}`, `Failed to create embeds field: ${JSON.stringify(fieldResult.error)}`);
		}

		// Create M2O relation from embeds to projects
		const relationResult = await api('POST', '/relations', {
			collection: collName,
			field: 'tech_project_id',
			related_collection: 'kjov2_tech_projects',
			meta: {
				one_field: 'embeds',
				sort_field: 'display_order'
			},
			schema: {
				on_delete: 'CASCADE'
			}
		});

		if (relationResult.ok) {
			log(`${GREEN}✓${NC}`, `Created O2M relation (projects → embeds)`);
		} else {
			log(`${RED}✗${NC}`, `Failed to create O2M relation: ${JSON.stringify(relationResult.error)}`);
		}
	}

	// 2d. Create M2O relation for thumbnail_url → directus_files
	const thumbRelResult = await api('POST', '/relations', {
		collection: collName,
		field: 'thumbnail_url',
		related_collection: 'directus_files',
		schema: {
			on_delete: 'SET NULL'
		}
	});

	if (thumbRelResult.ok) {
		log(`${GREEN}✓${NC}`, `Created relation ${collName}.thumbnail_url → directus_files`);
	} else if (thumbRelResult.status === 400) {
		log(`${YELLOW}⊘${NC}`, `Relation ${collName}.thumbnail_url → directus_files likely already exists — skipping`);
	} else {
		log(`${RED}✗${NC}`, `Failed to create thumbnail relation: ${JSON.stringify(thumbRelResult.error)}`);
	}

	return true;
}

async function createGalleryField() {
	console.log(`\n${CYAN}Step 3: M2O Field — kjov2_tech_projects.gallery → kjov2_galleries${NC}`);

	if (await fieldExists('kjov2_tech_projects', 'gallery')) {
		log(`${YELLOW}⊘${NC}`, `Field kjov2_tech_projects.gallery already exists — skipping`);
		return true;
	}

	// Create the gallery field
	const fieldResult = await api('POST', '/fields/kjov2_tech_projects', {
		field: 'gallery',
		type: 'integer',
		meta: {
			interface: 'select-dropdown-m2o',
			special: ['m2o'],
			note: 'Link to an image gallery (optional)',
			options: {
				template: '{{title}}'
			}
		},
		schema: { is_nullable: true }
	});

	if (fieldResult.ok) {
		log(`${GREEN}✓${NC}`, `Created field kjov2_tech_projects.gallery`);
	} else {
		log(`${RED}✗${NC}`, `Failed to create gallery field: ${JSON.stringify(fieldResult.error)}`);
		return false;
	}

	// Create M2O relation
	const relationResult = await api('POST', '/relations', {
		collection: 'kjov2_tech_projects',
		field: 'gallery',
		related_collection: 'kjov2_galleries',
		schema: {
			on_delete: 'SET NULL'
		}
	});

	if (relationResult.ok) {
		log(`${GREEN}✓${NC}`, `Created M2O relation (projects.gallery → galleries)`);
	} else {
		log(`${RED}✗${NC}`, `Failed to create gallery relation: ${JSON.stringify(relationResult.error)}`);
	}

	return true;
}

// --- Main ---

async function main() {
	console.log(`\n${CYAN}╔═══════════════════════════════════════════════════╗${NC}`);
	console.log(`${CYAN}║  Tech Projects Schema Migration                   ║${NC}`);
	console.log(`${CYAN}╚═══════════════════════════════════════════════════╝${NC}`);

	const env = loadEnv();
	DIRECTUS_URL = env.url;
	DIRECTUS_TOKEN = env.token;

	if (!DIRECTUS_TOKEN) {
		console.error(`\n${RED}Error: DIRECTUS_TOKEN not found${NC}`);
		console.error('Set DIRECTUS_TOKEN in environment or .env.local');
		process.exit(1);
	}

	console.log(`${DIM}Directus: ${DIRECTUS_URL}${NC}`);

	// Verify connection
	const check = await api('GET', '/server/ping');
	if (!check.ok && check.status !== 200) {
		// ping returns "pong" as text, not JSON, so check differently
		try {
			const res = await fetch(`${DIRECTUS_URL}/server/ping`, {
				headers: { 'Authorization': `Bearer ${DIRECTUS_TOKEN}` }
			});
			if (!res.ok) {
				console.error(`\n${RED}Error: Cannot connect to Directus at ${DIRECTUS_URL}${NC}`);
				process.exit(1);
			}
		} catch (err) {
			console.error(`\n${RED}Error: Cannot connect to Directus at ${DIRECTUS_URL}${NC}`);
			console.error(err.message);
			process.exit(1);
		}
	}
	log(`${GREEN}✓${NC}`, `Connected to Directus`);

	// Run migration steps
	await createJunctionTable();
	await createEmbedsCollection();
	await createGalleryField();

	console.log(`\n${GREEN}Migration complete!${NC}\n`);
}

main().catch(err => {
	console.error(`\n${RED}Migration failed:${NC}`, err);
	process.exit(1);
});
