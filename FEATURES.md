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

## Planned Features (Not Yet Implemented)

### Gaming Library
- `kjov2_games_library` collection exists but no UI components built
- Optional IGDB integration for game metadata (`IGDB_CLIENT_ID`, `IGDB_ACCESS_TOKEN`)
- Optional Discord Rich Presence (`DISCORD_BOT_TOKEN`, `DISCORD_USER_ID`)

### Radio Player
- Standalone `/radio` route with immersive player
- Shuffle mode with Wavesurfer integration
- PWA install prompt and Media Session API
- See `FEATURE_TASKS/RADIOPLAYER.md` for full implementation plan
