/**
 * Migration: Replace M2M categories with simple dropdown on kjov2_productions
 *
 * 1. Read M2M category assignments and populate the standalone `category` field
 * 2. Update the `category` field interface to select-dropdown with choices
 * 3. Leave M2M tables intact for manual cleanup in Directus admin
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

async function run() {
  console.log('=== Migrate Productions Categories to Dropdown ===\n');

  // Step 1: Read all categories from lookup table
  console.log('1. Reading categories lookup table...');
  const { data: categories } = await api('GET', '/items/kjov2_productions_categories?fields=id,name,slug&sort=sort,name');
  console.log(`   Found ${categories.length} categories:`, categories.map(c => `${c.name} (${c.slug})`).join(', '));

  // Build ID → slug map
  const slugById = {};
  for (const cat of categories) {
    slugById[cat.id] = cat.slug;
  }

  // Step 2: Read all M2M assignments
  console.log('\n2. Reading M2M category assignments...');
  const { data: assignments } = await api('GET', '/items/kjov2_productions_productions_categories?fields=kjov2_productions_id,kjov2_productions_categories_id&limit=-1');
  console.log(`   Found ${assignments.length} assignments`);

  // Group by production, take first assignment (slug)
  const categoryByProduction = {};
  for (const a of assignments) {
    if (!categoryByProduction[a.kjov2_productions_id]) {
      const slug = slugById[a.kjov2_productions_categories_id];
      if (slug) {
        categoryByProduction[a.kjov2_productions_id] = { slug };
      }
    }
  }

  // Step 3: Read all productions to see which need updating
  console.log('\n3. Reading productions...');
  const { data: productions } = await api('GET', '/items/kjov2_productions?fields=id,title,category&limit=-1');
  console.log(`   Found ${productions.length} productions`);

  // Step 4: Populate category (slug) from M2M data
  console.log('\n4. Populating category from M2M data...');
  let updated = 0;
  let skipped = 0;

  for (const prod of productions) {
    const m2m = categoryByProduction[prod.id];

    if (m2m) {
      if (prod.category !== m2m.slug) {
        await api('PATCH', `/items/kjov2_productions/${prod.id}`, { category: m2m.slug });
        console.log(`   ✓ ${prod.title}: category="${m2m.slug}"`);
        updated++;
      } else {
        console.log(`   – ${prod.title}: already correct (${m2m.slug})`);
        skipped++;
      }
    } else if (prod.category) {
      console.log(`   – ${prod.title}: has category="${prod.category}" (no M2M match)`);
      skipped++;
    } else {
      console.log(`   ? ${prod.title}: no M2M assignment and no existing value`);
      skipped++;
    }
  }

  console.log(`\n   Updated: ${updated}, Skipped: ${skipped}`);

  // Step 5: Update the category field to use select-dropdown interface
  console.log('\n5. Updating category field interface to select-dropdown...');
  try {
    await api('PATCH', '/fields/kjov2_productions/category', {
      meta: {
        interface: 'select-dropdown',
        display: 'labels',
        options: {
          choices: [
            { text: 'Videos', value: 'video', icon: 'mdi:video', color: '#F87171' },
            { text: 'Comics', value: 'comic', icon: 'mdi:book-open-page-variant', color: '#C084FC' },
            { text: 'Games', value: 'game', icon: 'mdi:gamepad-variant', color: '#60A5FA' },
            { text: 'Audio Dramas', value: 'audio', icon: 'mdi:headphones', color: '#4ADE80' }
          ],
          allowOther: true
        },
        display_options: {
          choices: [
            { text: 'Videos', value: 'video', icon: 'mdi:video', foreground: '#FFF', background: '#F87171' },
            { text: 'Comics', value: 'comic', icon: 'mdi:book-open-page-variant', foreground: '#FFF', background: '#C084FC' },
            { text: 'Games', value: 'game', icon: 'mdi:gamepad-variant', foreground: '#FFF', background: '#60A5FA' },
            { text: 'Audio Dramas', value: 'audio', icon: 'mdi:headphones', foreground: '#FFF', background: '#4ADE80' }
          ]
        },
        note: 'Production category (determines icon and color in UI)'
      }
    });
    console.log('   ✓ Updated category field to select-dropdown with icon/color choices');
  } catch (err) {
    console.error('   ✗ Failed to update field interface:', err.message);
    console.log('   You may need to update the interface manually in Directus admin');
  }

  // Step 6: Note manual cleanup
  console.log('\n6. Note: The following can be manually cleaned up in Directus admin:');
  console.log('   - kjov2_productions_categories (lookup table) — no longer queried');
  console.log('   - kjov2_productions_productions_categories (junction table) — no longer queried');
  console.log('   Display names now come from the category field\'s dropdown choices metadata.');

  console.log('\n=== Migration complete ===');
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
