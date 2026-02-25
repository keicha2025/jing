# Changelog

All notable changes to this project will be documented in this file.

## [2.6.0] - 2026-02-25

### Added
- **Session Selector**: Implemented a custom stylized dropdown in the Analysis view to switch between different recording sessions.
  - 報告頁面新增自定義樣式的錄音紀錄切換選單。
- **Re-analysis Feature**: Added the ability to re-analyze the currently selected session with new sensitivity settings.
  - 新增「重新分析當前音檔」功能，可套用新調整的敏感度重新偵測事件。
- **5-Level Sensitivity**: Expanded detection sensitivity from 3 to 5 levels (Extremely Low to Extremely High) for more precise control.
  - 偵測敏感度擴充至 5 個尺度（極低、低、中、高、極高）。

### Changed
- Updated `NightWhisperAnalyzer` to support dynamic threshold mapping based on 5 sensitivity levels.
  - 升級分析引擎，支援 5 階靈敏度門檻映射。
- Enhanced `NightWhisperStorage` with `clearSessionData` to support clean re-analysis by removing old events and analysis logs.
  - 儲存模組新增清除單次紀錄數據的功能，確保重新分析時資料不重疊。

### Technical Details
- Improved `analyzeBuffer` method in `analyzer.js` to accept and apply specific sensitivity settings during offline analysis.
- Implemented asynchronous audio decoding and buffer combination logic in `app.js` to handle multi-segment re-analysis.
- Synchronized sensitivity settings between the Settings view and the Analysis view.
- Added custom backdrop-blur and transition effects for the session dropdown UI.

---
本更新強化了分析引擎的靈活性與報告頁面的互動性，讓使用者能針對錄音進行精細調整與重新判讀。
