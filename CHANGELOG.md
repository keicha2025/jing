# Changelog

## [2026-03-08] Offline Web First & "Invisible Assistant"
### Added
- **"Invisible Assistant" Strategy (v18)**: Implemented a strict **Cache-First + Background Update (Stale-While-Revalidate)** strategy for all GET requests, including navigation. This ensures the app launches instantly from local storage, even without internet.
- **Aggressive Prefetching**: Expanded pre-caching to include Firebase SDKs and Google Fonts in the install phase, ensuring total offline reliability for the "Offline Web First" experience.
- **Improved Takeover**: Added `self.clients.claim()` and `self.skipWaiting()` to ensure the new "Invisible Assistant" takes control of all pages immediately after installation.

**中文說明：實作「隱形助手」策略（SW v18），改為預設從本地硬碟讀取資源（秒開），並在背景自動更新，達成真正的離線 Web 優先體驗。**

## [2026-03-08] PWA Identity Isolation & Multi-App Fix
### Fixed
- **PWA Identity Isolation**: Implemented unique machine-readable IDs (`com.jinglab.portal` and `com.jinglab.note`) to resolve installation conflicts between the root portal and sub-apps.
- **Scope Refining**: Re-aligned Service Worker scopes and Manifest start URLs back to `/note` to match Firebase clean URLs while ensuring independent app behavior.
- **Note App Enhancements**: Upgraded Note Service Worker to v17 with improved offline fallback and added `launch_handler` for better multi-window handling on Android.

**中文說明：實作 PWA 身份隔離（嚴格 ID 模式），解決安裝衝突，並升級 Note SW v17 強化離線穩定性。**

## [2026-03-08] Note App PWA Visibility & Offline Fix (Second Attempt)
### Fixed
- **Service Worker Scope Upgrade**: Identified a conflict between Firebase `trailingSlash: false` and default SW directory scoping. Added `Service-Worker-Allowed: /` header in `firebase.json` and explicitly set `scope: '/note'` during registration. This allows the SW at `/note/sw.js` to control the root extensionless URL `/note`, resolving both the "Offline" error and the "Browser Top Bar" issue.
- **Improved Caching**: Service Worker (v16) now robustly handles both `/note` and `/note/` as equivalent entry points.
- **Android & Offline Optimization**: Added "New Note" shortcut, Android Splash Screen configuration, and 3s Auth timeout fallback.

**中文摘要：發現了 Firebase 自動移除斜線的路徑與 Service Worker 預設目錄限制的衝突。現已透過伺服器 Header 授權與程式碼 Scope 指定，讓 `/note` 網址能被正確納入快取範疇，徹底解決「離線無法開啟」與「頂部出現工具列」的問題。**


## [2026-03-08] Documentation & README Overhaul
### Added
- Created/Updated comprehensive `README.md` files for the root portal and all 10 sub-projects.
- Standardized documentation structure: Title, Features, Tech Stack, and Usage Guide.
- Replaced default framework boilerplates (Next.js, Vue/Vite) with actual project descriptions.
- Documented deployment workflows and sub-directory routing constraints.
- Added project-specific links to the root README for easier navigation within the repository.

**中文摘要：完成了全站與 10 個子專案的 README 文檔撰寫工作。將原本的框架模板替換為實際的技術介紹與開發指南，並在根目錄建立導航中心，提升專案的專業感與維護性。**


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
- Added "total investment idle funds" planning section on Dashboard.
- Implemented monthly duration calculation for idle funds.
- Persistent data storage for new idle funds fields in Firestore.
- Added "Smart Sort" button in Inventory to sort by Taiwan Stocks > US Stocks > Fund > Others.
- **Fixed deployment pipeline**: Updated `full_deploy.sh` to cleanly rebuild all projects and ensure `strategy-box` is correctly mapped to `/finance/`.
- **Cache Invalidation**: Bumped root Service Worker to `v6` to force client-side updates.

**中文說明：修復部署流程，確保 Finance 工具最新功能正確上線，並更新 Service Worker 以強制重新整理快取。**
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

## [2026-03-02] Feat: 案時記 (caselog) Initial MVP
### Added
- Created `caselog` module using Next.js (Static Export, TailwindCSS).
- Integrated Firebase Authentication (Google Sign-In) to establish user sessions.
- Linked to the newly created Firestore database `case-log` under the project `gen-lang-client-0428297574`.
- Handled UI translation from the original React `demo.bak` prototype to `page.tsx` using `react-firebase-hooks/firestore`.
- Transitioned icon system to Google Material Symbols Outlined, satisfying design constraints.
- Integrated `caselog` build flow into the global `full_deploy.sh` and corresponding rewrite rules in `firebase.json` for seamless deployment.

*此更新建立了 caselog (案時記) 專案的打底基礎，包含與 Firestore 資料庫的串接、Google登入功能以及符合全域工作區架構的部署設定。*

## [2026-03-02] - App Expansion & Multi-page PWA
### Added
- Multi-page routing using Next.js App Router (Dashboard, Finance, Stats, Settings).
- Global Timer state management with TimerContext.
- GlobalTimerBar component for persistent tracking across views.
- Support for manual time logging and initial task duration.
- Firestore security rules for "case-log" database.
### Fixed
- Static export build error for dynamic routes by switching to query parameters.
- Asset path resolution issues with basePath configuration.

## [2026-03-02T11:45:00Z] Caselog: Project Management System & Routing Fix

### Summary
Enhanced the "Caselog" application with a dedicated project management page, improved navigation for mobile usability, and a robust routing configuration for Firebase Hosting.

### Technical Details
- **Project Management Page (`src/app/projects/page.tsx`)**: Created a new view for listing all projects with status-based filtering (All/Ongoing/Completed). Includes a simplified `AddProjectModal` for quick entry.
- **Bottom Navigation (`src/components/BottomNav.tsx`)**: Added a sticky navigation bar with 4 tabs (Home, Timer, Projects, Settings) using `framer-motion` for smooth interactions. Optimized for "thumb-zone" mobile usage.
- **Project Detail Logic Overhaul**:
    - **Edit Modal**: Implemented `EditProjectModal` in `project/page.tsx` to handle project metadata and a new **Payment Records** system (collection of amounts and dates).
    - **Priority Override**: Modified rate logic to ensure project-specific target hourly rates override the global user setting.
    - **Payment Status**: Changed project status badges to reflect financial progress (Unpaid, Partial, Full) based on total paid vs. budget.
- **Dashboard Data Binding**: Updated `src/app/page.tsx` to dynamically calculate cumulative workspace stats (Total Budget and Outstanding Receivables) from live Firestore data.
- **Infrastructure Fixes**:
    - **Firebase Routing**: Updated root `firebase.json` with `cleanUrls: true` and explicit rewrites for `/caselog/project`, `/caselog/projects`, etc., to support deep links in Next.js static exports.
    - **Project Card Interaction**: Refactored `ProjectCard.tsx` to use the entire card as a clickable `Link`, added `chevron_right` and `settings` visual cues.

**新增了專案管理頁面與收款紀錄系統，並優化了手機版的底部導覽選單。同步修復了 Firebase 部署後的路由跳轉問題，確保點擊專案卡片與重新整理頁面時能正確顯示內容。**

### Affected Files
- `caselog/src/app/page.tsx`
- `caselog/src/app/projects/page.tsx`
- `caselog/src/app/project/page.tsx`
- `caselog/src/components/ProjectCard.tsx`
- `caselog/src/components/BottomNav.tsx`
- `firebase.json`
- `CHANGELOG.md`

### Potential Side Effects
- Users may need to re-login if the persistent session is interrupted by the layout change, though unlikely with Firebase Auth.
- Existing projects without a `payments` array will default to "Unpaid" status until a record is added.

## [2026-03-02T14:15:00Z] Caselog: Payment Detail Management & Timer Removal

### Summary
Refined the Caselog application by enhancing payment record details, removing the automated timer functionality in favor of manual time entry, and optimizing the number input UI across the app.

### Technical Details
- **Payment Record Enhancements**: 
    - Updated `EditProjectModal` to allow manual entry of **Date** and **Notes (Remarks)** for each payment record.
    - Improved the payment history list display to include these new fields.
- **Timer Functionality Removal**:
    - Removed all automated timer UI components (play/stop buttons) from the project task list.
    - Retired the `GlobalTimerBar` and the `Timer` tab from the bottom navigation.
    - Refactored `LogTimeModal` to focus on manual entry of **Start Time**, **End Time**, and **Remarks**.
- **UI/UX Optimization**:
    - Replaced browser-native number input arrows with custom **+/- steppers** for Project Budget and Target Rate.
    - Implemented `NumberAdjuster` component to standardize amount adjustments with appropriate steps (Budget: 1000, Rate: 100).
    - Reduced amount input widths to prevent UI overflow on mobile screens.
    - Optimized the **Settings** page: Converted the Logout button to a minimalist icon-only design in the top-right corner.
- **Data Binding**: Ensured `SwipeableTask` correctly displays accumulated manual hours and provides a streamlined path for manual logging via a `schedule` icon.

**優化收款紀錄管理，支援手動設定日期與備註，並依需求移除全站計時功能，改為純手動補登工時（含起迄時間與備註）。全站金額輸入框改用自定義 +/- 按鈕並優化寬度，確保介面不溢出且更符合行動端操作。**

### 2026-03-02 14:15 (Caselog UI & Functionality Refinement)
- **Toast Notification System**: Replaced browser-native alerts with a custom, fluid toast system using Framer Motion and project-native colors.
  - *實作全域通知系統，使用 Framer Motion 打造符合風格的動態提示。*
- **Enhanced Payment Management**: Moved payment history and addition directly to the project detail page. Each payment now supports manual date and remarks.
  - *將收款紀錄移至專案詳情頁直覺管理，支援自訂日期與備註。*
- **Project Duration & Period**: Added start/end date fields for projects, displayed elegantly in the project header.
  - *新增專案起迄日期設定，並於標題處並列顯示。*
- **Standardized Button UI**: Replaced icon-only circular buttons with horizontal, labeled "Save" bars for better clarity and touch safety.
  - *全面將圓形圖示按鈕改為橫向「儲存」長條按鈕，提升操作直覺性。*
- **Manual Time Entry Optimization**: Redesigned manual logging with separate hours/minutes fields and start/end time options.
  - *優化手動時數輸入，支援時/分分開輸入並自動轉換。*
- **Settings Page Polish**: Redesigned the Logout button as an icon and optimized the target hourly rate control with custom +/- steppers.
  - *設定頁面優化，包含圖示化登出按鈕與自訂義數字調整器。*

Affected files: `src/app/project/page.tsx`, `src/app/projects/page.tsx`, `src/app/settings/page.tsx`, `src/context/ToastContext.tsx`, `src/app/layout.tsx`.


## [2026-03-02T23:05:00Z] PDF Tool: White Screen Fix & Asset Path Correction

### Summary
Resolved a critical issue where the PDF Tool was displaying a blank white screen due to incorrect asset path resolution when deployed to a sub-directory.

### Technical Details
- **Vite Base Path Update**: Changed `base` from `./` to `/pdf-tool/` in `pdf-tool/vite.config.js`. This ensures that all generated JS and CSS assets are correctly referenced from `https://jing-lab.web.app/pdf-tool/assets/` rather than the root directory.
- **Routing Compatibility**: The previous relative path `./assets/` was being incorrectly resolved to the root `/assets/` by some browsers/crawlers due to Firebase Hosting's `trailingSlash: false` configuration, causing a collision with the portal's assets.

### Affected Files
- `pdf-tool/vite.config.js`
- `CHANGELOG.md`

**修復了 PDF 工具在部署後出現白屏的問題。透過將 Vite 的 base 路徑從相對路徑改為絕對子路徑 `/pdf-tool/`，確保瀏覽器能正確抓取子目錄內的資源檔案，避開與根目錄資源的衝突。**


## [2026-03-03] Caselog UI Polishing & ID Simplification
### Added
- **URL ID Simplification**: Implemented a "Short ID" system where project URLs use only the last 4 alphanumeric characters (e.g., `?id=XXXX`) for a cleaner, more readable link.
- **Auto-Mapping Logic**: Added a backend matching mechanism in `ProjectDetailContent` that automatically maps the 4-character short ID from the URL back to the original full Firestore document ID.
- **Delete Functionality Integration**: Added "Delete Task" text button inside the `EditTaskModal` and "Delete Log" button inside the `EditLogForm` for a more consolidated editing workflow.
### Changed
- **Permanent Desktop Icons**: Replaced hover-based editing triggers with permanently visible "Edit" icons on desktop for tasks and log entries, improving discoverability.
- **Button Styling**: Adjusted "Cancel" and "Confirm/Update" buttons in modals and forms to have equal width (`flex-1`) for better visual balance.
- **Navigation Links**: Updated `ProjectCard` to automatically truncate project IDs in navigation links.
- **Excel Export Functionality**: Implemented a comprehensive data export feature in the Settings page. This allows users to download all their project logs as an Excel (XLSX) file, with each project automatically organized into its own separate spreadsheet tab for better clarity and organization.
- **Improved Export UX**: Added loading indicators and status toasts to provide immediate feedback during the data retrieval and file generation process.
- **Reporting & Documentation**: Created a new `reports/` directory and generated a comprehensive `development_status.md` to track project metrics, pending tasks, and optimization plans.

實作「匯出所有紀錄」功能。為了滿足使用者「每個專案一個分頁」的需求，系統現在會將所有工時紀錄彙整並產生為 Excel (.xlsx) 檔案，每個案子獨立為一個工作表。同步建立 `reports/` 資料夾並撰寫階段性開發報告。

## [2026-03-03] Caselog Stability & UI Refinement
### Added
- **Offline Support (PWA)**: Implemented full offline capabilities using Firestore persistence and PWA manifest. Users can now log data without connectivity; changes sync automatically upon reconnection.
- **Excel Naming Protection**: Enhanced the Excel export engine to automatically sanitize project names for sheet tabs (filtering `/ \ ? * : [ ]`), ensuring compatibility and handling duplicate project names with suffixes.
- **Minimal Delete Interface**: Moved "Delete Project" and "Delete Task" actions into dedicated editing views as minimal text buttons to prevent accidental removal while keeping the UI clean.

### Improved
- **Data Synchronization Accuracy**: Integrated an automatic consistency check in the Project Detail view that silently repairs discrepancies between aggregated project totals and individual task logs.
- **Desktop UX Optimization**: "Edit" buttons are now permanently visible on desktop devices, resolving discoverability issues previously caused by hover-only triggers.
- **Button Layout Parity**: Standardized all modal action buttons (Cancel/Save) to equal-width layouts (`flex-1`) for a more balanced and premium feel.
- **Status Displays**: Initialized actual hourly rate display to show "-" when investment time is zero, preventing misleading zero-value calculations.

### Fixed
- **Homepage Filtering**: Corrected the project overview on the dashboard to strictly filter for "Ongoing" status, hiding completed archives by default.

完成「穩定性三箭」優化：包含全離線支援、數據自動同步、以及 Excel 匯出命名保護。同時磨合全站 UI 細節，確保電腦版操作直覺且按鈕佈局美觀。

## [2026-03-03] - Finance Deployment & SW Versioning
### Added
- Added "total investment idle funds" planning section on Dashboard.
- Implemented monthly duration calculation for idle funds.
- Persistent data storage for new idle funds fields in Firestore.
- Added "Smart Sort" button in Inventory to sort by Taiwan Stocks > US Stocks > Fund > Others.
- **Fixed deployment pipeline**: Updated `full_deploy.sh` to cleanly rebuild all projects and ensure `strategy-box` is correctly mapped to `/finance/`.
- **Cache Invalidation**: Bumped root Service Worker to `v6` to force client-side updates.

**中文說明：修復部署流程，確保 Finance 工具最新功能正確上線，並更新 Service Worker 以強制重新整理快取。**
## [2026-03-03] - Finance Refinement & Multi-Currency Planning
### Added
- **Multi-Currency Idle Funds**: Upgraded the "Total Idle Funds Planning" to support TWD, USD, and JPY independently. Each currency now has its own amount, start month, and end month.
- **Smart Sort**: Implemented a "Smart Sort" button in the `MonthlyConfig` page that automatically reorders items by category: Taiwan Stocks > US Stocks > Fund > Others.
- **New Input Components**: Used custom `type="month"` inputs for planning periods with a standardized premium look.

### Changed
- **Balanced Dashboard**: Removed redundant "Total Investment Pool" and "Monthly Fixed Allocation Plan" sections to reduce clutter.
- **Target Rate Alignment**: All progress tracking in the Dashboard now calculates against the global `financialGoal` instead of the legacy investment pool.
- **UI/UX Optimization**: Replaced all native `alert()` dialogs with a custom premium toast notification system.
- **Input Interaction**: Month pickers are now clickable anywhere within the component.
- **Dynamic idle Funds**: Currencies other than TWD are now hidden by default and only appear when added or containing data.
- **Amount Formatting**: Implemented intuitive "萬" (ten thousand) formatting for large currency amounts (e.g., 150000 -> 15萬).
- **UI Polishing**: Updated planned monthly investment amounts to display in white (was green) as per design feedback. Updated sidebar labels for clearer goal tracking.

### Fixed
- **Historical Trend Chart**: Resolved the "no data" issue by improving category mapping and robustness of the data processing logic.
- **Data Loading**: Fixed a bug where data might not load if the auth state wasn't cached, by adding `auth.currentUser` to the `useEffect` dependency.
- **Typo Fix**: Corrected function naming from `handleUpdateGoal` to `handleSaveGoal` in the component tree.
- **Data Consistency**: Updated TypeScript interfaces (`UserSettings`, `MonthlyConfig`) to reflect the new planning structure and ensured clean data flow between Dashboard and Config pages.
- **Deployment Versioning**: Bumped root Service Worker to `v8` to ensure latest changes are served.

**中文說明：全面優化 Finance Dashboard UI/UX，包含自定義通知系統、動態幣別顯示及金額單位轉化（萬），並修復歷史趨勢圖表不顯示的問題。**

- **PWA Identity Isolation**: Implemented unique machine-readable IDs (`com.jinglab.portal` and `com.jinglab.note`) to resolve installation conflicts between the root portal and sub-apps.
- **Scope Refining**: Re-aligned Service Worker scopes and Manifest start URLs to match Firebase clean URLs while ensuring independent app behavior.
- **Note App Enhancements**: Upgraded Note Service Worker to v17 with improved offline fallback and added `launch_handler` for better multi-window handling on Android.

**中文說明：實作 PWA 身份隔離（嚴格 ID 模式），解決安裝衝突，並升級 Note SW v17 強化離線穩定性。**

## [v1.0.12] - 2026-03-08
### Added# Final UI/UX Polish & Custom Component Integration
- **Custom Modals**: Replaced all native browser `confirm()` dialogs with high-quality, custom glassmorphism confirmation modals for a premium feel.
- **Redundant Section Removal**: Removed the "Financial Goal Achievement Rate" block to declutter the user interface and focus on core metrics.
- **Improved Contrast**: Updated Recharts Tooltip styles to a high-contrast white background with dark text, ensuring perfect readability in the dark theme.
- **Smart Amount Formatting**: Implemented dynamic conversion for amounts over 10,000 (e.g., `15000` -> `1.5 萬`), making large numbers easier to parse at a glance.
- **Bylined Date Interaction**: month inputs now trigger the picker when clicked anywhere on the component wrapper, improving touch/click accessibility.
- **Color Standardization**: Fully removed the red color scheme for deletion actions, replacing it with the project's brand palette (Muted Gray/Indigo) to avoid visual stress.
- **Deployment & Caching**: Bumped root Service Worker to `v10` and implemented hard cleanup logic to ensure all clients receive the latest UI updates.

**中文說明：全面提升介面質感，導入自定義玻璃擬態對話框替換原生彈窗，移除冗餘區塊並優化大額數字顯示（萬），確保全站色彩計畫統一。**

---

## [v3.1.2] – 2026-03-03T20:35:00+08:00

### Bug Fix & UI Contrast Improvements

#### Project Rename
- Renamed the Finance sub-project directory from `strategy-box/` to `finance/` to match its purpose.
- Updated `full_deploy.sh` to reference the new `finance/` directory for build and asset copy steps.

#### Numerical Input Bug Fix (MonthlyConfig.tsx)
- **Root Cause**: `type="number"` inputs immediately convert raw string input to `Number()` on change, causing floating-point artifacts mid-typing (e.g., `5000` becoming `4998`).
- **Fix**: Replaced `type="number"` with `type="text" inputMode="numeric"`. Amount values are now stored as strings while typing. `parseFloat()` + `Math.round()` is only committed on `onBlur`, preventing any auto-adjustment or midtype corruption.
- Introduced a parallel `amountInputs: string[]` state array to track raw typed values independently of the `items` numerical state.

#### btn-secondary Visibility (index.css)
- Added full `.btn-secondary` CSS class to `index.css`.
- Buttons like "同步報價" and "儲存草稿" now display with `color: var(--text-main)` (white) and a subtle glass border, making them clearly legible on the dark background.

#### MonthlyConfig Full Rewrite
- Replaced legacy `alert()` calls with a custom toast notification system.
- Improved table header styling — column labels are rendered with `rgba(255,255,255,0.45)` for subtle hierarchy.
- Smart sort now preserves the `amountInputs` string array in sync with sorted `items`.
- Delete (Trash2) icon uses `rgba(255,255,255,0.3)` with hover brighten — no red colors.

#### Service Worker
- Bumped cache version from `jing-lab-v10` to `jing-lab-v11`.

**中文說明：修復每月配置金額自動跳動 Bug，改用字串暫存策略；補全 btn-secondary 樣式；更新 full_deploy.sh 路徑；Service Worker 升至 v11。**

---

## [v3.1.3] – 2026-03-03T21:23:00+08:00

### Sub-app Isolation & Cache Isolation Fix

#### Service Worker Root Exclusion (sw.js)
- Added `excludedPrefixes` list to the root `sw.js` fetch handler.
- Sub-app paths (`/preview/`, `/pdf-tool/`, `/v-player-preview/`, `/travel-planner/`, `/finance/`, `/caselog/`) are now **excluded from root SW interception**.
- Each sub-app's own service worker (via VitePWA plugin) will handle its own caching.
- This resolves the "blank page after deploy" issue caused by the root SW serving stale sub-app assets.
- Bumped cache version: `jing-lab-v11` → `jing-lab-v12` to force-evict all existing incorrect caches.

#### Firebase Hosting Cache Headers (firebase.json)
- Added `Cache-Control: no-cache, no-store, must-revalidate` for all `**/*.html` via hosting `headers` config.
- Ensures all HTML entry points are always fetched fresh, preventing CDN-level caching of stale HTML shells.

#### Vite base Path Normalization
- Fixed all sub-projects that had `base: './'` (relative path), which caused asset reference breakage after sub-directory hosting reload.
- Changed to absolute paths:
  - `preview/vite.config.js`: `'./'` → `'/preview/'` (also added `scope: '/preview/'` to PWA manifest)
  - `v-player-preview/vite.config.js`: `'./'` → `'/v-player-preview/'` (also added `scope: '/v-player-preview/'` to PWA manifest)
  - `travel-planner/frontend/vite.config.js`: `'./'` → `'/travel-planner/'`
  - `pdf-tool/vite.config.js`: `'./'` → `'/pdf-tool/'`

#### preview/index.html
- Removed hardcoded local dev paths (`/jing/preview/favicon.svg`) that were invalid in production.
- Changed all icon hrefs to relative `./` paths for Vite to resolve correctly at build time.

**中文說明：根目錄 Service Worker 不再攔截子應用路徑，解決「部署後空白」問題；所有子專案 vite.config.js 的 base 路徑改為絕對路徑，確保重新整理後資源路徑正確；SW 升至 v12 強制清除舊快取。**

---

## [v3.1.4] – 2026-03-03T21:36:00+08:00

### SW Exclusion Expansion + Full-site Health Verification

#### Service Worker (sw.js)
- Added `/note/`, `/nightwhisper/`, `/mail/` to `excludedPrefixes` list in root SW fetch handler.
- These static sub-apps were previously subject to root SW interception; now fully excluded.
- Bumped cache version: `jing-lab-v12` → `jing-lab-v13`.

#### Full-site Verification (All 10 Sub-projects)
All sub-projects verified healthy — HTTP 200, correct HTML title, no blank pages:

| URL | Title | Status |
|-----|-------|--------|
| `/` | Jing Lab - Project Portal | ✅ |
| `/finance/` | JING Finance | ✅ |
| `/pdf-tool/` | FlatModern - PDF Studio | ✅ |
| `/preview/` | 個人音檔播放器 | ✅ |
| `/v-player-preview/` | V-Player Web App | ✅ |
| `/caselog/` | 案時記 / caselog | ✅ |
| `/travel-planner/` | Travel Planner | ✅ |
| `/note/` | note | ✅ |
| `/nightwhisper/` | NightWhisper 夜語 | ✅ |
| `/mail/` | Minimalist Email Studio | ✅ |

**中文說明：補全靜態子應用（note/nightwhisper/mail）的 SW 排除規則，升至 v13；全站 10 個子專案驗證全數正常。**

---

## [v3.1.5] – 2026-03-04T00:22:00+08:00

### Critical Fix: Firebase Hosting Rewrites Missing for Static Sub-apps

#### Root Cause
`firebase.json` had a catch-all rewrite `"source": "/**"` → `/index.html` at the bottom of the rewrites array.
Sub-apps `/note/`, `/mail/`, and `/nightwhisper/` were **not listed** in rewrites before this catch-all,
so every request to these paths was silently redirected to the root portal page instead of their own `index.html`.

#### Fix — `firebase.json`
- Added explicit rewrite rules for all three static sub-apps:
  - `/note/**` → `/note/index.html`
  - `/mail/**` → `/mail/index.html`
  - `/nightwhisper/**` → `/nightwhisper/index.html`
- All rules are placed **before** the catch-all `/**` rule.
- Also corrected the Firestore rules path: `strategy-box/firestore.rules` → `finance/firestore.rules` (post-rename fix).

#### Fix — `note/sw.js` (v2 → v3)
- Upgraded `CACHE_NAME` from `note-app-v2` to `note-app-v3` to force-clear stale caches that may have cached incorrect HTML responses for `config.js`.
- Changed ASSETS list from relative paths (`./`) to absolute paths (`/note/config.js`, etc.) for stable resolution.
- Added `self.clients.claim()` in `activate` handler so the new SW takes over immediately without requiring a page reload.
- Changed `cache.addAll()` to `Promise.allSettled()` so a single failed asset doesn't abort the entire SW installation.
- Tightened fetch handler to only cache responses where `response.type === 'basic'` (prevents caching of CDN cross-origin opaque responses).

#### Full Site Verification (Post-fix)
All 10 sub-projects confirmed healthy — HTTP 200, correct titles, no wrong redirects:

| App | Title | HTTP |
|-----|-------|------|
| `/` | Jing Lab - Project Portal | ✅ 200 |
| `/finance/` | JING Finance | ✅ 200 |
| `/pdf-tool/` | FlatModern - PDF Studio | ✅ 200 |
| `/preview/` | 個人音檔播放器 | ✅ 200 |
| `/v-player-preview/` | V-Player Web App | ✅ 200 |
| `/caselog/` | 案時記 / caselog | ✅ 200 |
| `/travel-planner/` | Travel Planner | ✅ 200 |
| `/note/` | note | ✅ 200 |
| `/nightwhisper/` | NightWhisper 夜語 | ✅ 200 |
| `/mail/` | Minimalist Email Studio | ✅ 200 |

**中文說明：根本原因是 firebase.json 的萬用 rewrite 攔截了 note/mail/nightwhisper，補上各自的 rewrite 規則後全站 10 個子專案全數正常。**

---

## [v3.1.6] – 2026-03-04T07:25:00+08:00

### Custom Component Refactoring & Branding Consistency

#### Dashboard & AI Analyst
- **ConfirmModal Integration**: Replaced synchronization `window.confirm()` calls in `Dashboard.tsx` and `AIAnalyst.tsx` with a new, asynchronous, Promise-based `ConfirmModal` component. 
- Designed the modal with a high-transparency glassmorphism backdrop (`rgba(0,0,0,0.85)`) and a `blur(10px)` filter, aligning with the project's premium dark theme.
- Removed all hardware/browser-native dialogs from key user flows (e.g., deleting goals, switching AI tools).

#### Custom Dropdown Component
- Created a standalone `Dropdown` component (`src/components/Dropdown.tsx`) to replace native `<select>` tags.
- Implemented smooth rotation animations for toggle arrows and dedicated focus states for options.
- Applied the custom `Dropdown` to:
  - `AIAnalyst.tsx`: AI tool selection.
  - `MonthlyConfig.tsx`: Category and Currency selections in the investment table.

#### UI Standardization (index.css)
- Extracted inline styles for buttons into reusable CSS classes to improve maintainability and visual parity:
  - `.btn-accent-ghost`: For primary non-intrusive actions like 'Smart Sort'.
  - `.btn-ghost`: For secondary actions like 'Copy MD'.
  - `.icon-btn`: Standardized icon interaction class with hover state support.
- Standardized all 'Delete' (Trash2) button interactions — removed red warning colors in favor of the brand's muted grayscale/indigo palette.

#### MonthlyConfig Table Refinement
- Enhanced the dynamic table in `MonthlyConfig.tsx` by replacing all native row selectors with the new `Dropdown` component.
- Switched the 'Remove Item' trigger to the new `ConfirmModal`, providing a consistent "Confirm before Delete" experience across all sub-apps.

#### Service Worker
- Bumped cache version: `jing-lab-v13` → `jing-lab-v14` to ensure the new components and styles are applied.

**中文說明：全面汰換 Finance 專案中的原生 confirm 與 select 組件，導入自定義玻璃擬態 Modal 與 Dropdown，並將按鈕樣式標準化至 index.css，提升整體品牌視覺一致性。**

### [v3.1.7] - 2026-03-04
#### Responsive Design Audit & Mobile UX Optimization (Finance)
- **Fluid Typography**: Implemented `clamp()` based font sizing for `h1` and `h2` to ensure titles scale gracefully on mobile.
- **Global Layout Tokens**: Introduced responsive CSS variables (`--page-padding`, `--card-padding`) to optimize content density on small viewports.
- **Navbar Refactoring**: Added logic to hide navigation labels and show icons only on screens < 480px, preventing overlap with the branding logo.
- **Card-based Transformation (Monthly Config)**: Refactored the investment grid into a vertical card-style layout for mobile, eliminating horizontal scrolling and improving touch accessibility.
- **Grid Optimization (Dashboard)**: Fixed the 6-column "Idle Funds Planning" grid to wrap into a 2-column stacked layout on mobile.
- **Fluid Inputs**: Adjusted input field padding and icon placement for a more thumb-friendly experience on touchscreens.

**中文說明：針對 Finance 專案進行極窄螢幕（< 400px）響應式優化。導入流體字體與全局間距變數。將配置表格在行動端轉化為卡片式佈局，並優化導航列與閒置資金規劃的網格結構，解決破版與重疊問題。**


### v3.1.8 (2026-03-04) - Enhanced Responsive Fix (V3)
- **Technical Details**: 
    - Implemented high-specificity ID selectors (`#analyst-page`) to override stubborn global styles.
    - Forced `display: flex !important` and `flex-direction: column !important` on `analyst-grid` for mobile view.
    - Added `!important` to `Navbar` nav-labels to hide them on narrow screens.
    - Refactored `icon-selector` with `grid !important` to prevent horizontal overflow in modals.
    - Added visible version tag `VER: 3.1.8-RWD-V3` for deployment verification.
- **Affected Files**: `AIAnalyst.tsx`, `Navbar.tsx`
- **中文摘要**: 執行 V3 強制修復，使用 ID 權重與 !important 解決 RWD 佈局被覆蓋的問題，並優化彈窗圖示選擇器，確保在 iPhone SE (320px) 等窄螢幕環境下完全不溢出且操作順暢。

### v3.1.9 (2026-03-04) - Cross-Page UX & Markdown Enhancement
- **Monthly Investment Allocation Page**:
    - Implemented a 2x2 vertical layout for investment items on narrow screens (Category/Currency on top, Ticker/Amount below).
    - Automatically appends `.TW` to "台股" tickers in Markdown generation logic for better compatibility.
- **Global UI Overhaul**:
    - Removed all native scrollbars and replaced them with a thin, minimal custom design, enhancing the premium look.
    - Standardized page breathing space using `2rem` gaps for narrow screen grids to reduce crowdedness.
- **Dashboard Optimization**:
    - Refactored "Period" and "Monthly Investment" inputs to display side-by-side on mobile, maximizing vertical screen real estate.
- **Refactoring**:
    - Removed unused internal styles from `AIAnalyst.tsx` and unified layout control into `index.css`.
- **Affected Files**: `MonthlyConfig.tsx`, `index.css`, `Dashboard.tsx`, `AIAnalyst.tsx`
- **中文摘要**: 每月配置頁面行動端佈局重構為 2x2 結構，Markdown 匯出自動補全台股 .TW 後綴。全域汰換原生捲軸為自定義極簡設計，並優化首頁與策略師頁面的間距佈局，提升窄螢幕下的空間利用率與視覺美感。

## [2026-03-04] Global Scrollbar Removal & Cross-Project Optimization
### Added
- **Global Scrollbar Hiding**: Implemented rules to hide native browser scrollbars project-wide while maintaining full scrolling functionality. This ensures a cleaner, more premium aesthetic across all browsers (Chrome, Safari, Edge, Firefox).
- **Project-Wide Implementation**: Applied custom CSS to effectively hide scrollbars in:
    - Root `index.html` (Project Portal)
    - Static HTML pages: `nagoya.html`, `okinawa.html`, `okinawa-1.html`, `tesuuryo.html`
    - Sub-project styling:
        - `mail/index.html`
        - `finance/src/index.css`
        - `pdf-tool/src/index.css`
        - `v-player-preview/src/index.css`
        - `preview/src/index.css`
        - `travel-planner/frontend/src/style.css`
        - `caselog/src/app/globals.css`
- **Cross-Browser Compatibility**: Utilized `scrollbar-width: none` (Firefox), `-ms-overflow-style: none` (IE/Edge), and `::-webkit-scrollbar { display: none; }` (Chrome/Safari/Edge) for consistent results.

### Fixed
- **UI Clutter**: Removed distracting visual scrollbars to align with the "Minimalist Premium" design language of Jing Lab.

**Affected files:** `index.html`, `nagoya.html`, `okinawa.html`, `okinawa-1.html`, `tesuuryo.html`, `mail/index.html`, `finance/src/index.css`, `pdf-tool/src/index.css`, `v-player-preview/src/index.css`, `preview/src/index.css`, `travel-planner/frontend/src/style.css`, `caselog/src/app/globals.css`

**中文說明：全域隱藏所有網頁與子專案的原生瀏覽器捲軸，並確保維持正常的捲動功能。此項優化涵蓋 Jing Lab 首頁、行程頁面及 Finance、PDF 工具、案時記等所有子系統，提升視覺上的極簡質感與裝置相容性。**

## [v3.2.0] – 2026-03-04T13:45:00+08:00
### AI Analyst: Immersive Workspace Refactoring (Option A)
#### Added
- **4th Analysis Mode: "Market Correlation & Sentiment" (市場連動與情緒共振)**: Added a new strategic analysis mode targeting market cycle resilience and behavioral bias detection.
- **Immersive Workspace Layout**: Completely redesigned the AI Analyst page following a minimalist two-column "Studio" architecture.
  - **Left Panel**: Clean strategy cards with integrated hover actions.
  - **Main Workspace**: Features a unified toolbar, a high-contrast monospaced prompt editor, and a prominent full-width action button.
- **Scoped Design System**: Introduced a component-level `<style>` architecture to implement subtle glassmorphism, glowing accents, and smooth transitions without polluting global CSS.

#### Changed
- **Linear Workflow**: Refined the user journey to a focused "Select -> Refine -> Launch" flow.
- **Visual Polish**: Replaced basic list items with animated cards featuring refined typography (Inter) and brand-aligned colors.

**中文說明：重構「AI 投資策略師」頁面為沉浸式工作台佈局（方案 A）。新增第四種模式「市場連動與情緒共振」，並採用側邊清單搭配中央大型編輯區的設計，全面提升操作流暢度與視覺設計感，導入組件級 scoped 樣式以實現更細膩的動態效果。**




## [v3.2.1] – 2026-03-04T14:15:00+08:00
### AI Analyst: Studio Grid Layout & Glassmorphism Refinement (Option 1)
#### Changed
- **Grid Layout (3-Column)**: Optimized the AI Analyst workspace into a stable 3-column "Studio Grid" (`minmax(280px, 320px) 1fr minmax(250px, 300px)`), providing a balanced layout for Strategy Selection, Prompt Editing, and Engine Tools.
- **Glassmorphism Polish**: Standardized `studio-glass-panel` aesthetics with enhanced blur (20px), refined translucent borders, and deeper box shadows for a premium layered effect.
- **Navbar Optimization**: Improved navigation hitboxes and spacing; implemented aggressive label hiding for tablets/mobile to preserve horizontal space.
- **Button Standardization**: Unified button heights (56px for primary actions) and interaction states; added a pulse-glow indicator for tool status.
- **Responsive Adaptivity**: Fine-tuned 400px device padding and implemented multi-stage grid-to-stack transformations for tablets.

**中文說明：實施「AI 分析」頁面佈局優化（方案一：Studio Grid）。將介面升級為更穩定的三欄式專業佈局，強化玻璃擬態視覺精緻度，並優化導航欄與按鈕的點擊體驗與響應式細節，確保在行動端與桌面端皆具備平衡且優雅的視覺呈現。**

## [v3.3.0] – 2026-03-04T18:05:00+08:00

### AI Analyst: Personalized Wisdom & Custom Tooling
#### Added
- **User Fundamental Profile**: Integrated persistent inputs for investment horizon, risk tolerance, psychology, and idle funds. This data is now automatically injected into all AI prompts to provide context-aware analysis.
- **Dynamic AI Tool Workbench**: Replaced the hardcoded AI link with a fully customizable "Custom Tool Manager". Users can now define their own set of AI tools (ChatGPT, Claude, etc.) from scratch with individual URLs and display names.
- **Expert Behavioral Persona**: Rewrote the prompt generator to model a senior quant strategist and behavioral consultant, delivering more diagnostic and actionable responses.
#### Fixed
- **Critical Structural Repair**: Resolved severe JSX/CSS syntax errors that were preventing the "Studio" interface from rendering correctly on mobile and desktop.
- **Persistence Sync**: Ensured seamless data flow between the AI Analyst sidebar and the core Monthly Configuration database records.

**中文說明：大幅提升 AI 分析師的「個人化」深度。現在系統會儲存使用者的投資期限、風險承受度等基本面資訊，並在產生專業提示詞時自動帶入背景；同時開放自由設定無限個 AI 工具連結（如自訂 ChatGPT 路徑），並徹底修復了介面顯示錯誤。**

## [v3.4.0] – 2026-03-04T21:45:00+08:00

### AI Analyst & Monthly Config: Animated Feedback & Smart Sorting
#### Added
- **Animated Button Feedback**: Implemented a sophisticated text-based state transition for buttons (Save, Copy, Sort). Original text disappears (0.1s), status (e.g., "已儲存", "已複製") appears with opacity and scale transitions (0.2s), holds for 2s, then restores the original label.
- **Smart Sort Secondary Weights**: Enhanced sorting logic in `MonthlyConfig.tsx` to prioritize by category (Taiwan Stock > US Stock > Fund > Other) and secondary by **Amount (Descending)** for better financial organization.
- **Investment Background Refinement**: 
    - Added "No particular feeling" (無特別感受) to current psychology options.
    - Converted "Idle Funds" to a plain text input to support non-numeric descriptions (e.g., "50k CAD", "Wait and see").
    - Added a dedicated "Notes" (備註) field for additional user-provided context.
- **Layout Optimization**: Balanced the AI Analyst desktop layout to a 1:1 ratio (`minmax(0, 1fr)`) for User Fundamentals and Prompt Editor sections, improving visual symmetry on wide screens.

#### Fixed & Improved
- **Silent Auto-save**: Refactored the auto-save mechanism to be completely silent, removing noisy toast notifications to focus on intent-driven button feedback.
- **Design Language Alignment**: Fully purged "Green" as a success indicator, aliasing it to brand Indigo tints (`--primary`) in `index.css`.
- **Icon Visibility**: Updated all `.icon-btn` and ghost variants to use white/light colors, ensuring maximum contrast against the dark glassmorphism background.
- **Type Safety**: Updated `MonthlyConfig` and `UserSettings` interfaces to handle string-based idle funds and the new notes field.

**中文摘要：為「AI 分析」與「每月配置」按鈕注入動態文字回饋（已儲存、已複製），取代擾人的彈窗通知。智慧排序新增「金額高至低」二次權重。優化投資背景欄位：閒置資金改為純文字、新增備註、心理狀態新增「無特別感受」。系統版面優化為對稱佈局，並全面移除綠色系改採品牌靛藍色，確保視覺一致性與圖示清晰度。**

## [v3.4.1] – 2026-03-04T20:10:00+08:00
### Monthly Config: Table Height & Real-time Summaries
#### Added
- **Real-time Category Summaries**: Implemented a live calculation display grouping items by category and currency (e.g., Funds-JPY, Funds-TWD) on the Monthly Config page.
- **Scrollable Investment Grid**: Fixed the investment table height to 420px with custom vertical scrolling, preventing excessive page length.
- **Markdown Summary Integration**: Exported Markdown reports now include a dedicated "Category Totals" section.

#### Fixed
- **Monthly Execution Deduplication**: Modified  to ensure that re-executing a plan for the same month overwrites the existing snapshot instead of creating duplicates.
- **Type Safety & Imports**: Fixed missing  import and addressed implicit  type warnings in the summary calculation logic.

**中文摘要：每月投資配置功能優化。新增分類與幣別的即時總計看板，並將配置表格改為固定高度捲動以提升操作精緻感。修正了重複執行計畫時產生多重快照的問題（改為自動覆蓋），並同步更新 Markdown 報表格式。**

## [v3.4.1] – 2026-03-04T20:12:00+08:00
### Monthly Config: Table Height & Real-time Summaries
#### Added
- **Real-time Category Summaries**: Implemented a live calculation display grouping items by category and currency (e.g., Funds-JPY, Funds-TWD) on the Monthly Config page.
- **Scrollable Investment Grid**: Fixed the investment table height to 420px with custom vertical scrolling, preventing excessive page length.
- **Markdown Summary Integration**: Exported Markdown reports now include a dedicated "Category Totals" section.

#### Fixed
- **Monthly Execution Deduplication**: Modified `executePlanLogic` to ensure that re-executing a plan for the same month overwrites the existing snapshot instead of creating duplicates.
- **Type Safety & Imports**: Fixed missing `useMemo` import and addressed implicit `any` type warnings in the summary calculation logic.

**中文摘要：每月投資配置功能優化。新增分類與幣別的即時總計看板，並將配置表格改為固定高度捲動以提升操作精緻感。修正了重複執行計畫時產生多重快照的問題（改為自動覆蓋），並同步更新 Markdown 報表格式。**

## [2026-03-05] Caselog: TypeScript JSX & Compatibility Fix
### Fixed
- **Resolved JSX Global Namespace Issue**: Fixed a critical TypeScript error where `JSX.IntrinsicElements` was missing, causing all HTML tags and custom components to be typed as `any`.
- **Component Children Prop Propagation**: Fixed "Type '{}' is missing the property 'children'" error in `AuthWrapper` and other high-level components by ensuring the global `JSX` namespace correctly inherits from `React.JSX`.
- **React 19 Compatibility**: Updated `tsconfig.json` with `jsxImportSource: "react"` to align with the new React 19 JSX transformation and type resolution strategy.

### Added
- **Global JSX Declarations (`src/types/jsx.d.ts`)**: Introduced a bridge type definition file that explicitly exposes `React.JSX` interfaces to the global scope, stabilizing the IDE and build-time type-checking.

**Affected files:** `caselog/tsconfig.json`, `caselog/src/types/jsx.d.ts`, `caselog/CHANGELOG.md`

**中文摘要：徹底修復了 Caselog 專案在 React 19 環境下的 TypeScript 型別衝突（JSX 命名空間遺失與 children 屬性報測）。透過更新 tsconfig 配置與新增全域型別 bridge 檔案，恢復了正確的型別推導與開發環境體驗。**

## [2026-03-05] Portal: Added Caselog Entrypoint
### Added
- **New Project Portal Entry**: Added "Caselog 專案紀錄" to the main `index.html` dashboard, providing high-visibility access to the project log application.
- **Project Metadata**: Configured title, icon (clipboard-list), and feature descriptions for the Caselog portal card.

**Affected files:** `index.html`

**中文摘要：在 Jing Lab 入口索引頁新增 Caselog 專案卡片，讓使用者能更快速地存取專案開發紀錄與技術日誌。**

## [2026-03-05] Portal: Fixed Auth Saving & Custom Dialog
### Fixed
- **Firestore Permission Issue**: Resolved an error (`Missing or insufficient permissions`) that prevented users from saving project arrangements even when logged in as Admin. Added `default.firestore.rules` and updated `firebase.json` for the `(default)` database, granting proper write access to the Admin email.

### Changed
- **Custom Modal Dialog**: Replaced the native browser `confirm()` and `alert()` popups in `index.html` (e.g. for logging out and saving errors) with a custom-designed, stylized modal component using Tailwind CSS, enhancing the overall visual consistency of the portal.

**Affected files:** `index.html`, `firebase.json`, `default.firestore.rules`

**中文摘要：修復了入口頁面即使登入也無法儲存排版的權限遺失問題（寫入(default)資料庫的規則未建），同時將陽春的瀏覽器預設 alert/confirm 提示窗，改為符合 Jing Lab 介面風格的自訂隱藏式美化視窗。**

---

## [2026-03-05] Note: Performance Optimization
### Optimized
- **Tailwind Static Generation**: Replaced `cdn.tailwindcss.com` with a pre-compiled, pruned `style.css` (reduced from 100KB+ runtime JS to 21KB static CSS).
- **Localized Scripts**: Moved `diff_match_patch.js` from CDN to local folder, reducing DNS/TTL overhead.
- **Service Worker Cache Strategy**: Switched to a "Cache-First" model for static assets, enabling sub-second load times on repeat visits and better offline support.
- **Resource Hints**: Added `preconnect` for Google Fonts and Firebase to speed up initial connection handshakes.

**Affected files:** `note/index.html`, `note/sw.js`, `note/style.css`

**中文摘要：對 `note` 子應用進行了深度效能優化。透過移除 Tailwind Play CDN、本地化外部腳本以及將 Service Worker 調整為「快取優先」策略，顯著提升了載入速度與離線穩定性。**

---

## [2026-03-05] Note App: UI Fixes & Saving Bug Resolution
### Added
- **Loading Overlay & Mask**: Implemented a sophisticated loading mask in the `note` application. It displays real-time status messages (e.g., "獲取資料中...", "成功加載資料", "連線錯誤") based on actual API/Auth responses.
- **Missing Color Token Definitions**: Manually defined `.bg-primary`, `.text-primary`, `.text-secondary`, and `.bg-accent` in the `note/index.html` style block to ensure consistent rendering across different build environments.

### Fixed
- **Uncaught TypeError in `diff_match_patch.js`**: Resolved logic error where `replace is not a function` occurred during the saving process. Added explicit `String()` casting for note titles and contents before passing them to the diff engine.
- **PWA Toolset Visibility**: Adjusted the viewport-fit and manifest `display` properties to ensure the browser's utility bar is hidden when the app is installed/added to the home screen.
- **Floating Window (Modal) Visibility**: Refined the `customModal` and `diffModal` styles to use a High-Contrast structure: Dark Background (`bg-primary`) with Light Text (`text-white`).
- **Save Button Contrast**: Updated the save button's CSS classes to `bg-primary text-white`, ensuring it matches the "Cancel" button's visual weight and remains visible against the white note cards.
- **Asset Desync**: Bumped Service Worker version to `v9` to force cache invalidation for the new UI and logic changes.

**Affected files:** `note/index.html`, `note/sw.js`, `note/manifest.json`, `CHANGELOG.md`

**中文摘要：修復了 `note` 應用中「儲存按鈕顏色太淺看不見」以及「存檔時程式報錯 (TypeError)」的問題。新增了具備狀態提示的載入遮罩動畫、優化了浮動視窗的深色主題顯示，並解決了 PWA 安裝後出現瀏覽器工具列的顯示問題。**

## [2026-03-06] Mail: Config Path Fix & Deployment Stability
### Fixed
- **Resolved "Unexpected token '<'" Error**: Fixed a critical path resolution bug in the `mail` application where relative script paths (`config.js`) were incorrectly redirected to the root `index.html` on sub-directory access.
- **Absolute Path Integration**: Updated `mail/index.html` to use a root-relative path (`/mail/config.js`), ensuring configuration loads correctly regardless of URL trailing slashes.
- **Firebase Hosting Compatibility**: Aligned the mail app with the global `trailingSlash: false` hosting policy by stabilizing its asset references.
- **CSS Syntax Refinement**: Fixed invalid `ring` and `ring-offset` properties in `.theme-btn.active` by replacing them with standard `box-shadow` implementations.

**Affected files:** `mail/index.html`, `CHANGELOG.md`

**中文摘要：修復了 `mail` 工具在部署後因路徑解析錯誤導導致的 `config.js` 載入失敗（出現 Unexpected token '<' 錯誤）。同時修正了 `index.html` 中無效的 CSS 屬性，確保介面樣式符合標準。最後執行全站完整部署以同步所有子專案。**

## [2026-03-07] Finance: Favicon Update
### Changed
- **Favicon Synchronization**: Updated the `finance` sub-project's favicon from the default Vite icon to the project's customized `appicon.png`.
- **Public Assets Update**: Replaced `/finance/public/favicon.png` with the high-resolution branding asset for consistent user experience.

**Affected files:** `finance/index.html`, `finance/public/favicon.png`

**中文摘要：更新 JING Finance 的網頁圖標，將其由預設的 Vite 圖示替換為專案專屬的高解析度 `appicon.png`，並確保發布目錄同步更新以提升品牌一致性。**

## [2026-03-07] PDF Tool: Favicon Update
### Changed
- **Branding**: Replaced default Vite favicon with a custom-designed SVG icon in the `pdf-tool` sub-project.

**Affected files:** `pdf-tool/index.html`, `pdf-tool/public/favicon.svg`

**中文摘要：為 PDF 工具更新專屬的 SVG 網頁圖標，提升品牌一致性。**

## [2026-03-07] Caselog: Favicon Update
### Changed
- **Branding**: Unified the `caselog` favicon and apple-touch-icon with the project's customized `appicon.png`.

**Affected files:** `caselog/src/app/layout.tsx`, `caselog/public/favicon.png`, `caselog/public/app-icon.png`

**中文摘要：統一「案時記 (caselog)」的網頁圖標，採用專案專屬的 `appicon.png` 並更新 PWA 與 Favicon 配置。**

## [2026-03-07] Mail: Favicon Update
### Added
- **Visual Identity**: Implemented custom SVG favicon for the `mail` tool using an ultra-minimalist geometric design.

**Affected files:** `mail/index.html`, `mail/favicon.svg`

**中文摘要：為 `mail` 子專案建立專屬網頁圖標，採用自定義的 SVG 設計以維持品牌視覺一致性。**
