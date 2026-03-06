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
- Added task sorting by `lastLogAt` (falling back to `createdAt`).
- Added date editing capability in `LogTimeModal`.
- Integrated date editing in `SwipeableTask` (Inline Add/Edit forms).
- Optimized layout for date field in `SwipeableTask` to ensure visibility on all screen sizes.
- Fixed missing `lastLogAt` updates on timer stop and log deletion to ensure consistent sorting.

**中文摘要：實作任務按最後活動排序、工時日期補錄功能，並優化編輯表單佈局。修復計時停止與刪除紀錄時未更新活動時間的問題，確保排序始終準確。**
