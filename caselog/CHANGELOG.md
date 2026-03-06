# Changelog

## [Unreleased] - 2026-03-05
### Fixed
- Resolved TypeScript JSX type errors by ensuring global `JSX` namespace availability.
- Fixed `JSX.IntrinsicElements` missing errors and component `children` property issues in `FinancePage` and other components.
- Updated `tsconfig.json` with `jsxImportSource: "react"` for better React 19 compatibility.

**中文說明：修復了 TypeScript 的 JSX 型別錯誤，確保全域 JSX 命名空間可用，並解決了組件 children 屬性遺失的問題。**

## [Unreleased] - 2026-03-06
### Added
- Implemented task list sorting based on the "Last Log Activity" (most recent first).
- Added task sorting strictly by the **custom work date** of the last log entry.
- Added date editing capability in `LogTimeModal`.
- Integrated date editing in `SwipeableTask` (Inline Add/Edit forms).
- Optimized layout for date field in `SwipeableTask` to ensure visibility on all screen sizes.
- Refined `lastLogAt` behavior: normalized all work-dated activity to **end-of-day (23:59:59)** to avoid ranking conflicts with newly created tasks.
- Improved frontend sorting logic to handle mixed data types (Firebase Timestamp vs JS Date) robustly.

**中文摘要：優化任務列表排序邏輯。將工時自定義日期統一設定為該日 23:59:59，確保「當天有工時」的任務一定排在「當天剛建立但沒工時」的任務之上。同時提升了前端排序在處理不同資料格式時的穩定性。**
