# Radio Feature Implementation Plan

## Context
Build a `/radio` route for KeyJayOnline.com v2 — a continuous radio experience that plays through curated playlists from the existing `kjov2_music_samples` collection. The radio page will be a standalone immersive experience (no main site navbar/footer), reuse the existing `musicPlayer` store and `PersistentMusicPlayer` WaveSurfer infrastructure, and support car/mobile via Media Session API, PWA install prompts, and future email notifications via N8N webhook.

## Architecture Decisions
- **Player**: Reuse + enhance existing `musicPlayer.js` store and WaveSurfer setup (no duplication)
- **Layout**: Standalone full-screen layout (dedicated `+layout.svelte` under `/radio`)
- **Email notifications**: Defer sending — build `kjov2_radio_subscribers` collection and `/api/radio/subscribe` endpoint now; N8N webhook integration later
- **Directus schema**: Add fields to existing `kjov2_music_samples`, create new collections for settings/subscribers/playlists

---

## Phase 1: Foundation — Route, Layout, API

### 1a. Directus Schema Additions

**Modify `kjov2_music_samples`** — add fields:
| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `include_in_radio` | boolean | false | Include track in radio rotation |
| `radio_sort_order` | integer | null | Manual sort order |
| `is_radio_new` | boolean | false | "New" badge in radio queue |
| `radio_added_at` | datetime | null | When added to radio |

**New: `kjov2_radio_settings`** (singleton):
| Field | Type | Purpose |
|-------|------|---------|
| `id` | PK | — |
| `maintenance_mode` | boolean | Kill switch |
| `maintenance_message` | text | Message during maintenance |
| `current_playlist_id` | M2O → `kjov2_radio_playlists` | Active playlist (null = all `include_in_radio` tracks) |

**New: `kjov2_radio_playlists`**:
| Field | Type | Purpose |
|-------|------|---------|
| `id` | PK | — |
| `name` | string | Playlist name |
| `description` | text | Optional |
| `tracks` | M2M → `kjov2_music_samples` | Track list |
| `is_active` | boolean | Enable/disable |
| `sort_order` | integer | Display order |
| `date_created` / `date_updated` | datetime | Timestamps |

**New: `kjov2_radio_subscribers`**:
| Field | Type | Purpose |
|-------|------|---------|
| `id` | PK | — |
| `email` | string (unique) | Subscriber email |
| `notification_opt_in` | boolean | Opted in for notifications |
| `subscribed_at` | datetime | When subscribed |
| `last_notified_at` | datetime | Last notification sent |

### 1b. API Endpoints

Create under `src/routes/api/radio/`:

| Endpoint | Method | Purpose | File |
|----------|--------|---------|------|
| `/api/radio/playlist` | GET | Fetch radio tracks (respects settings) | `playlist/+server.js` |
| `/api/radio/settings` | GET | Maintenance mode check | `settings/+server.js` |
| `/api/radio/subscribe` | POST | Email opt-in | `subscribe/+server.js` |
| `/api/radio/track/[id]` | GET | Individual track details | `track/[id]/+server.js` |

**Reuse**: `getDirectusInstance()`, `readItems()`, `buildAssetUrl()` from `src/lib/api/core/`

**`/api/radio/playlist` logic:**
1. Fetch `kjov2_radio_settings` for active playlist ID
2. If playlist ID set → fetch M2M tracks from that playlist
3. If null → fetch all `kjov2_music_samples` where `include_in_radio: true`
4. Sort by `radio_sort_order` (nulls last), then `radio_added_at` desc
5. Transform URLs via `buildAssetUrl()`
6. Return `{ tracks, settings: { maintenanceMode, maintenanceMessage } }`

### 1c. Radio Route & Layout

**New files:**
- `src/routes/radio/+layout.svelte` — standalone layout (no NeumorphicNavbar/Footer)
- `src/routes/radio/+layout.server.js` — load radio settings + support platforms from Directus
- `src/routes/radio/+page.svelte` — main radio page
- `src/routes/radio/+page.server.js` — SSR data (initial playlist, settings, maintenance check)

**Layout structure:**
```
<div class="radio-app h-dvh flex flex-col bg-[var(--neu-bg)]">
  <!-- Top bar: Back to site button + branding -->
  <!-- Main content: Now playing artwork + metadata -->
  <!-- Bottom: Player controls (sticky) -->
  <slot />
</div>
```

---

## Phase 2: Radio Player UI

### 2a. Enhance musicPlayer Store

**File:** `src/lib/stores/musicPlayer.js`

Add:
- `shuffleMode` writable (boolean) — toggle shuffle on/off
- `shuffleHistory` writable (array) — last 10 played track indices (no repeats)
- `radioMode` writable (boolean) — when true, player is in radio context
- `loadRadioPlaylist(tracks)` — loads playlist with `source: 'radio'`
- Modify `nextTrack()` — if `shuffleMode`, pick random from unplayed (Fisher-Yates), skip last 10
- `getQueue()` derived — returns upcoming tracks (next 5-10)

### 2b. Radio Page Component

**File:** `src/routes/radio/+page.svelte`

**Sections (top to bottom on mobile):**

1. **Top Bar** (fixed, slim)
   - Back arrow → `/` (main site)
   - "KEY JAY RADIO" branding
   - Settings gear icon (future)

2. **Now Playing** (flex-1, scrollable)
   - Large album artwork (centered, rounded, shadow)
   - Track title (large text)
   - Artist name
   - "NEW" badge if `is_radio_new: true`
   - Bandcamp link (if available in track external links)
   - "Support on Ko-Fi" CTA button (from `kjov2_support_platforms`)

3. **Queue Panel** (collapsible, slides up from bottom)
   - "Up Next" heading
   - Scrollable track list with thumbnails
   - "NEW" badges on new tracks
   - Tap to jump to track

4. **Player Controls** (fixed bottom bar, ~120px)
   - Progress bar (full width, draggable) — reuse WaveSurfer or custom `<input type="range">`
   - Time display (current / duration)
   - Control row: Previous | Play/Pause (56px) | Next
   - Secondary row: Shuffle toggle | Queue toggle | Share | Volume (desktop only)

**Design:** Neumorphic dark theme matching site (`--neu-bg`, shadows, glassmorphism)

### 2c. WaveSurfer Integration

Reuse existing pattern from `PersistentMusicPlayer.svelte`:
- Radio page manages its OWN WaveSurfer instance (full-width, radio-specific visual config)
- On mount, set `radioMode: true` in store; on destroy, set `radioMode: false`
- PersistentMusicPlayer hides when `radioMode` is true
- Events: `finish` → `nextTrack()` (already wired), `audioprocess` → update progress

### 2d. Maintenance Mode

In `+page.server.js`, if `maintenance_mode: true`:
- Pass `maintenance: { active: true, message }` to page
- Page renders full-screen overlay with message + link back to main site
- All player controls hidden

---

## Phase 3: Media Session API + Car Integration

### 3a. Media Session (already partially exists)

**File:** `src/lib/components/music/PersistentMusicPlayer.svelte` lines 70-102

Already implemented:
- `navigator.mediaSession.metadata` with title, artist, artwork
- Action handlers: play, pause, previoustrack, nexttrack

**Enhancements for radio:**
- Ensure artwork array includes multiple sizes (96, 128, 256, 512)
- Add `seekbackward` / `seekforward` handlers (10s skip)
- Set `navigator.mediaSession.playbackState` on play/pause
- Update `positionState` for seek bar on car displays:
  ```js
  navigator.mediaSession.setPositionState({ duration, playbackRate: 1, position: currentTime });
  ```

Move Media Session logic to a shared utility (`src/lib/utils/mediaSession.js`) so both PersistentMusicPlayer and the radio page can call it.

---

## Phase 4: PWA Install Prompt

### 4a. Install Prompt Component

**New file:** `src/lib/components/radio/PwaInstallPrompt.svelte`

**Logic:**
1. Listen for `beforeinstallprompt` event (stash the event)
2. Track listening time via `setTimeout(30000)` and track count
3. Show prompt when: 30s elapsed OR 2nd track starts (whichever first)
4. Check `localStorage.getItem('radio-pwa-dismissed')` — if dismissed, check timestamp; re-prompt after 7 days
5. On install: call `deferredPrompt.prompt()`, track outcome
6. On dismiss: set `localStorage.setItem('radio-pwa-dismissed', Date.now())`

**UI:** Non-intrusive toast/banner at top of radio page
- "Install Key Jay Radio for quick access from your home screen"
- [Install] [Dismiss X]

### 4b. Manifest Enhancement

**File:** `static/manifest.json`

Add radio-specific shortcut:
```json
{ "name": "Radio", "url": "/radio", "icons": [{ "src": "/icons/radio-96.png", "sizes": "96x96" }] }
```

---

## Phase 5: Notifications & Subscription

### 5a. Subscription Endpoint

**File:** `src/routes/api/radio/subscribe/+server.js`

- Validate email (regex + length)
- Check for duplicate (query Directus)
- Insert into `kjov2_radio_subscribers` via `createItem()`
- Return `{ success: true }` or `{ error: 'Already subscribed' }`

### 5b. Notification Permission Flow

**New file:** `src/lib/components/radio/NotificationOptIn.svelte`

**Flow:**
1. After 3+ tracks played (tracked in component state or localStorage)
2. Show modal: "Get notified when new tracks drop"
3. Request browser notification permission (`Notification.requestPermission()`)
4. If granted → show email input form
5. Submit to `/api/radio/subscribe`
6. Store `radio-notif-dismissed` in localStorage

### 5c. Email Sending (Deferred)

- Build the subscriber collection and endpoint now
- Email sending will be triggered via N8N webhook later
- Placeholder: Add a comment in the subscribe endpoint noting where the webhook call will go
- Directus Flow: When `kjov2_music_samples.include_in_radio` changes to `true`, trigger webhook to N8N (configured in Directus admin, not in SvelteKit code)

---

## Phase 6: Service Worker (PWA Offline)

### 6a. Basic Service Worker

**File:** `src/service-worker.js` (SvelteKit convention)

Strategy:
- **App shell**: Cache-first for JS/CSS bundles (`/_app/`)
- **Radio page**: Network-first with offline fallback
- **Audio files**: Cache on play (runtime caching), keep last 3 tracks
- **Artwork**: Cache-first with network fallback
- **API responses**: Network-first, stale-while-revalidate for playlist

SvelteKit provides `$service-worker` module with `build`, `files`, `version` for precaching.

### 6b. Offline Fallback

If offline and no cached tracks:
- Show "You're offline" message
- Display cached track list (if any)
- Allow playback of cached audio

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/routes/radio/+layout.svelte` | Standalone radio layout |
| `src/routes/radio/+layout.server.js` | Load settings/support platforms |
| `src/routes/radio/+page.svelte` | Main radio page |
| `src/routes/radio/+page.server.js` | SSR playlist + settings |
| `src/routes/api/radio/playlist/+server.js` | Playlist endpoint |
| `src/routes/api/radio/settings/+server.js` | Settings endpoint |
| `src/routes/api/radio/subscribe/+server.js` | Subscription endpoint |
| `src/routes/api/radio/track/[id]/+server.js` | Track detail endpoint |
| `src/lib/utils/mediaSession.js` | Shared Media Session logic |
| `src/lib/components/radio/PwaInstallPrompt.svelte` | PWA install prompt |
| `src/lib/components/radio/NotificationOptIn.svelte` | Notification/email opt-in |
| `src/lib/components/radio/QueuePanel.svelte` | Track queue sidebar/panel |
| `src/lib/components/radio/NowPlaying.svelte` | Now playing display |
| `src/lib/components/radio/RadioControls.svelte` | Player controls bar |
| `src/lib/components/radio/MaintenanceOverlay.svelte` | Maintenance mode screen |
| `src/service-worker.js` | PWA service worker |

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/stores/musicPlayer.js` | Add shuffleMode, shuffleHistory, radioMode, queue helpers |
| `src/lib/components/music/PersistentMusicPlayer.svelte` | Hide when `radioMode` is true |
| `static/manifest.json` | Add radio shortcut |
| `src/lib/api/index.js` | Export new radio API functions |

## Existing Code to Reuse

| What | Where | How |
|------|-------|-----|
| Directus client | `src/lib/api/core/client.js` | `getDirectusInstance()`, `readItems()`, `createItem()` |
| Asset URLs | `src/lib/api/core/assets.js` | `buildAssetUrl()` for audio/artwork URLs |
| CORS proxy | `src/lib/utils/environment.js` | `getAudioUrl()` for dev proxy |
| WaveSurfer config | `src/lib/utils/wavesurfer-helpers.js` | `getBaseWaveSurferConfig()` |
| Player state | `src/lib/stores/musicPlayer.js` | All existing stores + functions |
| Media Session | `PersistentMusicPlayer.svelte:70-102` | Extract to shared utility |
| Support platforms | `+layout.server.js` | Ko-Fi data from `kjov2_support_platforms` |
| Neumorphic CSS | `src/lib/styles/neumorphic.css` | All `--neu-*` variables, `.neu-card`, `.neu-button` |
| Cover art extraction | `src/lib/utils/coverArtExtractor.js` | `extractCoverArt()` for ID3 artwork |
| Share links | `src/lib/utils/shareLinks.js` | `generateShareUrl()`, `copyShareUrl()` |

## Verification Checklist

- [ ] Dev server: `npm run dev` → `/radio` renders standalone layout
- [ ] Playlist loading: Tracks load from API (`include_in_radio: true` in Directus)
- [ ] Playback: Play/pause/next/previous work, auto-advance on track end
- [ ] Shuffle: Toggle shuffle, no repeats within last 10
- [ ] Queue: Open queue panel, tap track to jump, "NEW" badges display
- [ ] Media Session: Bluetooth/car display shows track info, hardware controls work
- [ ] Maintenance: `maintenance_mode: true` in Directus → overlay shown
- [ ] PWA prompt: On mobile, 30s or 2nd track → install banner appears
- [ ] Subscribe: Email submission → row created in Directus
- [ ] Offline (Phase 6): Airplane mode → cached tracks still play
- [ ] Mobile: iPhone SE (375px) → controls are thumb-friendly (48px+ targets)
- [ ] Build: `npm run build` succeeds with no errors
