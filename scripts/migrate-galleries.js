#!/usr/bin/env node
/**
 * Migration: Galleries + Test Action Data
 *
 * 1. Migrates kjov2_productions_pages → kjov2_galleries + kjov2_gallery_albums
 * 2. Creates viewer actions in kjov2_productions_actions for productions with pages
 * 3. Creates test external_link actions for UI verification
 *
 * Prerequisites:
 *   - kjov2_galleries collection exists in Directus (id, title, description, status, sort)
 *   - kjov2_gallery_albums collection exists in Directus (id, gallery_id M2O, sort, title, caption, page_image M2O)
 *   - kjov2_productions_actions collection exists (renamed from external_links, has action_type field)
 *
 * Usage: node scripts/migrate-galleries.js
 * Env: DIRECTUS_URL, DIRECTUS_TOKEN (via .env.local or .env.development)
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env files
config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env.development') });

const DIRECTUS_URL = process.env.DIRECTUS_URL;
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN;

if (!DIRECTUS_URL || !DIRECTUS_TOKEN) {
  console.error('Missing DIRECTUS_URL or DIRECTUS_TOKEN');
  process.exit(1);
}

// ─── Directus REST helper ────────────────────────────────────────────

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
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json') && text) {
    return JSON.parse(text);
  }
  return text || null;
}

// ─── Migration: Galleries from Production Pages ──────────────────────

async function migrateGalleries() {
  console.log('\n=== Migrating Production Pages to Galleries ===\n');

  // 1. Fetch all productions
  const prodResult = await api('GET',
    '/items/kjov2_productions?fields=id,title,slug&limit=-1'
  );
  const productions = prodResult.data || [];
  console.log(`Found ${productions.length} productions`);

  let galleriesCreated = 0;
  let albumsCreated = 0;
  let actionsCreated = 0;

  for (const prod of productions) {
    // 2. Fetch pages for this production
    const pagesResult = await api('GET',
      `/items/kjov2_productions_pages?filter[production_id][_eq]=${prod.id}&fields=id,sort,title,caption,page_image&sort=sort&limit=-1`
    );
    const pages = pagesResult.data || [];

    if (pages.length === 0) continue;

    console.log(`\n  Production: "${prod.title}" (${pages.length} pages)`);

    // 3. Idempotency: check if viewer action already exists
    const existingActionsResult = await api('GET',
      `/items/kjov2_productions_actions?filter[production_id][_eq]=${prod.id}&filter[action_type][_eq]=viewer&fields=id,url&limit=1`
    );
    const existingActions = existingActionsResult.data || [];

    if (existingActions.length > 0) {
      console.log(`    ⏭  Viewer action already exists (gallery: ${existingActions[0].url}), skipping`);
      continue;
    }

    // 4. Check if gallery already exists by title
    const galleryTitle = `${prod.title} Gallery`;
    const existingGalleryResult = await api('GET',
      `/items/kjov2_galleries?filter[title][_eq]=${encodeURIComponent(galleryTitle)}&fields=id&limit=1`
    );
    const existingGalleries = existingGalleryResult.data || [];

    let galleryId;
    if (existingGalleries.length > 0) {
      galleryId = existingGalleries[0].id;
      console.log(`    ♻  Gallery "${galleryTitle}" already exists (${galleryId}), reusing`);
    } else {
      // 5. Create gallery
      const galleryResult = await api('POST', '/items/kjov2_galleries', {
        title: galleryTitle,
        description: `Gallery for ${prod.title}`,
        status: 'published',
        sort: 0
      });
      galleryId = galleryResult.data.id;
      galleriesCreated++;
      console.log(`    ✓  Created gallery: "${galleryTitle}" (${galleryId})`);
    }

    // 6. Create gallery albums from pages
    for (const page of pages) {
      await api('POST', '/items/kjov2_gallery_albums', {
        gallery_id: galleryId,
        sort: page.sort,
        title: page.title,
        caption: page.caption,
        page_image: page.page_image // M2O FK pass-through (UUID string)
      });
      albumsCreated++;
    }
    console.log(`    ✓  Created ${pages.length} album(s)`);

    // 7. Create viewer action
    await api('POST', '/items/kjov2_productions_actions', {
      production_id: prod.id,
      action_type: 'viewer',
      gallery_id: galleryId,
      link_type: 'gallery',
      link_text: 'View Gallery',
      icon: 'mdi:image-multiple',
      is_primary: true,
      sort: 0
    });
    actionsCreated++;
    console.log(`    ✓  Created viewer action: "View Gallery" → gallery ${galleryId}`);
  }

  console.log(`\n  Summary: ${galleriesCreated} galleries, ${albumsCreated} albums, ${actionsCreated} viewer actions created`);
}

// ─── Test Data: External Link Actions ────────────────────────────────

async function createTestActions() {
  console.log('\n=== Creating Test External Link Actions ===\n');

  // Fetch all productions
  const prodResult = await api('GET',
    '/items/kjov2_productions?fields=id,title&limit=-1&sort=sort,-date_created'
  );
  const productions = prodResult.data || [];

  const testLinks = [
    { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', link_text: 'Watch on YouTube', link_type: 'youtube', icon: 'simple-icons:youtube' },
    { url: 'https://open.spotify.com/track/example', link_text: 'Listen on Spotify', link_type: 'spotify', icon: 'simple-icons:spotify' },
    { url: 'https://github.com/example/project', link_text: 'View Source', link_type: 'github', icon: 'mdi:github' }
  ];

  let created = 0;

  for (const prod of productions.slice(0, 3)) {
    // Check if external_link actions already exist
    const existingResult = await api('GET',
      `/items/kjov2_productions_actions?filter[production_id][_eq]=${prod.id}&filter[action_type][_eq]=external_link&fields=id&limit=1`
    );
    const existing = existingResult.data || [];

    if (existing.length > 0) {
      console.log(`  ⏭  "${prod.title}" already has external_link actions, skipping`);
      continue;
    }

    console.log(`  Production: "${prod.title}"`);

    for (let i = 0; i < testLinks.length; i++) {
      const link = testLinks[i];
      await api('POST', '/items/kjov2_productions_actions', {
        production_id: prod.id,
        action_type: 'external_link',
        url: link.url,
        link_text: link.link_text,
        icon: link.icon,
        link_type: link.link_type,
        is_primary: i === 0, // first link is primary
        sort: 10 + i
      });
      created++;
      console.log(`    ✓  ${link.link_text} (${link.link_type})`);
    }
  }

  console.log(`\n  Summary: ${created} test external_link actions created`);
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log('Gallery Migration Script');
  console.log(`Directus: ${DIRECTUS_URL}`);

  try {
    // Verify Directus connectivity
    await api('GET', '/server/ping');
    console.log('Connected to Directus ✓');
  } catch (err) {
    console.error('Failed to connect to Directus:', err.message);
    process.exit(1);
  }

  try {
    await migrateGalleries();
    await createTestActions();
    console.log('\n=== Migration Complete ===\n');
  } catch (err) {
    console.error('\nMigration failed:', err.message);
    process.exit(1);
  }
}

main();
