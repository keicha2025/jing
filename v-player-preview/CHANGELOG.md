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
**本版本為 V-Player 的初始上線版本，完整支援本地影片播放、IndexedDB 快取以及進度條預覽。**
**Initial release of V-Player with full local video support, IndexedDB caching, and progress preview.**
