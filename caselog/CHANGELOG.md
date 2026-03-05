# Changelog

## [Unreleased] - 2026-03-05
### Fixed
- Resolved TypeScript JSX type errors by ensuring global `JSX` namespace availability.
- Fixed `JSX.IntrinsicElements` missing errors and component `children` property issues in `FinancePage` and other components.
- Updated `tsconfig.json` with `jsxImportSource: "react"` for better React 19 compatibility.

**中文說明：修復了 TypeScript 的 JSX 型別錯誤，確保全域 JSX 命名空間可用，並解決了組件 children 屬性遺失的問題。**
