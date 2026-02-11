/**
 * Migration: Create kjov2_category_config collection
 *
 * Creates a standalone collection to store category metadata (icon, color, display name)
 * that was previously embedded in the select-dropdown field metadata choices.
 *
 * Steps:
 * 1. Create the kjov2_category_config collection
 * 2. Create fields (slug, display_name, icon, color, sort)
 * 3. Seed the 4 category records
 * 4. Revert category field icons to Material Symbols format for Directus admin
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

  return text ? JSON.parse(text) : null;
}

async function createCollection() {
  console.log('1. Creating kjov2_category_config collection...');

  try {
    await api('POST', '/collections', {
      collection: 'kjov2_category_config',
      schema: {},
      meta: {
        collection: 'kjov2_category_config',
        icon: 'category',
        note: 'Category metadata (icon, color, display name) for productions',
        hidden: false,
        singleton: false,
        sort_field: 'sort',
        accountability: 'all'
      }
    });
    console.log('   ✓ Created collection');
  } catch (err) {
    if (err.message.includes('already exists') || err.message.includes('409')) {
      console.log('   – Collection already exists, skipping');
    } else {
      throw err;
    }
  }
}

async function createFields() {
  console.log('\n2. Creating fields...');

  const fields = [
    {
      field: 'slug',
      type: 'string',
      schema: { max_length: 50, is_unique: true, is_nullable: false },
      meta: {
        interface: 'input',
        display: 'raw',
        required: true,
        note: 'URL-safe identifier, matches the value stored on kjov2_productions.category',
        sort: 1,
        width: 'half'
      }
    },
    {
      field: 'display_name',
      type: 'string',
      schema: { max_length: 100, is_nullable: false },
      meta: {
        interface: 'input',
        display: 'raw',
        required: true,
        note: 'Human-readable category name shown in the UI',
        sort: 2,
        width: 'half'
      }
    },
    {
      field: 'icon',
      type: 'string',
      schema: { max_length: 100, is_nullable: true },
      meta: {
        interface: 'input',
        display: 'raw',
        note: 'Iconify icon identifier (e.g. mdi:video). Used by frontend only.',
        sort: 3,
        width: 'half'
      }
    },
    {
      field: 'color',
      type: 'string',
      schema: { max_length: 20, is_nullable: true },
      meta: {
        interface: 'select-color',
        display: 'color',
        note: 'Hex color for category badge in the UI',
        sort: 4,
        width: 'half'
      }
    },
    {
      field: 'sort',
      type: 'integer',
      schema: { is_nullable: true, default_value: 0 },
      meta: {
        interface: 'input',
        display: 'raw',
        hidden: true,
        sort: 5,
        width: 'half'
      }
    }
  ];

  for (const fieldDef of fields) {
    try {
      await api('POST', '/fields/kjov2_category_config', fieldDef);
      console.log(`   ✓ Created field: ${fieldDef.field}`);
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('409')) {
        console.log(`   – Field ${fieldDef.field} already exists, skipping`);
      } else {
        throw err;
      }
    }
  }
}

async function seedRecords() {
  console.log('\n3. Seeding category records...');

  const categories = [
    { slug: 'video',  display_name: 'Videos',       icon: 'mdi:video',                  color: '#F87171', sort: 1 },
    { slug: 'comic',  display_name: 'Comics',       icon: 'mdi:book-open-page-variant', color: '#C084FC', sort: 2 },
    { slug: 'game',   display_name: 'Games',        icon: 'mdi:gamepad-variant',        color: '#60A5FA', sort: 3 },
    { slug: 'audio',  display_name: 'Audio Dramas', icon: 'mdi:headphones',             color: '#4ADE80', sort: 4 }
  ];

  // Check if records already exist
  const { data: existing } = await api('GET', '/items/kjov2_category_config?fields=slug&limit=-1');
  const existingSlugs = new Set((existing || []).map(r => r.slug));

  for (const cat of categories) {
    if (existingSlugs.has(cat.slug)) {
      console.log(`   – ${cat.slug} already exists, skipping`);
    } else {
      await api('POST', '/items/kjov2_category_config', cat);
      console.log(`   ✓ Inserted: ${cat.slug} (${cat.display_name})`);
    }
  }
}

async function fixFieldIcons() {
  console.log('\n4. Updating category field icons to Material Symbols for Directus admin...');

  try {
    await api('PATCH', '/fields/kjov2_productions/category', {
      meta: {
        options: {
          choices: [
            { text: 'Videos',       value: 'video', icon: 'videocam',       color: '#F87171' },
            { text: 'Comics',       value: 'comic', icon: 'menu_book',      color: '#C084FC' },
            { text: 'Games',        value: 'game',  icon: 'sports_esports', color: '#60A5FA' },
            { text: 'Audio Dramas', value: 'audio', icon: 'headphones',     color: '#4ADE80' }
          ],
          allowOther: true
        },
        display_options: {
          choices: [
            { text: 'Videos',       value: 'video', icon: 'videocam',       foreground: '#FFF', background: '#F87171' },
            { text: 'Comics',       value: 'comic', icon: 'menu_book',      foreground: '#FFF', background: '#C084FC' },
            { text: 'Games',        value: 'game',  icon: 'sports_esports', foreground: '#FFF', background: '#60A5FA' },
            { text: 'Audio Dramas', value: 'audio', icon: 'headphones',     foreground: '#FFF', background: '#4ADE80' }
          ]
        }
      }
    });
    console.log('   ✓ Updated field icons to Material Symbols format');
  } catch (err) {
    console.error('   ✗ Failed to update field icons:', err.message);
    console.log('   You can update these manually in Directus admin');
  }
}

async function run() {
  console.log('=== Migrate Category Config to Standalone Collection ===\n');

  await createCollection();
  await createFields();
  await seedRecords();
  await fixFieldIcons();

  console.log('\n=== Migration complete ===');
  console.log('\nThe kjov2_category_config collection now stores icon/color metadata.');
  console.log('The category dropdown on kjov2_productions now uses Material Symbols icons.');
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
