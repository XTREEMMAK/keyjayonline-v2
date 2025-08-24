# Music Player Documentation

This document describes the implementation and usage of the Key Jay Online music player system.

## Overview

The music player system consists of several interconnected components that provide a seamless audio experience across the website. The system has been refactored to eliminate code duplication and use shared utilities.

## Architecture

### Core Components

1. **PersistentMusicPlayer.svelte** - Main player component with wavesurfer integration
2. **PlaylistBrowser.svelte** - Music library browser with genre-based organization
3. **AlbumModalSwal.svelte** - Album detail modal with accordion-based mobile interface
4. **AudioPlayer.svelte** - Reusable audio player component
5. **musicPlayer.js** - Svelte store for state management
6. **audioPlaylists.js** - Audio library data structure

### Utility Libraries

1. **time.js** - Shared time formatting utilities
2. **colors.js** - Platform-specific color schemes
3. **responsive.js** - Responsive design utilities

## PersistentMusicPlayer Component

### Features
- Full-screen and minimized modes
- Wavesurfer.js integration for waveform visualization
- Playlist support with track navigation
- Volume control
- Auto-play functionality

### Props
None - controlled entirely through Svelte stores.

### Usage
```svelte
<PersistentMusicPlayer />
```

### State Management
The component uses reactive statements (`$effect`) to respond to store changes:
- Track changes trigger audio loading
- Volume changes update the wavesurfer instance
- Playing state controls UI updates

## SpinningPlayButton Component

### Features
- Circular spinning text animation
- Slide-in animation from the right
- Integrated play icon
- Hover and click effects

### Props
```typescript
interface Props {
  onClick: () => void;  // Function to execute on click
}
```

### Usage
```svelte
<SpinningPlayButton onClick={handlePlayButtonClick} />
```

## Store Management (musicPlayer.js)

### State Variables
```javascript
export const playerVisible = writable(false);      // Player visibility
export const isPlaying = writable(false);          // Playback state
export const currentTrack = writable(null);        // Current track object
export const playlist = writable([]);              // Array of tracks
export const currentTrackIndex = writable(0);      // Current track index
export const playerPosition = writable(0);         // Playback position
export const playerDuration = writable(0);         // Track duration
export const volume = writable(0.8);               // Volume level (0-1)
```

### Functions
```javascript
showPlayer()                    // Show the player
hidePlayer()                    // Hide the player
togglePlayer()                  // Toggle player visibility
loadPlaylist(tracks, index)     // Load tracks into playlist
playTrack(index)               // Play specific track by index
nextTrack()                    // Skip to next track
previousTrack()                // Skip to previous track
```

## Audio Library Structure (audioPlaylists.js)

### Data Format
```javascript
const audioPlaylists = {
  genre: {
    name: 'Display Name',
    icon: 'mdi-icon-name',
    tracks: [
      {
        title: 'Track Title',
        artist: 'Artist Name',
        audioUrl: '/audio/path/file.mp3',
        thumbnail: '/audio/path/thumbnail.jpg',
        genre: 'Genre'
      }
    ]
  }
}
```

### Available Genres
- **edm** - Electronic Dance Music (4 tracks) - includes SideXSide, Subdivide thumbnails
- **hiphop** - Hip Hop (4 tracks) - includes zld4 thumbnail
- **orchestral** - Orchestral/Classical (6 tracks) - includes DestinysWorld, Tribes_of_Dust_and_Metal, WeightofTheOtherPromise thumbnails
- **pop** - Pop Music (2 tracks) - includes ShouldIStay, WaitingonYou thumbnails
- **rock** - Rock Music (3 tracks) - no thumbnails available
- **vgm** - Video Game Music (3 tracks) - no thumbnails available
- **atmosphere** - Ambient/Atmospheric (1 track) - no thumbnails available

Note: Tracks without thumbnails display a default music note icon to maintain consistent UI.

### Helper Functions
```javascript
getAllTracks()              // Returns all tracks as flat array
getTracksByGenre(genre)     // Returns tracks for specific genre
getPlaylist(key)            // Returns specific playlist object
```

## Wavesurfer Configuration

### Settings
```javascript
const wavesurfer = WaveSurfer.create({
  container: containerElement,
  waveColor: 'rgb(200, 0, 200)',      // Purple gradient
  progressColor: 'rgb(100, 0, 100)',   // Darker purple
  height: 50,
  barWidth: 2,
  barGap: 1,
  barRadius: 2,
  cursorWidth: 2,
  cursorColor: '#fff',
  mediaControls: false,
  normalize: true,
  responsive: true,
  backend: 'WebAudio',
  interact: true
});
```

## Integration Example

### Basic Setup
```svelte
<script>
  import { showPlayer, loadPlaylist } from '$lib/stores/musicPlayer.js';
  import { getAllTracks } from '$lib/data/audioPlaylists.js';
  import SpinningPlayButton from '$lib/components/SpinningPlayButton.svelte';
  
  function handlePlayClick() {
    const tracks = getAllTracks();
    loadPlaylist(tracks, 0);
    showPlayer();
  }
</script>

<SpinningPlayButton onClick={handlePlayClick} />
```

### Custom Playlist Loading
```svelte
<script>
  import { loadPlaylist, showPlayer } from '$lib/stores/musicPlayer.js';
  
  function loadGenrePlaylist(genre) {
    const tracks = getTracksByGenre(genre);
    if (tracks.length > 0) {
      loadPlaylist(tracks, 0);
      showPlayer();
    }
  }
</script>

<button onclick={() => loadGenrePlaylist('edm')}>
  Play EDM
</button>
```

## Styling Notes

### CSS Classes
The player uses Tailwind CSS classes for styling:
- `bg-gray-900/95` - Semi-transparent dark background
- `backdrop-blur-md` - Blur effect
- `transition-all duration-300` - Smooth animations
- Custom gradient classes for the waveform

### Responsive Design
- Minimized mode for smaller screens
- Touch-friendly controls
- Adaptive layout based on viewport

## Recent Updates

### Code Refactoring (Current Version)
- **Shared Utilities**: Created shared `formatTime()` function in `/lib/utils/time.js`
- **Color Management**: Centralized platform colors in `/lib/utils/colors.js`
- **Responsive Design**: Added responsive utilities in `/lib/utils/responsive.js`
- **Mobile Interface**: Implemented accordion-based mobile interface for album modals
- **Database Integration**: Social media links now come from database instead of hardcoded values
- **Thumbnail Optimization**: Fixed 404 errors by setting non-existent thumbnails to `null`

### New Features
- **PlaylistBrowser**: Genre-based music library with search and filtering
- **Album Modals**: Mobile-responsive modals with streaming links and credits
- **Cover Art Extraction**: Automatic extraction of embedded cover art from audio files
- **Environment Variables**: Site configuration moved to environment variables

## Troubleshooting

### Common Issues

1. **Tracks not playing**
   - Verify audio file paths are correct in `audioPlaylists.js`
   - Check browser audio permissions
   - Ensure files are accessible in static directory

2. **Wavesurfer not loading**
   - Check container element exists in DOM
   - Verify wavesurfer.js is imported correctly
   - Check browser console for errors
   - Ensure container has proper dimensions

3. **Store not updating**
   - Ensure proper store subscriptions (`$store`)
   - Check for reactive statement syntax (`$effect`, `$derived`)
   - Verify store imports are correct

4. **Thumbnails showing 404 errors**
   - Check that thumbnail paths in `audioPlaylists.js` match actual files
   - Set `thumbnail: null` for tracks without thumbnail files
   - Default music note icon will display automatically

### Performance Notes
- Debug logging has been removed from production code
- Shared utilities reduce bundle size and improve maintainability
- Responsive utilities ensure consistent breakpoints across components

## Performance Considerations

- Audio files are loaded on-demand
- Wavesurfer instances are properly destroyed on component cleanup
- Store subscriptions are automatically cleaned up by Svelte
- Large playlists are virtualized in the UI for better performance