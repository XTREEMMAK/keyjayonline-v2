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

## Radio Player (Partially Implemented)
- Standalone `/radio` route with immersive Wavesurfer player
- Shuffle mode with playlist management
- Radio launch modal and enable/disable via CMS (`kj_radio_on` toggle)
- Email subscription endpoint (`POST /api/radio/subscribe`)
- **Deferred:** PWA install prompt, push notifications, service worker (follow-up PR)

## Planned Features (Not Yet Implemented)

### Gaming Library
- `kjov2_games_library` collection exists but no UI components built
- Optional IGDB integration for game metadata (`IGDB_CLIENT_ID`, `IGDB_ACCESS_TOKEN`)
- Optional Discord Rich Presence (`DISCORD_BOT_TOKEN`, `DISCORD_USER_ID`)
