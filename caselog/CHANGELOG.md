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
- Implemented **Strict Log-Date Sorting** using a new denormalized `latestLogDate` (String) field.
- Redesigned sorting hierarchy: Tasks now rank strictly by their latest work log date (lexicographical comparison).
- Added auto-recalculation of `latestLogDate` when work logs are deleted, ensuring sorting stability.
- Solved the issue where newly created tasks or out-of-order logs caused incorrect ranking.

**中文摘要：徹底重構任務排序邏輯。改用專門的 `latestLogDate` 字串欄位進行去正規化排序，解決了之前補錄舊工時或新創任務時導致的順序錯亂問題。現在無論如何補錄或刪除工時，列表都會精準地按照「工作日期」由新到舊排列。**

## [Unreleased] - 2026-03-07
### Changed
- **Favicon Synchronization**: Updated the application favicon from the default `favicon.ico` to the project's customized `appicon.png`.
- **Public Assets**: Replaced `public/favicon.png` and `public/app-icon.png` with the high-resolution branding asset.

**中文摘要：更新「案時記」的網頁圖標，將其由預設的 .ico 替換為專案專屬的 `appicon.png`，統一行動端與網頁端的品牌視覺。**
