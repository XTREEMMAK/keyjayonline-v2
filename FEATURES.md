# Features

## Core Features

### Music Player
- Wavesurfer.js waveform visualization
- Playlist support with track navigation
- Album modals with streaming links
- CORS bypass for development audio playback

### Music Studio
- Studio gear and equipment showcase
- Categorized by equipment type (via `kjov2_studio_categories`)

### Share Links
- Shareable URLs for albums, samples, voice projects, and productions
- Routes: `/share/album/[id]`, `/share/sample/[id]`, `/share/voice/[id]`, `/share/production/[id]`
- SEO-friendly slugs auto-generated in Directus
- Open Graph meta tags for social sharing

### Testimonials
- Directus-managed testimonials with client metadata
- Service-type filtering (voice, productions, music, creative)
- Avatar support with fallback initials

### Productions Portfolio
- Category and tag filtering with MixItUp 3 animated transitions
- External links to streaming platforms
- Embeddable content previews (video, audio)
- Credits with role attribution
- Action links (watch, listen, buy)
- Gallery albums with lightbox viewer

### Voice Projects
- Audio clips with Wavesurfer playback
- Category filtering with MixItUp 3
- External links section

### Tech Section
- Technical project cards with descriptions and tech stack tags
- Showcase items with embedded demos
- Filterable by technology

### Galleries & Media
- Gallery albums with image collections
- Audio playlists with track ordering
- Video embeds (YouTube, Vimeo)

### Contact Form
- reCAPTCHA Enterprise (score-based, invisible v3) with graceful degradation
- Honeypot field for bot detection
- Submission timing validation (minimum 3s, maximum 30 min)
- Rate limiting: 5 submissions / 15 min / IP (in-memory)
- Valibot schema validation
- N8N webhook delivery with HMAC signature verification

### Maintenance Mode
- CMS-controlled via `kjov2_general.status` field
- Triple-click wrench icon on `/maintenance` page triggers PIN entry modal
- Timing-safe PIN comparison against `MAINTENANCE_BYPASS_PIN` env var
- HMAC-SHA256 signed httpOnly bypass cookie (8-hour TTL)
- Dedicated rate limiter: 3 attempts / 15 min / IP
- "Maintenance Preview Mode" amber banner when bypassed
- Debug tools (music player debug log) only visible in bypass mode

### Media Session API
- Persistent player registers MediaSession with artwork, title, and artist
- Hardware/Bluetooth controls (play/pause/next/prev) work from lock screen and car displays
- Position tracking for seek bar support

### /now Page
- Markdown-rendered status updates from `kjov2_now_entries` Directus collection
- Tag filtering, relative dates ("2 hours ago"), staggered fade-in animations
- Pagination with page navigation
- Slug-based permalinks (`/now?entry=my-slug`)
- Image modals for inline images
- RSS button linking to `/feed.xml`
- Content sanitized via `marked` + `isomorphic-dompurify`

### Feeds & Syndication
- **`/feed.xml`** — RSS 2.0 feed merging `kjov2_now_entries` (20), `kjov2_music_samples` with `is_radio_new` (10), and `kjov2_productions` with `status=live` (10). Top 20 items sorted by `date_created`. 15-min in-memory cache. `<category>` tags distinguish content types (Updates, Music, Productions).
- **`/api/now/feed.json`** — JSON feed of 5 latest `/now` entries. CORS enabled for NeoCities outpost (`CORS_ALLOWED_ORIGINS` env var). JSONP support for CSP-restricted consumers. 15-min cache.
- **`/api/site/latest-update`** — Returns most recent `date_created` across now_entries, music_samples, and productions. 5-min cache. Drives the NewContentIndicator.

### New Content Indicator
- Yellow pulsing dot on navbar logos and mobile hamburger menu
- Compares `kjo_last_visit` localStorage timestamp against `/api/site/latest-update`
- "New updates" link in mobile menus navigates to `/now`
- Component: `NewContentIndicator.svelte`
- Store: `newContent.js`

### Guestbook
- `/guestbook` page with paginated published entries
- New entries submitted via `POST /api/guestbook/entries` with reCAPTCHA Enterprise verification
- Entries created as draft in Directus (moderation queue)
- Rate limited: 5 submissions / 15 min / IP
- N8N webhook notification on new submission (bearer token auth, 5s timeout)

### Content Update Notifications
- Directus Flows (built-in automation) POST directly to N8N on `items.create` / `items.update`
- Scoped to content collections: `kjov2_now_entries`, `kjov2_music_samples`, `kjov2_productions`
- No KJO intermediary needed — Directus handles trigger, filtering, and auth natively
- Flows are NOT included in `npx directus schema apply` — must be manually recreated on fresh instances or restored from `pg_dump` backup (`directus_flows` / `directus_operations` tables)
- See [DIRECTUS.md](docs/DIRECTUS.md) for step-by-step Flow setup instructions

### Google Analytics 4
- CMS-controlled measurement ID (`ga_measurement_id` field in site settings)
- Server-side regex validation of measurement ID format before injection

### Skills & Achievements
- `kjov2_achievements` collection for milestones, certifications, and awards
- Displayed in the About section achievements tab

### Schema Migrations
- Automated schema apply on Directus container startup
- `npm run schema:snapshot` exports dev schema to `docker/directus/schema.json`
- Idempotent — safe to run on every deploy
- See [DIRECTUS.md](docs/DIRECTUS.md) for full schema management, seed data, and Flows guide

## Directus Collections

| Collection | Purpose |
|------------|---------|
| `kjov2_general` | Site settings |
| `kjov2_socials` | Social media links |
| `kjov2_music_releases` | Music albums and releases |
| `kjov2_music_tracks` | Individual tracks |
| `kjov2_music_credits` | Music credits and attributions |
| `kjov2_music_samples` | Audio samples |
| `kjov2_music_videos` | Music video embeds |
| `kjov2_music_external_links` | Streaming platform links |
| `kjov2_music_networks` | Distribution networks |
| `kjov2_music_studio` | Studio gear and equipment |
| `kjov2_studio_categories` | Studio equipment categories |
| `kjov2_voice_projects` | Voice work projects |
| `kjov2_voice_clips` | Voice audio clips |
| `kjov2_voice_categories` | Voice project categories |
| `kjov2_voice_external_links` | Voice project links |
| `kjov2_productions` | Creative productions |
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

## Radio Player (Partially Implemented)
- Standalone `/radio` route with immersive Wavesurfer player
- Shuffle mode with playlist management
- Radio launch modal and enable/disable via CMS (`kj_radio_on` toggle)
- Email subscription endpoint (`POST /api/radio/subscribe`)
- **Deferred:** PWA install prompt, push notifications, service worker (follow-up PR)

## Planned / Partial Features

### Gaming Library (Partial)
- `kjov2_games_library` and `kjov2_games_playing` collections exist
- Currently playing games displayed on site
- Full library UI not yet built
- Optional IGDB integration for game metadata (`IGDB_CLIENT_ID`, `IGDB_ACCESS_TOKEN`)
- Optional Discord Rich Presence (`DISCORD_BOT_TOKEN`, `DISCORD_USER_ID`)
