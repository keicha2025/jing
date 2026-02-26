# Changelog

All notable changes to this project will be documented in this file.

## [2.8.0] - 2026-02-26

### Added
- **Pinch-to-zoom Support**: Implemented multi-touch gestures for the sleep analysis waveform. Users can now zoom in to inspect audio events with high granularity.
  - 睡眠分析圖表新增雙指縮放功能，支援從 8 小時全貌縮放至 1 分鐘級別的細節。
- **Timeline Panning**: Enabled smooth dragging and scrolling across the zoomed-in timeline for easier navigation through long recording sessions.
  - 支援在縮放後的波形圖上左右拖拽捲動，方便檢視全時段數據。
- **Granular View & Precise Seeking**: Zooming in allows for highly precise playback seeking and detailed amplitude inspection.
  - 縮放後可進行「細粒度檢視 (Granular view)」，並在波形上實現「精確定位 (Precise seeking)」回放。
- **Double-tap to Reset**: Added a quick shortcut - double-tap the waveform to instantly reset to the full session view.
  - 新增快捷手勢：雙擊波形圖即可快速重設視角，回到全覽狀態。

### Changed
- Refactored `NightWhisperWaveform` rendering logic to use a dynamic viewport system for improved performance during high-zoom levels.
  - 重新建構波形渲染引擎，導入動態視窗，大幅提升高倍縮放下的繪製效能。

---
本更新導入了行動裝置上最直覺的縮放手勢（Pinch-to-zoom），讓使用者能像操作地圖一樣，輕鬆定位並聽取睡眠中每個微小的聲響。

## [2.7.0] - 2026-02-26

### Fixed
- **Re-analysis Engine Stability**: Fixed a critical `INDEX_SIZE_ERR` during offline analysis caused by improper boundary checking at the end of the audio buffer.
  - 修正離線分析在音檔末端會因邊界檢查與 `copyFromChannel` 錯誤而導致分析失敗的問題。
- **Missing Detection Events**: Improved re-analysis resolution from 1 second per step to 0.2 seconds, ensuring better data coverage and preventing missed short events.
  - 將分析步進從 1 秒提升至 0.2 秒，解決因採樣解析度不足導致重新分析結果為 0 的問題。
- **Timing Correctness**: Fixed a bug where the final detection event used `Date.now()` during re-analysis, causing incorrect durations.
  - 修正離線分析結束時會誤用當前系統時間導致事件長度異常的錯誤。

### Changed
- **Enhanced Spectrum Simulation**: Improved `_simulateFFT` with zero-crossing rate estimation to differentiate frequency peaks between snore and talk during offline analysis.
  - 強化離線分析模擬，導入零交越率偵測使其能大致分辨打呼與夢話。

---
本更新解決了「重新分析」功能的兩大核心痛點：分析中斷報錯，以及分析完整個音檔卻沒偵測到任何事件的情況。

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
