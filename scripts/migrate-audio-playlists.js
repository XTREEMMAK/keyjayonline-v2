#!/usr/bin/env node
/**
 * Migration: Audio Playlists + Test Action Data
 *
 * 1. Creates a test audio playlist in kjov2_audio_playlist
 * 2. Creates audio_player actions in kjov2_productions_actions for first 2 productions
 *
 * Prerequisites:
 *   - kjov2_audio_playlist collection exists in Directus (id, title, description, playlist_type, cover_art M2O, sort, status)
 *   - kjov2_audio_playlist_tracks collection exists in Directus (id, playlist_id M2O, sort, title, artist, audio_file M2O, cover_art M2O, duration, description)
 *   - kjov2_productions_actions has playlist_id (M2O → kjov2_audio_playlist)
 *
 * Usage: node scripts/migrate-audio-playlists.js
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

// ─── Create Test Audio Playlist ──────────────────────────────────────

async function createTestPlaylist() {
  console.log('\n=== Creating Test Audio Playlist ===\n');

  const playlistTitle = 'Test Production Playlist';

  // Idempotency: check if test playlist already exists
  const existingResult = await api('GET',
    `/items/kjov2_audio_playlist?filter[title][_eq]=${encodeURIComponent(playlistTitle)}&fields=id&limit=1`
  );
  const existing = existingResult.data || [];

  if (existing.length > 0) {
    console.log(`  Already exists: "${playlistTitle}" (${existing[0].id}), reusing`);
    return existing[0].id;
  }

  const result = await api('POST', '/items/kjov2_audio_playlist', {
    title: playlistTitle,
    description: 'Test playlist for production audio actions. Add tracks manually in Directus admin.',
    playlist_type: 'general',
    status: 'published',
    sort: 0
  });

  const playlistId = result.data.id;
  console.log(`  Created playlist: "${playlistTitle}" (${playlistId})`);
  console.log('  Note: Add tracks in Directus admin (upload audio files to kjov2_audio_playlist_tracks)');

  return playlistId;
}

// ─── Create Audio Player Actions on Productions ──────────────────────

async function createAudioPlayerActions(playlistId) {
  console.log('\n=== Creating Audio Player Actions ===\n');

  // Fetch productions
  const prodResult = await api('GET',
    '/items/kjov2_productions?fields=id,title&limit=-1&sort=sort,-date_created'
  );
  const productions = prodResult.data || [];

  let created = 0;

  // Look up the headphones icon in kjov2_icon_references
  let iconId = null;
  try {
    const iconResult = await api('GET',
      `/items/kjov2_icon_references?filter[icon_reference_id][_eq]=mdi:headphones&fields=id&limit=1`
    );
    const icons = iconResult.data || [];
    if (icons.length > 0) {
      iconId = icons[0].id;
      console.log(`  Found icon: mdi:headphones (${iconId})`);
    }
  } catch (err) {
    console.log('  Note: Could not look up icon reference, using null');
  }

  for (const prod of productions.slice(0, 2)) {
    // Check if audio_player actions already exist
    const existingResult = await api('GET',
      `/items/kjov2_productions_actions?filter[production_id][_eq]=${prod.id}&filter[action_type][_eq]=audio_player&fields=id&limit=1`
    );
    const existing = existingResult.data || [];

    if (existing.length > 0) {
      console.log(`  Already has audio_player action: "${prod.title}", skipping`);
      continue;
    }

    console.log(`  Production: "${prod.title}"`);

    await api('POST', '/items/kjov2_productions_actions', {
      production_id: prod.id,
      action_type: 'audio_player',
      audio_playlist_id: playlistId,
      link_text: 'Listen',
      icon: iconId,
      link_type: 'audio'
    });
    created++;
    console.log(`    Created audio_player action → playlist ${playlistId}`);
  }

  console.log(`\n  Summary: ${created} audio_player action(s) created`);
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log('Audio Playlist Migration Script');
  console.log(`Directus: ${DIRECTUS_URL}`);

  try {
    await api('GET', '/server/ping');
    console.log('Connected to Directus');
  } catch (err) {
    console.error('Failed to connect to Directus:', err.message);
    process.exit(1);
  }

  try {
    const playlistId = await createTestPlaylist();
    await createAudioPlayerActions(playlistId);
    console.log('\n=== Migration Complete ===\n');
  } catch (err) {
    console.error('\nMigration failed:', err.message);
    process.exit(1);
  }
}

main();
