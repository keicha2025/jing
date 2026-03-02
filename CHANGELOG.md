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
- **Drag-and-Drop Sorting & Batch Saving**: Implemented native-feeling drag-and-drop sorting using `SortableJS` for the project index. Added a "Batch Save" mechanism with a floating Stone-styled button that appears only when changes (order or visibility) are pending, reducing database interaction and improving UX.

分析引擎全面升級！內容包含 5 階靈敏度、重新分析面板與導覽列固定定位修復。同步解決了 V-Player 在 GitHub Pages 上的資源載入 (404) 錯誤，並將 `note` 筆記應用升級為 Firebase Google 登入驗證。此外，為「專案索引」首頁整合了 Firebase 管理機制，支援直覺的拖拉排序與隱藏功能，並採用批次儲存優化體驗。最後，應要求優化了 PDF 工具處理完成後的介面質感。

## [2026-02-27] Minimalist Email Studio Migration & Integration
### Added
- Migrated "Minimalist Email Studio" to Firebase Hosting (web.app).
- Integrated "Minimalist Email Studio" into the main project portal (`index.html`).
- Added Google Sheets synchronization to the GAS backend for tracking sent emails.
- Enhanced the GAS script with `doPost` to support cross-domain fetch requests from the web site.
- Automated the deployment process for the `mail` project in `full_deploy.sh`.


## [2026-02-28] Email Studio: Gmail API & Header Encoding Fix
### Added
- Migrated "Email Studio" to direct **Gmail API Integration** to resolve CORS limitations.
- Preserved historical logging by asynchronously flushing to the original Google Sheet backend.
- Automatically fetches and displays all user **Gmail Aliases** via the `settings.sendAs` endpoint.
### Fixed
- **RFC 2047 Header Encoding**: Fixed a critical bug where the email subject and sender's name would appear as Mojibake (corrupted encoding) when containing non-ASCII characters (e.g., Chinese).
- **CORS Failure Fix**: Resolved the `Failed to fetch` error by migrating from GAS Web App calls to direct Google REST API calls.
- **Improved UI Guidance**: Added clear visual indicators and re-authorization prompts for when the OAuth Access Token is missing or expired.

**Affected files:** `mail/index.html`, `mail/code.gs`, `full_deploy.sh`

將「Email Studio」郵件卡片工具全面切換至 Gmail API 寄件技術以解決跨網域 (CORS) 問題。針對中文主旨與寄件人名稱，實作了符合 RFC 2047 的 MIME 編碼機制，徹底收復亂碼錯誤。同時優化了別名抓取與授權失效時的重登引導。

## [Design System Update] - 2026-02-28T15:46:46Z
### Added
- [DESIGN_LANGUAGE.md](file:///Users/jing/Downloads/jing/DESIGN_LANGUAGE.md): A comprehensive documentation of the project's design tokens, grid layout, and motion principles.
- Included specifications for typography (Inter/Noto Sans TC), color palette (Stone series), and glassmorphism effects.

*新增了設計語言手冊專用的 Markdown 檔案，將 UI 規範參數化。*

## [2026-03-01] Jing Lab Portal Recovery & Favicon Fix
### Added
- Added `<link rel="icon">` to `index.html` referencing `jing-lab-appicon.png` to fix missing website icon.
- Added explicit support for generic favicons in the portal page.

### Fixed
- Recovered the main portal page (Project Index) which was showing a 404 error on `jing-lab.web.app`.
- Ensured consistent deployment by using `full_deploy.sh` to correctly include the root `index.html` in the `dist_release` directory.

### Changed
- Refined the "Full Deploy" process to consistently maintain the entry point of the entire workspace.

**Affected files:** `index.html`, `CHANGELOG.md`, `dist_release/`

修復了 Jing Lab 首頁 (jing-lab.web.app) 顯示 404 的問題，並補上網站圖標 (Favicon) 宣告。透過執行完整部署腳本重新同步所有專案與入口頁面。

## [2026-03-01] Favicon Compatibility Enhancement
### Added
- Added `.ico` format favicon reference in `index.html` to improve cross-browser compatibility across all index pages.
- Included `jing-lab-appicon.ico` in the static assets copy list within `full_deploy.sh` for Firebase hosting deployment.

**Affected files:** `index.html`, `full_deploy.sh`

為了確保專案索引頁面在不同網域及瀏覽器環境下皆能正確顯示圖標，新增了 `.ico` 格式的 Favicon 引用與發布流程。

## [2026-03-02] LoopDashcam: High-Performance Recording & UI Interaction
### Added
- **Approach A Recording Infrastructure**: Created `VideoEncoder.kt` using `MediaCodec` and `LoopManager.kt` for FIFO storage management (5GB limit).
- **Camera Switching**: Implemented multi-lens support (Back/Front/Wide) in `CameraManagerHelper.kt`.
- **Interactive UI**: Bound hardware buttons in `MainActivity.kt` for recording start/stop (with timer and shutter animation), GPS speed toggling, and camera switching.
- **Resolution Control**: Added `btnQuality` UI placeholders in `activity_main.xml` for future resolution switching.
### Fixed
- **Overlay Orientation**: Flipped OpenGL texture coordinates in `CameraGLRenderer.kt` to fix upside-down timestamp and speed overlays.
- **Permission Flow**: Streamlined the multi-permission request (Camera, Audio, Location) at app startup.

**Affected files:** `LoopDashcam/app/src/main/java/com/jing/loopdashcam/` (MainActivity, CameraGLRenderer, CameraManagerHelper, VideoEncoder, LoopManager), `activity_main.xml`, `CHANGELOG.md`

實作「方案 A」高效能錄影架構，包含 MediaCodec 硬體編碼器與自動循環刪補空間管理 (LoopManager)。修正了 OpenGL 浮水印上下顛倒的問題，並全面啟用介面互動功能：現在點擊紅色快門會觸發錄影狀態切換與計時器，且支援主鏡頭與前鏡頭的即時切換。新增了儲存空間狀態顯示與解析度選單預留位。

## [2026-03-02] Portal Recovery & Deployment Architecture Fix
### Fixed
- **Root cause of portal overwrite**: Removed the `hosting` block from `strategy-box/firebase.json` which was deploying `dist/index.html` (JING Finance) to the root path `/`, overwriting the Project Index portal page.
- **Portal blank screen**: Restored `jing-lab.web.app` by executing `full_deploy.sh` which correctly deploys the root `index.html` from the project root to `dist_release/`.
- **Sub-project 404 errors**: All sub-projects (pdf-tool, preview, v-player-preview, travel-planner, nightwhisper, note, mail) were missing due to the overwrite. Full deploy restores all of them.
- **GitHub Pages pdf-tool redirect chain**: `keicha2025.github.io/jing/pdf-tool/` redirects to `jing-lab.web.app/pdf-tool/` which was returning 404 due to the overwrite.

### Changed
- **Deployment isolation**: `strategy-box/firebase.json` no longer contains a `hosting` block, preventing future accidental overwrites of the entire site when deploying only Cloud Functions or Firestore rules from the `strategy-box` directory.

**Affected files:** `strategy-box/firebase.json`, `CHANGELOG.md`, `dist_release/`

修復了 strategy-box 部署時覆蓋整站入口頁面的根本原因（移除了該子目錄中的 hosting 設定），並透過完整部署恢復了入口頁面與所有子工具。GitHub Pages 上的 pdf-tool 重定向鏈也因此修復。

## [2026-03-02] PDF Flattener: True Rasterization Engine
### Fixed
- **Font rasterization failure**: The previous Ghostscript `pdfwrite` device only restructured PDFs without actually rasterizing text/fonts, causing font styles to break when the PDF didn't embed all fonts.
- **Rewrote flatten endpoint** in `backend/main.py` to use **PyMuPDF (fitz)** for true pixel-level rasterization:
  1. Each page is rendered to a high-DPI PNG image (respects quality/DPI settings)
  2. Images are reassembled into a clean PDF with proper compression
- This guarantees all text, vectors, and fonts are converted to pixels — zero dependency on font embedding.

### Technical Details
- Engine changed from Ghostscript `pdfwrite` → PyMuPDF `page.get_pixmap()` + `page.insert_image()`
- DPI presets: Low (72), Medium (150), High/Ultra (300-600)
- Output uses `garbage=4, deflate=True, deflate_images=True` for optimal file size
- Redeployed to Cloud Run as revision `pdf-flattener-00006-7bh`

**Affected files:** `pdf-tool/backend/main.py`

修復了 PDF 扁平化工具無法真正點陣化字體的問題。原先使用 Ghostscript pdfwrite 僅重構 PDF 結構，未將文字轉為圖片，導致未嵌入字體的樣式會跑掉。改用 PyMuPDF 逐頁渲染為高解析度圖片後重組，確保所有文字與向量完全轉為像素。
