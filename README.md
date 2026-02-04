# Key Jay Online v2

Official website for musician, composer, and producer Key Jay, built with SvelteKit.

## Features

- 🎵 **Interactive Music Player** - Full-featured audio player with wavesurfer.js visualization
- 🎨 **Modern Design** - Responsive design with Tailwind CSS
- 📱 **Mobile Optimized** - Works seamlessly across all devices
- 🎧 **Audio Library** - Organized music collection by genre
- 📝 **Dynamic Content** - Blog and portfolio sections
- 🚀 **Fast Performance** - Built with SvelteKit for optimal speed

## Tech Stack

- **Framework**: SvelteKit
- **Styling**: Tailwind CSS
- **Audio**: Wavesurfer.js
- **Icons**: Iconify
- **Database**: Directus (CMS)
- **Deployment**: Vercel/Netlify ready

## Project Structure

```
src/
├── lib/
│   ├── components/         # Reusable Svelte components
│   │   ├── PersistentMusicPlayer.svelte
│   │   ├── SpinningPlayButton.svelte
│   │   └── ...
│   ├── stores/            # Svelte stores for state management
│   │   └── musicPlayer.js
│   ├── data/              # Static data and configurations
│   │   └── audioPlaylists.js
│   └── services/          # API services and utilities
├── routes/                # SvelteKit routes (pages)
│   ├── +layout.svelte     # Global layout
│   ├── +page.svelte       # Homepage
│   ├── music/             # Music page
│   ├── blog/              # Blog section
│   └── ...
└── static/               # Static assets
    ├── audio/            # Music library organized by genre
    ├── img/              # Images and graphics
    └── ...
```

## Quick Start

```bash
git clone <repository-url>
cd keyjayonline.com_v2
npm install
cp .env.example .env  # Configure your environment
npm run dev
```

Visit `http://localhost:5173` to see the site.

## Documentation

- **[Development Setup Guide](docs/DEVELOPMENT.md)** - Comprehensive development environment setup
- **[Production Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment and security checklist  
- **[Audio CORS Bypass Technical Documentation](docs/AUDIO_CORS_BYPASS.md)** - Technical details of the audio system
- **[Music Player System](docs/MUSIC_PLAYER.md)** - Music player architecture and usage

## Development Setup

### Prerequisites

- Node.js 22+ (required by @directus/sdk)
- npm 10+
- Access to development database and Directus instance

### Environment Configuration

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Key variables for development:

```bash
# Database Configuration  
DATABASE_HOST=192.168.10.156
DATABASE_PORT=5432
DATABASE_NAME=kjo_v2_db

# Directus CMS
DIRECTUS_URL=http://192.168.10.24:8057
DIRECTUS_TOKEN=your_token

# CDN Configuration
CDN_BASE_URL=https://kjo.nyc3.cdn.digitaloceanspaces.com

# Audio CORS Bypass (Development Only)
BYPASS_CORS_IN_DEV=true
```

### Audio Development Features

The development environment includes automatic CORS bypass for audio files:

- **Automatic URL transformation** from CDN to localhost proxy
- **Vite proxy configuration** for seamless development
- **Environment-aware WaveSurfer configuration**
- **Production-safe** (automatically disabled in builds)

See [Development Guide](docs/DEVELOPMENT.md) for detailed setup instructions.

## Music Player System

The website features a comprehensive music player system:

### Audio Library Structure
- **EDM** - Electronic dance music tracks
- **Hip Hop** - Hip hop and rap productions
- **Orchestral** - Classical and cinematic compositions
- **Pop** - Popular music tracks
- **Rock** - Rock and alternative music
- **VGM** - Video game music
- **Atmosphere** - Ambient and atmospheric tracks

### Player Features
- Wavesurfer.js visualization with purple gradient bars
- Full playlist support with track navigation
- Auto-play next track
- Volume control
- Minimize/expand functionality
- Responsive design

## Components

### SpinningPlayButton
Interactive play button with spinning text animation that slides in from the right.

### PersistentMusicPlayer
Bottom-docked music player with:
- Waveform visualization
- Playlist controls
- Track navigation
- Volume control
- Minimize/expand options

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run check` - Run Svelte check

### Environment Variables

See [Development Setup Guide](docs/DEVELOPMENT.md) for complete environment variable documentation.

Example `.env.example` file is provided with all required variables.

## Deployment

**Important**: See [Production Deployment Guide](docs/DEPLOYMENT.md) for complete deployment instructions including:

- Security checklist and pre-deployment verification
- CDN CORS configuration requirements
- Environment variable setup for production
- Platform-specific deployment guides

### Supported Platforms
- Node.js servers (recommended)
- Vercel
- Netlify
- Any SvelteKit-compatible hosting

### Build Configuration
- Build command: `npm run build`
- Output directory: `build`
- Runtime: Node.js 18+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

© 2024 Key Jay. All rights reserved.

## Contact

For questions or support, contact Key Jay through the website contact form.