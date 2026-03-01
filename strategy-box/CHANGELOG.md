# Changelog

## [1.0.0] - 2026-03-01

### Added
- Initial project setup using Vite + React (TypeScript).
- Firebase integration for Google Authentication and Firestore database.
- Premium design system with Vanilla CSS (Glassmorphism, RWD).
- Asset management module (Holdings) with CRUD functionality.
- Monthly Investment Configuration with Markdown export generator.
- AI Analyst tool with Smart Prompt generator and Gemini integration.
- Navigation system with persistent layout.

### Technical Details
- **Architecture**: Single Page Application (SPA) with Firebase backend.
- **State Management**: React Hooks + Firebase Auth.
- **Styling**: Vanilla CSS variables, glassmorphism effects, and responsive layout.
- **Data Model**: Firestore schema as specified in Project Requirements.

### Affected Files
- `src/App.tsx`, `src/index.css`, `src/firebase.ts`
- `src/pages/*`, `src/components/*`
- `src/services/db.ts`, `src/types/index.ts`

---
**本更新初始化了 JING 理財管理系統，包含核心資產管理、配置匯出以及 AI 策略工具。**
**建立了與 Firebase 的整合以及現代化的玻璃擬態介面。**

---

## [1.1.0] - 2026-03-01 - Dedicated Database Setup

### Added
- Dedicated Firestore database instance: `jing-finance` (Location: `asia-northeast1`).
- Custom security rules with user-level isolation for the named database.

### Changed
- Updated `src/firebase.ts` to utilize the named database instance `jing-finance`.
- Optimized `firebase.json` for multi-site and multi-database deployment.

### Affected Files
- `src/firebase.ts`
- `firebase.json`
- `firestore.rules`

---
**建立了專屬資料庫 `jing-finance` 以落實資料隔離，並同步更新安全性規則與連線邏輯。**
**已經完成所有資料庫與部署相關的技術細節調教。**

---

## [1.2.0] - 2026-03-01 - AI Analyst Overhaul

### Added
- **Dynamic AI Strategies**: Users can now create, edit, and delete AI analysis patterns stored in Firestore.
- **Customizable AI Tools**: Support for multiple AI services (Gemini, ChatGPT, Claude) with user-configurable URLs.
- **Prompt Template Engine**: Implemented a dynamic variable substitution system for prompts (e.g., `${totalValue}`, `${currentHoldingsList}`).
- **Strategy Icon Selector**: Visual identification for different analysis modes using Lucide icons.
- **Restore Defaults**: One-click recovery for system-recommended AI strategy templates.

### Changed
- Refactored `AIAnalyst.tsx` to utilize real-time database settings for strategies and tools.
- Enhanced UX with a "Preview & Copy" workflow and smooth visual feedback.
- Updated `types/index.ts` to support extensible AI configuration schemas.

### Fixed
- Resolved Firebase "Missing or insufficient permissions" by ensuring all DB operations use authenticated UID.
- Fixed TypeScript linting errors regarding property mapping in asset calculations (totalValueInBase, config.items).

### Affected Files
- `src/pages/AIAnalyst.tsx`
- `src/types/index.ts`
- `src/services/db.ts`

---
**升級 AI 分析師功能：支援使用者自訂 Prompt 策略、切換多種 AI 工具，並實現數據動態連結。**
**加入了圖示選擇器與預設值恢復功能，大幅提升 AI 輔助投資分析的靈活性與 UX 體驗。**

---

## [1.3.0] - 2026-03-01 - Monthly Execution Focus Overhaul

### Added
- **Command Center Dashboard**: Rebuilt `Dashboard.tsx` to integrate Monthly Config editing, execution tracking, and rationale logging directly on the front page.
- **Idle Funds Management**: New `idleFunds` property in `MonthlyConfig` and a dynamic UI counter that decreases as funds are allocated.
- **Rationale Log**: A new textarea to capture the user's reasoning/notes for the month's investments.
- **Execute Plan Action**: A "Confirm & Execute" workflow that moves monthly configured items into actual holdings and triggers a new milestone snapshot.
- **Investment Magnitude Chart**: A stacked bar chart visualizing monthly cash flow intensity over the past 12 months.
- **Next Month Rollover**: Automated generation/inheritance of the previous month's plan.
- **Smart Reminders**: Client-side date check to prompt for next month's planning after the 25th.

### Changed
- **UI Paradigm**: Shifted focus from "Static Asset Ledger" to "Dynamic Workflow Tool".
- **AI Prompt Templates**: Updated `AIAnalyst.tsx` to consume `${idleFunds}` and `${rationale}` for enhanced "Decision Calibration".
- Modified `types/index.ts` and `services/db.ts` to support the expanded configuration schema.

### Deleted
- **MonthlyConfig.tsx**: Functionality merged fully into the `Dashboard.tsx` layout.

### Affected Files
- `src/pages/Dashboard.tsx`
- `src/pages/MonthlyConfig.tsx` (Deleted/Merged)
- `src/pages/AIAnalyst.tsx`
- `src/types/index.ts`
- `src/services/db.ts`

---
**本更新將專案重心從「靜態記帳」轉移至「動態每月執行」。**
**包含首頁整併、閒置資金管理與一鍵寫入實際庫存的設計，並將決策心得整合進 AI Prompt 中，強化投資紀律。**
