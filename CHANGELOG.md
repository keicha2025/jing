# Changelog

## [2026-02-16]
### Added
- Created a new Vite-based React project for the audio player in the `preview` directory.
- Implemented "High-Efficiency Master Control Layout" (方案一) for the audio player.
- Added 3-second skip forward/backward functionality.
- Added playback speed control (0.5x, 0.75x, 1x, 1.25x, 1.5x, 1.75x, 2x, 2.5x).
- Implemented large, touch-friendly buttons for play/pause and skip actions.
- Integrated `lucide-react` for modern icon system.
- Enhanced UI with dynamic background gradients and premium aesthetics.
- Optimized layout for mobile devices (Mobile-First approach).
- Updated time format to support hours (HH:MM:SS) for longer audio tracks.
- Implemented **IndexedDB persistence** to keep uploaded audio files after page reloads.
- Added a **Clear Cache (清除快取)** button to explicitly remove stored audio files.

## [2026-02-19]
### Fixed
- Enabled vertical scrolling for mobile landscape orientation by removing `overflow: hidden` from body and main container.

優化行動裝直橫向顯示體驗，解鎖橫向模式下的垂直捲動功能，確保在螢幕高度不足時仍能操作完整介面。

建立基於 Vite 的 React 音檔播放器，並實作高效大按鈕佈局。新增 3 秒快進快退、多段變速功能，並針對行動裝置優化版面結構。新增 IndexedDB 持久化儲存功能，讓音檔在重新整理後依然存在，並提供清除快取按鈕。配置 GitHub Actions 實現自動化 CI/CD 部署。新增版本標記 v1.1.0 並觸發自動化建置。應用完美的正方形圖示（包含 SVG, ICO, PNG），修復 PWA 在 Chrome 上的圖示加載問題。

## [2026-02-21]
### Added
- Created `index.html` at the repository root as a project index homepage.
- Scanned all subdirectories and standalone HTML files to discover 9 web projects.
- Each project card includes title, description, relative link, and a Lucide icon.
- Built-in search/filter functionality for quick project lookup.
- Uses Tailwind CSS CDN, Lucide icons, and Inter + Noto Sans TC fonts.

**Affected files:** `index.html`

在倉庫根目錄建立專案索引首頁，自動掃描並列出 9 個子專案入口（DeepNight、note、音檔播放器、V-Player、Travel Planner、名古屋行程、沖繩兩版行程、售價計算器），含搜尋篩選功能。

## [2026-02-21] NightWhisper Rename
### Changed
- Renamed "DeepNight 睡眠追蹤" to "NightWhisper 夜語" and "DeepNight" to "NightWhisper" across the PWA Application (HTML, JS, CSS, JSON, Manifest, Worker).
- Performed a manual directory rename from `deepnight/` to `nightwhisper/` and generated requested PWA icons from `appicon.png`.
- Updated the main index homepage to reflect the new "NightWhisper 夜語" naming and paths.

全面將睡眠追蹤 PWA 應用程式由「DeepNight 睡眠追蹤」正式更名為「NightWhisper 夜語」，包含重新命名專案目錄、基於 `appicon.png` 產生 PWA 圖示，並同步更新了根目錄首頁的專案連結。

## [2026-02-21] NightWhisper Enhancements
### Added
- Added a new download button to each session in the history list.
- Implemented logic to retrieve all IndexedDB audio blob segments for a session, concatenate them into a single `audio/webm` file, and trigger a native download to the user's device storage.
### Changed
- Changed PWA `short_name` to "夜語" so that it displays cleanly on mobile home screens without English prefix.

進一步優化 PWA 安裝體驗，將桌面圖示名稱縮短為全中文的「夜語」。並在歷史紀錄列表新增實用的「下載按鈕」，利用 Blob 合併技術將瀏覽器內部 IndexedDB 錄製好的分段音檔打包成完整的 `.webm` 檔案，讓使用者能直接將錄音檔下載並永久保存至手機或電腦的原生空間中。

## [2026-02-22] NightWhisper Analysis Upgrades
### Added
- **Audio Upload & Offline Analysis**: Users can now upload existing audio files for snore/talk detection. The app decodes the audio and runs a simulated FFT analysis locally.
- **Skip Initial Time**: Added a new slider to setup, allowing users to ignore the first 0 to 180 minutes of a session. Useful for skipping the time before falling asleep or avoiding irrelevant noise.
- **Clock Time Mapping**: Analysis events and reports now automatically map relative recording offsets back to actual wall-clock time (e.g., 03:45 AM) for better context.
### Changed
- Integration of `OfflineAudioContext` simulation for processing uploaded files without a real-time microphone stream.

新增「音檔上傳與離線辨識」功能，支援讀取現有錄音檔並進行後端分析。同步加入「忽略開頭時間」設定，讓使用者能自由剔除入睡前的空白時段。分析報告現在會根據起始時間自動回推具體的時鐘時間（例如凌晨幾點幾分），讓打呼或夢話的發生時間點一目了然。
## [2026-02-22] NightWhisper M4A & Recording Stability
### Added
- **In-Browser M4A Transcoding**: Implemented high-performance transcoding using `WebCodecs API` and `mp4-muxer`. When downloading on Chrome, the app now decodes WebM and re-encodes to native M4A (AAC) directly in the browser.
- **M4A Upload Support**: The upload analyzer now explicitly supports `.m4a` files.
### Changed
- **Continuous Recording Architecture**: Refactored the recorder to maintain a single continuous session instead of restarting segments. This fixes playability and seek bar issues in concatenated files.
- **Dynamic Format Detection**: The download button now automatically detects the recorded format and provides the correct MIME type and file extension.

針對 Chrome 瀏覽器新增「純前端 M4A 轉碼」功能，利用 WebCodecs API 實現高效能轉碼，讓下載的錄音檔在各平台（尤其是 iPhone）都能完美播放。同時重構錄音架構為「持續不間斷錄製」，徹底解決先前分段合併導致檔案毀損或無法拉動進度條的問題。現在上傳辨識也已全面支援 M4A 格式。
## [2026-02-24] NightWhisper v2.5.1 — Android SDK 35 & Compatibility Fix
### Fixed
- **SDK 35 Upgrade**: Lifted `compileSdk` and `targetSdk` to 35 to resolve compilation errors in `SystemBars.java` (Android 15 constants).
- **Build Tool Parity**: Upgraded Gradle to 8.10.2 and AGP to 8.7.2 to ensure full compatibility with Java 21 environments.
- **Icon Resource Found**: Fixed a bug where adaptive icons were referencing background resources in the wrong directory (`mipmap` vs `drawable`).
- **Resource Completeness**: Added missing `colors.xml` to prevent theme-related build failures.

升級 Android 環境至 SDK 35 (Android 15) 以解決套件衝突與常數找不到的問題。同時同步升級 Gradle 與 AGP 版本，確保在 Java 21 環境下能穩定編譯。修正了 App Icon 的路徑引用錯誤並補全了遺失的顏色設定檔。

## [2026-02-25] NightWhisper Analysis & Navigation Upgrades
### Added
- **5-Level Sensitivity Adjustment**: Expanded the sensitivity scale from 3 to 5 levels (Extremely Low to Extremely High) for more granular control over snore and talk detection.
- **Session Selector Dropdown**: Implemented a custom stylized dropdown in the Analysis view to quickly switch between different recording sessions.
- **Interactive Re-analysis**: Added a dedicated panel in the report view to re-analyze existing audio data with new sensitivity settings without re-recording.
### Fixed
- **Navigation Bar Structural Fix**: Resolved a critical issue where the bottom navigation bar buttons for "Report" and "History" were broken due to incorrect HTML tag nesting.
- **Dependency Repair**: Fixed a 404 error for the `mp4-muxer` library by updating the CDN link to the latest stable version (v5.2.2).
- **Audio Decoding Logic**: Improved the re-analysis workflow by implementing asynchronous buffer combination for seamless processing of multi-segment recordings.
- **Fixed Bottom Navigation**: Replaced `absolute` positioning with `fixed` and added CSS `safe-area-inset-bottom` support to ensure the menu stays visible and stable on all mobile devices and iOS Safari.
- **Fixed V-Player 404 Issue**: Updated Vite configuration to use relative base paths (`base: './'`) and corrected the deployment script to push build artifacts to the `v-player-preview` branch of the `jing.git` repository.
- **Improved PDF Tool UI**: Removed the large checkmark icon from the success state of the PDF Flattening view for a cleaner, more premium look.
- **Integrated Google Auth for Note App**: Upgraded the `note` application from a password-based system to Firebase Authentication (Google Login) with an Email whitelist backend check in GAS.
- **Improved Data Integrity**: Implemented single-quote prefixing for all string data written to Google Sheets.
- **Enhanced Load Performance (Note App)**: Implemented LocalStorage caching for notes and background synchronization. Notes are now instantly loaded from the cache for a "click-and-open" experience, with a subtle background update check.
- **Neutral UI Overhaul (Note App)**: Removed all red-colored warnings and highlight styles, replacing them with a more consistent grayscale and premium stone-based color palette.
- **Admin Management for Project Index**: Integrated Firebase Auth and Firestore into the main project index (`index.html`). Admins can now toggle visibility for each project; hidden projects are only visible to the admin and filtered out for public guests.

分析引擎全面升級！內容包含 5 階靈敏度、重新分析面板與導覽列固定定位修復。同步解決了 V-Player 在 GitHub Pages 上的資源載入 (404) 錯誤，並將 `note` 筆記應用升級為 Firebase Google 登入驗證。此外，為「專案索引」首頁整合了 Firebase 管理機制，允許管理員隱藏特定專案。最後，應要求優化了 PDF 工具處理完成後的介面質感。
