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
## [1.1.5] - 2026-02-27

### Added
- **Per-Slot Video Zoom**: New zoom controls (+/-) added to each player slot, allowing users to magnify specific video areas (1x to 3x).
- **Global Data Management**: Brought back the "Clear Local Data" feature in the library sidebar using a neutral/indigo design, allowing users to wipe the entire IndexedDB store.
- **Panning Activation Guard**: Implemented a safety check to prevent dragging movement when interacting with the progress bar or playback controls, eliminating accidental seeking during viewport adjustments.

### Changed
- **Touch-Action Locking**: Reinforced viewport meta tags and CSS properties to lock systemic browser zooming, ensuring only the intended video areas scale.
- **Enhanced Contrast UI**: Zoom indicators use the project's indigo accent for clear readability against dark backgrounds.

### Technical Details
- Added `zoom` state and `scale` transform to `PlayerSlot`.
- Integrated `e.target.closest` logic in `handlePanStart` to selectively ignore gesture initiations.

### Affected Files
- `src/App.jsx`
- `index.html`

---
**本版本新增了影片區域的「獨立放大」功能，並加入了播放控制區的拖拽保護，避免在調整視角時誤觸進度條。同時恢復了清空本地資料的功能。**
**Added independent video zoom and panning guards to prevent seeking errors, while restoring the "Clear Local Data" feature with refined styling.**

---
## [1.1.4] - 2026-02-27

### Added
- **Optimized Panning Interaction**: Moved gesture listeners to the parent container, ensuring the video "focus area" can be adjusted even when the UI controls are visible.
- **Aspect-Fit Single Player**: In single-view mode, the video container now automatically adjusts its size to match the video's aspect ratio (16:9), eliminating unnecessary black borders.

### Changed
- **Zero-Latency Panning**: Removed CSS transitions from the `transform` property during dragging for an instantaneous, responsive feel.
- **Event Pass-Through**: Set `pointer-events-none` on the video element itself to allow the container to capture all dragging gestures without interference.

### Technical Details
- Implemented `aspectRatio` and `justify-center` on the main layout for better single-player centering.
- Refactored `PlayerSlot` event handlers to capture clicks and drags at the highest level.

### Affected Files
- `src/App.jsx`

---
**本版本修正了拖拽無反應的問題，並讓單視窗模式下的容器貼合影片比例，消除了多餘黑邊，大幅提升視覺精緻度。**
**Fixed panning responsiveness and optimized single-view container sizing to fit video aspect ratio, removing unnecessary black bars.**

---
## [1.1.3] - 2026-02-27

### Added
- **Full-Height Slots**: Video slots now occupy the maximum available vertical space for a true "full-screen split" experience.
- **Horizontal Focused Panning**: Optimized dragging logic specifically for horizontal movement, allowing users to scroll through wide-format videos within the split window.

### Changed
- **Visual Scale**: Removed forced scaling in favor of `h-full max-w-none` strategy, ensuring natural aspect ratios while allowing content overflow for panning.
- **Layout Stability**: Removed previously implemented height constraints (`75vh`) to allow full expansion.

### Technical Details
- Switched from `translate(x, y)` to `translateX` for more precise horizontal panning control.
- Updated `video` element CSS to `h-full max-w-none` to support horizontal scrolling via panning.

### Affected Files
- `src/App.jsx`

---
**本版本實作了「全高滿版視窗」，並優化了左右拖拽的平移邏輯，讓使用者在分割畫面時能更專注於水平方向的視角對齊。**
**Implemented full-height slots and optimized horizontal panning for better focused viewing in split mode.**

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
