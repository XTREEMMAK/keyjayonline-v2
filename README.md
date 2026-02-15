# Key Jay Online v2

![Key Jay Logo](/static/img/KJ_Logo_Medium_W.svg)

Official website for musician, composer, and producer Key Jay, built with SvelteKit.

## Tech Stack

- **Framework**: SvelteKit 2 + Svelte 5
- **Styling**: Tailwind CSS 4 + Neumorphic design system
- **CMS**: [Directus](https://directus.io/) (headless CMS)
- **CDN**: DigitalOcean Spaces (S3-compatible) via `paths.assets`
- **Audio**: Wavesurfer.js
- **Icons**: Iconify
- **Hosting**: Docker on DigitalOcean

## Sections

- **About** - Bio, social links, featured work
- **Music** - Albums, latest projects, new releases, legacy works, studio gear
- **Tech** - Technical projects and showcases
- **Productions** - Films, comics, games, and creative productions with embeds, credits, galleries, and audio playlists

## Quick Start

```bash
# Clone and install
git clone <repository-url>
cd keyjayonline.com_v2
npm install

# Create local secrets file
cp .env.example .env.local
# Edit .env.local with your credentials

# Start development server
npm run dev
```

Visit `http://localhost:5173` to see the site.

## Environment Setup

This project uses Vite's auto-loading for environment files:

| File | Purpose | Git Status |
|------|---------|------------|
| `.env.example` | Template with all available variables | Committed |
| `.env.development` | Dev config (non-secrets) | Committed |
| `.env.local` | Your local secrets | Ignored |
| `.env` | Docker/production defaults | Ignored |

**Required secrets in `.env.local`:**
- `DIRECTUS_TOKEN` - API token for Directus
- `DB_PASSWORD` - Database password (for Docker)

**Required public env vars** (set in `.env.development`):
- `PUBLIC_SITE_URL` - Site URL (e.g., `http://localhost:5173`)
- `PUBLIC_CONTACT_EMAIL` - Contact form email

See `.env.example` for all available variables.

## CDN Architecture

SvelteKit's `paths.assets` is set to `CDN_BASE_URL` in production, so all client assets (JS bundles, CSS, images) load from the CDN instead of the app server.

- **CI auto-uploads** `build/client/` to S3 on every deploy (includes `_app/`, `img/`)
- **Videos/audio** are gitignored and uploaded manually via `npm run cdn:sync`
- **Directus uploads** live in the same S3 bucket under separate paths

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for CORS configuration and CDN details.

## Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview production build
npm run cdn:sync     # Upload local videos/audio to CDN
npm run docker:init  # First-time: start Directus + Postgres only
npm run docker:up    # Start all Docker containers
npm run docker:down  # Stop Docker containers
npm run docker:logs  # View Docker logs
npm run docker:build # Rebuild app Docker image
```

## Project Structure

```
src/
├── lib/
│   ├── api/             # Directus API layer
│   │   ├── core/        # Client, assets, shared transforms
│   │   ├── content/     # Music, productions, tech, gaming, etc.
│   │   ├── site/        # Settings, navigation
│   │   └── social/      # Social links
│   ├── actions/         # Svelte actions (letter animation, etc.)
│   ├── components/
│   │   ├── sections/    # Page sections (Music, Tech, Productions)
│   │   ├── music/       # Album modals, players, release cards
│   │   ├── tech/        # Tech project cards and showcases
│   │   ├── gaming/      # Game modals
│   │   ├── resources/   # Resource modals
│   │   ├── media/       # Video modals
│   │   ├── layout/      # Featured work, hero sections
│   │   ├── forms/       # Contact form
│   │   └── ui/          # Navbar, sticky nav, scroll-to-top, modals
│   ├── stores/          # Svelte stores (navigation, music player, sticky nav)
│   ├── styles/          # CSS (neumorphic system, modal styles)
│   ├── data/            # Static data files
│   ├── schemas/         # Validation schemas
│   ├── types/           # TypeScript types
│   └── utils/           # Utility functions (YouTube, external links, etc.)
├── routes/              # SvelteKit pages and share routes
└── static/              # Static assets (img/, videos/, audio/)
```

## Deployment

Production deployments are automated via GitHub Actions on push to `main`:

1. Build application
2. Upload client assets to CDN (S3)
3. Build Docker image and push to ghcr.io
4. SSH to server, generate `.env` from GitHub Secrets
5. `docker compose up` with health check and backup

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for full details, required secrets, and schema management.

## Development

See [DEVELOPMENT.md](docs/DEVELOPMENT.md) for Docker setup, environment configuration, schema management, and troubleshooting.

## License

All rights reserved.
