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
- Fixed `lastLogAt` behavior: it now synchronizes with the manually selected work date instead of the operation time.

**中文摘要：任務列表改為完全依照「工時自定義日期」排序，不論何時補錄，皆以工時當下的日期為準。修正了新增/編輯工時時的活動追蹤邏輯，並同步修復了部分代碼語法錯誤。**
