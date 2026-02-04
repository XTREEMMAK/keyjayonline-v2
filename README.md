# Key Jay Online v2

![Key Jay Logo](/static/img/KJ_Logo_Medium_W.svg)

Official website for musician, composer, and producer Key Jay, built with SvelteKit.

## Tech Stack

- **Framework**: SvelteKit 5 + Svelte 5
- **Styling**: Tailwind CSS 4
- **CMS**: Directus
- **Audio**: Wavesurfer.js
- **Icons**: Iconify
- **Hosting**: Docker on DigitalOcean

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
| `.env.local` | Your local secrets | Ignored |
| `.env.development` | Dev-specific overrides | Ignored |
| `.env` | Docker/production defaults | Ignored |

**Required secrets in `.env.local`:**
- `DIRECTUS_TOKEN` - API token for Directus
- `DB_PASSWORD` - Database password (for Docker)

See `.env.example` for all available variables.

## Deployment

Production deployments are automated via GitHub Actions on push to `main`:

1. Build & test application
2. Build Docker image → push to ghcr.io
3. SSH to server → generate `.env` from GitHub Secrets
4. `docker compose up` → health check → backup

**Required GitHub Secrets:**
- Database: `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`
- Directus: `DIRECTUS_KEY`, `DIRECTUS_SECRET`, `DIRECTUS_TOKEN`
- Storage: `S3_ACCESS_KEY`, `S3_SECRET_KEY`
- SSH: `SSH_HOST`, `SSH_USERNAME`, `SSH_KEY`, `SSH_PORT`

See `.github/workflows/deploy.yml` for the complete list.

## Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview production build
npm run docker:up    # Start Docker containers
npm run docker:down  # Stop Docker containers
```

## Project Structure

```
src/
├── lib/
│   ├── api/           # Directus API modules
│   ├── components/    # Svelte components
│   ├── stores/        # Svelte stores
│   └── utils/         # Utility functions
├── routes/            # SvelteKit pages
└── static/            # Static assets
```

## License

© 2025 Key Jay. All rights reserved.
