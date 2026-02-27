# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-02-21

### Added
- Initial release of V-Player.
- Premium Cinema aesthetic with dynamic background gradients.
- Support for local video file playback (MP4, WebM).
- Local storage caching using IndexedDB (files persist after page reload).
- Progress bar with hover preview thumbnail.
- Playback speed control (0.5x to 2.0x).
- Fullscreen support with fallback for iOS/Safari.
- PWA support for standalone installation and offline capability.
- Playlist management with "Clear Cache" functionality.

### Changed
- Shifted architecture from Audio Player base to Video Player.

### Fixed
- Corrected deployment structure: `dist` folder is now uploaded as regular files instead of a gitlink, ensuring the site can be correctly hosted on GitHub Pages.

### Technical Details
- Built with React + Vite + Tailwind CSS.
- Uses `vite-plugin-pwa` for service worker management.
- Implements `IndexedDB` via `VPlayerDB` for large blob storage.
- Custom CSS for premium glassmorphism effects and scrollbars.
- Fixed a Git submodule/gitlink issue that prevented build artifacts from being pushed.

### Affected Files
- `src/App.jsx`
- `src/index.css`
- `vite.config.js`
- `index.html`

---
## [1.1.0] - 2026-02-27

### Added
- **Multi-View System**: Support for simultaneously watching two videos in split-screen mode.
- **Resizable Layout**: Interactive divider allows users to adjust the split ratio between videos.
- **Gesture Support**: Added double-tap on video container to toggle fullscreen.
- **Mobile Optimizations**: Enhanced touch support for progress bar previews.

### Changed
- Refactored monolithic player into a modular `PlayerSlot` component.
- Significantly enlarged skip (10s) buttons for better accessibility and touch targets.
- Updated playlist/media library to serve as a video selector for specific slots.

### Technical Details
- Implemented `useCallback` for optimized resize event handling.
- Integrated `onTouchStart/Move/End` events for smoother mobile timeline scrubbing.
- Enhanced CSS transitions for layout switching.

### Affected Files
- `src/App.jsx`

---
**本版本新增「多視窗模式」與「可調分割比例」功能，並針對手機版優化了進度條預覽與手勢操作，顯著提升操作便利性。**
**Added Multi-View and resizable split layouts, optimized mobile touch previews and gestures for better usability.**
