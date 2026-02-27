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

---
## [1.1.2] - 2026-02-27

### Added
- **Locked Frame Height**: In dual-view mode, slot heights are now constrained to prevent layout jumping and ensure a stable viewing experience.
- **Improved Panning Stability**: Content dragging logic refined to work seamlessly within fixed-height containers.

### Changed
- **Mobile Constraints**: Added minimum and maximum height limits for video slots in vertical mode to maintain interface usability.
- **Layout Refinement**: Optimized flex container properties for smoother split-ratio transitions.

### Technical Details
- Applied `max-h-[75vh]` to main video container on mobile.
- Added `min-h-[150px]` to individual slots to prevent excessive collapsing.

### Affected Files
- `src/App.jsx`

---
**本版本鎖定了分割模式下的視窗高度，避免在調整比例或拖動畫面時產生跳動，確保了結構的穩定性與專業感。**
**Locked slot heights in split mode to ensure structural stability and prevent layout jumping during viewport adjustments.**

---
## [1.1.1] - 2026-02-27

### Added
- **Adaptive Layout**: Split view now automatically switches between vertical (mobile) and horizontal (desktop) modes.
- **Viewport Panning**: Users can now drag the video content within a slot to adjust the focus area (zoom factor 1.5x).
- **Responsive Splitter**: The resizable divider now handles both vertical and horizontal resizing depending on the screen size.

### Changed
- **Color Consistency**: Removed all red elements; replaced with project-standard indigo/neutral colors for better aesthetic harmony.
- **Interaction Logic**: Differentiated between "drag to pan" and "click to play" to prevent accidental playback toggling.

### Technical Details
- Added `isMobile` state based on `window.innerWidth`.
- Implemented `panningOffset` logic in `PlayerSlot` using `transform: translate`.
- Updated `splitRatio` calculation to handle Y-axis resizing in vertical mode.

### Affected Files
- `src/App.jsx`

---
**本版本新增了「垂直/水平自適應佈局」與「畫面拖拽平移」功能，並全面移除了紅色元素以符合專案色調，大幅提升了行動裝置的操作體驗。**
**Added adaptive vertical/horizontal layouts and viewport panning, removed red elements for visual consistency, significantly improving mobile UX.**
