# Directus Setup & Administration

Directus serves as the headless CMS for Key Jay Online. All content collections are prefixed with `kjov2_` and accessed via the Directus REST API using a static API token.

For environment setup and Docker commands, see [DEVELOPMENT.md](./DEVELOPMENT.md). For production deployment, see [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## Collections

| Collection | Purpose |
|---|---|
| `kjov2_general` | Site settings (status, GA measurement ID, radio toggle) |
| `kjov2_socials` | Social media links |
| `kjov2_music_releases` | Music albums and releases |
| `kjov2_music_tracks` | Individual tracks |
| `kjov2_music_credits` | Music credits and attributions |
| `kjov2_music_samples` | Audio samples (feeds RSS when `is_radio_new`) |
| `kjov2_music_videos` | Music video embeds |
| `kjov2_music_external_links` | Streaming platform links |
| `kjov2_music_networks` | Distribution networks |
| `kjov2_music_studio` | Studio gear and equipment |
| `kjov2_studio_categories` | Studio equipment categories |
| `kjov2_voice_projects` | Voice work projects |
| `kjov2_voice_clips` | Voice audio clips |
| `kjov2_voice_categories` | Voice project categories |
| `kjov2_voice_external_links` | Voice project links |
| `kjov2_productions` | Creative productions (feeds RSS when `status=live`) |
| `kjov2_productions_actions` | Production action links |
| `kjov2_productions_credits` | Production credits |
| `kjov2_productions_embeds` | Production embedded content |
| `kjov2_productions_productions_categories` | Production category assignments |
| `kjov2_category_config` | Production category metadata |
| `kjov2_tech_projects` | Technical projects |
| `kjov2_tech_showcase` | Tech showcase items |
| `kjov2_tech_stack` | Technology tags |
| `kjov2_tech_project_embeds` | Tech project embeds |
| `kjov2_gallery_albums` | Photo gallery albums |
| `kjov2_galleries` | Gallery images |
| `kjov2_audio_playlist` | Audio playlists |
| `kjov2_audio_playlist_tracks` | Playlist track ordering |
| `kjov2_testimonials` | Client testimonials |
| `kjov2_people` | People (credits, contributors) |
| `kjov2_icon_references` | Icon metadata |
| `kjov2_support_platforms` | Support/donation platforms |
| `kjov2_access_rules` | Content access rules |
| `kjov2_achievements` | Skills, certifications, and achievements |
| `kjov2_radio_subscribers` | Radio notification email subscriptions |
| `kjov2_now_entries` | /now page status updates (markdown, tags) |
| `kjov2_guestbook_entries` | Guestbook visitor messages (moderation queue) |
| `kjov2_vidtv_watching` | Currently watching shows/movies |
| `kjov2_games_playing` | Currently playing games |
| `kjov2_games_library` | Game library (partial — no UI yet) |

---

## Schema Management

### What's included in schema export

Schema snapshots (`docker/directus/schema.json`) include **collections, fields, and relations** — the data model only.

**NOT included** (must be set up manually or restored from database backup):
- Flows (automations) — see [Flows](#flows-automations) below
- Roles and permissions
- Settings
- Actual content data

### Exporting schema (from dev)

```bash
DEV_ADMIN_PASSWORD='your-password' npm run schema:snapshot
# → Saves to docker/directus/schema.json
```

The script (`scripts/schema-snapshot.js`) logs into dev Directus via `POST /auth/login` (admin JWT required — static API tokens can't access `/schema/*`), calls `GET /schema/snapshot`, extracts the `data` property, and writes to file.

### Auto-apply on container startup

`docker-compose.yml` mounts `docker/directus/schema.json` and overrides the startup command to run `docker/scripts/first-run.sh` before `npx directus start`. The script runs `npx directus schema apply` — it's idempotent (no-op when schema already matches).

If the schema file doesn't exist, `first-run.sh` skips schema apply and starts normally.

### Manual apply

Use `docker compose run --rm` to create a separate container with its own connection pool:

```bash
docker compose run --rm kjo2_directus npx directus schema apply /directus/config/schema.json --yes
```

**Do NOT use `docker exec`** — it shares the running server's Knex connection pool and causes KnexTimeoutError.

---

## Flows (Automations)

Directus Flows are NOT included in schema exports. They must be created manually in the Directus admin UI or restored from a database backup (`directus_flows` and `directus_operations` tables).

### Content Update Notifications (Directus → N8N)

This Flow sends a webhook to N8N whenever content is created or updated. N8N then fetches the updated item from Directus and passes it to an AI agent to generate social media posts (via Postiz).

#### Directus Flow setup

1. Open Directus admin → **Settings → Flows**
2. Click **Create Flow**
3. Configure the **Trigger**:
   - **Type:** Event Hook
   - **Scope:** `items.create`, `items.update`
   - **Collections:**
     - `kjov2_now_entries`
     - `kjov2_music_samples`
     - `kjov2_productions`
     - Optionally: `kjov2_voice_projects`, `kjov2_music_releases`, `kjov2_guestbook_entries`
4. Add an **Operation** (click the + on the trigger):
   - **Type:** Webhook / Request URL
   - **Method:** POST
   - **URL:** Your N8N webhook endpoint URL (e.g., `https://n8n.example.com/webhook/kjo-rss-update`)
   - **Headers:**
     ```
     rss-update-auth: Bearer <your-webhook-secret>
     Content-Type: application/json
     ```
     > **Header convention:** KJO webhooks use custom auth headers to avoid conflicts with N8N's own auth layer and to identify the source in workflows. Outgoing KJO webhooks use `KJOv2-Contact-Auth` (contact form) and `KJOv2-Guestbook-Auth` (guestbook). This Directus Flow uses `rss-update-auth`.
   - **Body:**
     ```json
     {
       "collection": "{{$trigger.collection}}",
       "event": "{{$trigger.event}}",
       "keys": {{$trigger.keys}}
     }
     ```
     > **Important:** Quote string template vars (`"{{$trigger.collection}}"`) but do NOT quote array vars (`{{$trigger.keys}}` without quotes). This ensures valid JSON output — strings are properly quoted, and `keys` resolves as a JSON array.
5. **Save** the Flow

#### What N8N receives

```json
{
  "collection": "kjov2_now_entries",
  "event": "kjov2_now_entries.items.update",
  "keys": ["6"]
}
```

- `event` includes the collection prefix (e.g., `kjov2_now_entries.items.update`, not just `items.update`)
- `keys` is a string array of Directus item IDs

#### N8N workflow pattern

1. **Webhook trigger node** — receives the POST, validates `rss-update-auth` header against your secret
2. **HTTP Request node** — fetch the updated item directly from Directus API:
   - **Method:** GET
   - **URL:** `https://director.keyjayonline.com/items/{{$json.body.collection}}/{{$json.body.keys[0]}}`
   - **Header:** `Authorization: Bearer <DIRECTUS_API_TOKEN>`
   - This returns the full item with all fields, with no cache delay
3. **Switch node** (optional) — route by `collection` value for different content types
4. **AI Agent node** — receives item data + collection context, generates a social media post
5. **Postiz node** — publishes the AI-generated post

> **Why fetch from Directus directly?** KJO's `/feed.xml` and `/api/now/feed.json` have 15-min in-memory caches. Fetching the item from Directus API (`/items/<collection>/<id>`) returns the exact updated content immediately.

#### Notes

- Existing outgoing webhooks (contact form, guestbook) go through KJO because they involve form processing. Content notifications go directly from Directus to N8N since no processing is needed.
- KJO's site-facing caches (feed.xml 15-min, latest-update 5-min, feed.json 15-min) expire naturally — no cache-busting is needed for the website itself.

---

## Seed Data & Backup

Flows, settings, roles, permissions, and content data are not in the schema export. Use `pg_dump` to back them up.

### Export from Docker Postgres

```bash
# Directus system tables (flows, operations, settings, roles, permissions)
docker exec kjo2_postgres pg_dump -U kjo_user -d kjo_v2_db \
  --data-only \
  --table=directus_flows \
  --table=directus_operations \
  --table=directus_settings \
  --table=directus_roles \
  --table=directus_permissions \
  > ./docker/directus/system-seed.sql

# App content seed data
docker exec kjo2_postgres pg_dump -U kjo_user -d kjo_v2_db \
  --data-only \
  --table=kjov2_general \
  --table=kjov2_socials \
  --table=kjov2_testimonials \
  > ./docker/directus/content-seed.sql
```

### Export from External Postgres

```bash
pg_dump -h your-db-host.com -p 5432 -U your_db_user -d your_db_name \
  --data-only \
  --table=directus_flows \
  --table=directus_operations \
  --table=directus_settings \
  --table=directus_roles \
  --table=directus_permissions \
  > ./docker/directus/system-seed.sql
```

For managed databases (DigitalOcean, AWS RDS), you may need to allowlist your IP and use `PGPASSWORD` or `.pgpass`.

### Import seed data

**Import order matters — apply schema FIRST, then seed data.**

```bash
# Docker Postgres
docker cp ./docker/directus/system-seed.sql kjo2_postgres:/tmp/
docker exec kjo2_postgres psql -U kjo_user -d kjo_v2_db -f /tmp/system-seed.sql

# External Postgres
psql -h your-db-host.com -p 5432 -U your_db_user -d your_db_name -f ./docker/directus/system-seed.sql
```

### Full database dump (for fresh setups or major divergence)

```bash
# Export
pg_dump -U xtreemmak -d directus_kjo_v2 --clean --if-exists --no-owner --no-privileges > dump.sql

# Import
docker compose exec kjo2_postgres psql -U kjo_user -d kjo_v2_db < dump.sql
```

---

## Troubleshooting

**KnexTimeoutError during schema commands**
- Don't use `docker exec` — it shares the running server's Knex pool
- Use `docker compose run --rm kjo2_directus npx directus schema apply ...` instead

**"Collection already exists" on schema apply**
- An orphaned PostgreSQL table exists without Directus metadata
- Fix: `DROP TABLE IF EXISTS <table> CASCADE;`

**Relational fields return UUID strings instead of objects**
- Use object notation for field queries: `{ cover_art: ['id', 'filename_disk'] }`
- Don't use dot notation with `'*'`: `'cover_art.id'` can cause relational fields to remain as UUID strings

**Schema endpoints return 401/403**
- Schema API requires an admin JWT, not a static API token (`DIRECTUS_TOKEN`)
- The `npm run schema:snapshot` script handles this by logging in via `POST /auth/login` first

**API response wrapping**
- Schema API returns `{data: {...}}` — extract `data` before passing to diff/apply endpoints

**Schema file missing on startup**
- `first-run.sh` gracefully skips schema apply and starts normally — this is expected on initial setup
