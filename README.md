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

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd keyjayonline.com_v2
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

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

Create a `.env` file in the root directory:

```env
DIRECTUS_URL=your_directus_instance_url
DIRECTUS_TOKEN=your_directus_token
```

## Deployment

The site is configured for easy deployment on:
- Vercel (recommended)
- Netlify
- Any Node.js hosting platform

Build command: `npm run build`
Output directory: `build`

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