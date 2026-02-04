# Features

## Core Features

### Music Player
- Wavesurfer.js waveform visualization
- Playlist support with track navigation
- Album modals with streaming links
- CORS bypass for development audio playback

### Share Links
- Shareable URLs for albums, samples, voice projects, and productions
- SEO-friendly slugs auto-generated in Directus
- Open Graph meta tags for social sharing

### Testimonials
- Directus-managed testimonials with client metadata
- Service-type filtering (voice, productions, music, creative)
- Avatar support with fallback initials

### Productions Portfolio
- Category and tag filtering
- External links to streaming platforms
- Embeddable content previews

### Voice Projects
- Audio clips with Wavesurfer playback
- Category filtering
- External links section

## Directus Collections

| Collection | Purpose |
|------------|---------|
| `kjov2_general` | Site settings |
| `kjov2_socials` | Social media links |
| `kjov2_music_releases` | Music albums |
| `kjov2_music_samples` | Audio samples |
| `kjov2_voice_projects` | Voice work |
| `kjov2_productions` | Creative productions |
| `kjov2_testimonials` | Client testimonials |
| `kjov2_games_library` | Gaming collection (optional) |
| `kjov2_resources` | Resource hub (optional) |
| `kjov2_photos` | Photo gallery (optional) |

## Optional Integrations

### Discord Gaming (requires credentials)
- `DISCORD_BOT_TOKEN`, `DISCORD_USER_ID`
- Real-time Rich Presence display
- Gaming sessions tracking

### IGDB (requires credentials)
- `IGDB_CLIENT_ID`, `IGDB_ACCESS_TOKEN`
- Game metadata enrichment
- Cover art and details lookup
