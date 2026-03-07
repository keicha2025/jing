# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-02-23

### Initial Release & PDF Processing Core
- Initialized Vite + React + Tailwind CSS project foundation.
- Implemented the **FlatModern** UI design with frosted glass aesthetics and custom animations.
- Integrated `pdf-lib` for client-side PDF flattening (Node.js Core engine).
- Developed a FastAPI backend providing high-quality PDF processing via PyMuPDF and Ghostscript.
- Configured PWA (Progressive Web App) with mobile-ready manifest and icons.
- Prepared Docker containerization for Google Cloud Run deployment.

**建立了專案基礎設施，包含精美的前端介面、多種 PDF 扁平化引擎，並完成了 PWA 與容器化的設定。**

## [0.1.1] - 2026-02-23

### Deployment
- Deployed the static PWA frontend to GitHub Pages.
- Integrated Google Cloud Project ID for future backend deployment.

**已將前端 PWA 部署至 GitHub Pages，並準備好後端 GCP 整合。**

## [0.1.2] - 2026-02-23

### Bug Fixes & Improvements
- **Backend**: Fixed `save()` error in Python engine by implementing a more robust rasterization flattening method.
- **Backend**: Added Ghostscript quality presets (`/screen`, `/ebook`, `/prepress`).
- **Frontend**: Integrated quality selection UI (Standard, High, Ultra) to allow users to prioritize file size or visual fidelity.
- **Frontend**: Corrected deployment paths and verified GitHub Actions integration.

**修復了 Python 引擎崩潰問題，並新增了畫質選擇功能（Standard, High, Ultra），讓使用者能根據需求調整輸出品質。**

## [0.1.3] - 2026-02-25

### UI & Aesthetic Refinement
- **Color Restrictions**: Removed all occurrences of the color green and yellow from the application UI.
- **Icon Refactoring**: Replaced "Success" checkmarks and selection dots with neutral `FileText` and `ChevronRight` icons.
- **Theming**: Standardized success states to use `indigo` and `zinc` tones for a cleaner, more professional look.

**移除所有綠色勾勾與黃色元素。將處理完成圖示改為中性的文件圖標，並全面排除綠色與黃色調，確保介面呈現更一致且高級的 indigo/zinc 色系。**

## [0.1.4] - 2026-03-07

### Branding & Identity
- **Custom SVG Favicon**: Replaced the default Vite icon with a custom-designed `favicon.svg`.
- **Icon Design**: Implemented a minimalist document fold icon with a deep stone background (`#1C1917`) and indigo accents.

**Affected files:** `index.html`, `public/favicon.svg`

## [0.1.5] - 2026-03-08

### Optimization & Simplification
- **Compression Mode**: Removed the local (client-side) compression method to ensure consistent output quality.
- **Unified Workflow**: Standardized on Cloud-Native Ghostscript compression for all PDF reduction tasks.
- **Security**: Reinforced whitelist access control for the professional cloud compression feature.
- **UI Cleaning**: Removed the "Local/Cloud" mode switcher for a more streamlined, goal-oriented user experience.
- **Button Reordering**: Swapped "Download" and "Restart" button positions to place the primary download action on the right.

**Affected files:** `src/App.jsx`

**移除本地壓縮模式，一律採用雲端 Ghostscript 引擎執行 PDF 壓縮，以確保最高品質的輸出結果。同時簡化介面按鈕（將下載按鈕移至右側），並維持白名單專業版權限限制。**

