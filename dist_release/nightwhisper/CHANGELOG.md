# Changelog

All notable changes to this project will be documented in this file.

### [2.16.5] - 2026-03-05
- **Critical Fix**: Path resolution for subfolder hosting.
  - Added script to force trailing slash on `/nightwhisper` URL.
  - Changed all script/link tags to use explicit `./` relative paths.
  - Fixes the issue where scripts failed to load when accessed without a trailing slash.
> 修復了子目錄部署下的路徑解析問題，透過強制補完 URL 斜線以及明確指定相對路徑 `./`，解決了因 Firebase 導向導致腳本無法正確載入的致命錯誤。

### [2.16.4] - 2026-03-05
- **Fix**: Foolproof unit-hiding for sliders.
  - Used `innerText = ''` to clear unit labels when slider is at zero.
  - Added global `window.NW_UI_LOADED` flag and extra logging.
> 採用更強制的手段隱藏單位標籤（直接清空文字內容），並加入全域變數與更多日誌以追蹤腳本執行狀況。

### [2.16.3] - 2026-03-05
- **Critical Fix**: Restored corrupted `app.js` and optimized startup sequence.
  - Moved UI and Slider initialization to the very top of the entry function.
  - Wrapped async storage initialization in a try-catch to prevent blocking UI.
  - Added detailed `[App]` stage logging for better remote debugging.
> 重建了損壞的 `app.js` 並優化了啟動流程，確保 UI 與拉桿在任何非同步操作前完成初始化，避免程式碼掛掉導致組件不顯示。

### [2.16.2] - 2026-03-05
- **Fix**: Improved custom slider visibility and initialization logic.
  - Added 100ms delay to slider initialization to ensure DOM readiness.
  - Used `setProperty('display', 'none', 'important')` for unit labels at zero value.
  - Increased track and thumb contrast in CSS.
  - Added forced `innerHTML` injection if slider elements are missing.
  - Set `overflow: visible` on slider containers to prevent clipping.
> 強化了自定義拉桿的顯示與初始化邏輯，解決了拉桿不可見以及「分鐘」單位標籤未能正確隱藏的問題。

### [2.16.1] - 2026-03-05
- **Fix**: Attempted to fix custom slider unit visibility bug.
  - Added defensive checks for slider track injection.
  - Modified unit label visibility logic.
> 嘗試修復自定義拉桿在數值為 0 時仍顯示「分鐘」單位的問題。

## [2.15.0] - 2026-03-05

### Added
- **Premium Custom Sliders**: Replaced native `<input type="range">` with completely custom-designed slider components for "Delay Startup" and "Ignore Start Time".
  - 使用自定義組件取代原生拉桿，提升視覺質感並修復功能失效問題。
- **Interactive UI Feedback**: Added smooth transitions, glow effects, and real-time value synchronization for the new sliders.
  - 新增動態流暢的視覺回饋與數值即時同步功能。

## [2.14.0] - 2026-03-04

### Changed
- **Scrollbar UI Optimization**: Implemented "Hide but scrollable" behavior across all major browsers (Chrome, Safari, Edge, Firefox). Added `scrollbar-gutter: stable` to prevent layout shift (jittering) when navigating.
  - 全域隱藏原生捲軸並維持捲動功能，解決頁面內容在隱藏捲軸後產生的晃動問題。

---

## [2.13.0] - 2026-03-02

### Fixed
- **Stream Decoding Death Loop**: Refactored the MP4 chunk streaming logic to gracefully check for EOF and flush the WebCodecs `AudioDecoder`. This resolves the issue where the parsing process stalled infinitely.
  - 修正 mp4box 在大檔案結束後不會自動觸發完成事件，導致分析過程卡死的問題。
- **Decoder Throttling**: Introduced a throttled buffer ingestion mechanism that checks `audioDecoder.decodeQueueSize`. This effectively prevents the buffer queue from exploding and causing mobile memory limits to be exceeded.
  - 新增串流進度節流閥，避免解碼器陣列過度堆積導致 OOM。
- **Progress Percentage Bug**: Fixed the visual glitch where the decoding percentage exceeded 100% (up to 5000%) by accurately mapping timestamps instead of frame counts.
  - 修改進度條百分比的計算基準從「影格數」改為「音訊時長」，解決進度顯示會突破天際跑到好幾千％的問題。

---

## [2.12.0] - 2026-03-02

### Added
- **AudioDecoder Diagnostics**: Added console logging for troubleshooting WebCodecs behavior on mobile devices.
  - 在行動裝置開發者控制台增加 WebCodecs 的診斷日誌輸出。
- **ASC Construction Fallback**: Implemented manual `AudioSpecificConfig` construction for AAC-LC audio to ensure consistent decoding even with missing MP4 atoms.
  - 為 AAC-LC 格式新增手動構造位元流標頭的機制，確保 metadata 缺失時解碼器仍可正常運作。

### Changed
- **Codec Stabilization**: Optimized codec string handling for `AudioDecoder.configure()`, specifically pinning `mp4a.40.2` for better hardware acceleration compatibility.
  - 優化解碼器配置中的位元流參數，固定使用 `mp4a.40.2` 字串以提升硬體加速相容性。

---

## [2.11.0] - 2026-03-02

### Added
- **WebCodecs & MP4Box Integration**: Implemented streaming chunked decoding for large audio uploads (300MB+) to prevent OOM crashes on mobile devices.
  - 導入 WebCodecs 與 mp4box.js，實現大容量音檔（如 8 小時睡眠錄音）的串流解碼，解決行動裝置記憶體溢位導致分頁崩潰的問題。

### Fixed
- **Re-analysis Variable Scope**: Fixed a logic bug in `analyzer.js` where internal state was polluted during repeated analysis runs.
  - 修正分析模組中全域變數未重設導致重複分析結果不精確的問題。

---

## [2.10.0] - 2026-03-01

### Added
- **Instant Re-analysis**: Decoupled feature extraction from event detection. Re-analysis now instantly processes cached energy arrays from IndexedDB instead of decoding large audio files.
- **Smoothing Filter**: Applied a 3-second moving average during re-analysis to filter out short noise bursts and improve event detection accuracy.

### Changed
- `analyzer.js`: Added `reanalyzeFromData` method to handle instant array reprocessing.
- `app.js`: Updated `btnReanalyze` event listener to fetch existing `analysisData` and map to the new decoupling logic.
- `storage.js`: Added `clearSessionData` to support clean re-analysis by removing old events and analysis logs.

---

## [2.9.0] - 2026-02-27

### Added
- **Timeline Scrubbing**: Implemented smooth playhead dragging (scrubbing) on the analysis waveform. Users can now grab the white playhead line to quickly seek through the audio.
- **Interactive Playhead**: Added a touch-friendly handle for the playhead to improve usability on mobile devices.

### Fixed
- **Re-analysis Data Accuracy**: Fixed a critical bug in the offline analysis engine where frequency energy was incorrectly mapped, causing empty waveform data.

---

## [2.8.0] - 2026-02-26

### Added
- **Pinch-to-zoom Support**: Implemented multi-touch gestures for the sleep analysis waveform. Users can now zoom in to inspect audio events with high granularity.
- **Timeline Panning**: Enabled smooth dragging and scrolling across the zoomed-in timeline for easier navigation through long recording sessions.
- **Granular View & Precise Seeking**: Zooming in allows for highly precise playback seeking and detailed amplitude inspection.
- **Double-tap to Reset**: Added a quick shortcut - double-tap the waveform to instantly reset to the full session view.

### Changed
- Refactored `NightWhisperWaveform` rendering logic to use a dynamic viewport system for improved performance during high-zoom levels.

---

## [2.7.0] - 2026-02-26

### Fixed
- **Re-analysis Engine Stability**: Fixed a critical `INDEX_SIZE_ERR` during offline analysis caused by improper boundary checking at the end of the audio buffer.
- **Missing Detection Events**: Improved re-analysis resolution from 1 second per step to 0.2 seconds.
- **Timing Correctness**: Fixed a bug where the final detection event used `Date.now()`.

### Changed
- **Enhanced Spectrum Simulation**: Improved `_simulateFFT` with zero-crossing rate estimation.

---

## [2.6.0] - 2026-02-25

### Added

### Added
- **Instant Re-analysis**: Decoupled feature extraction from event detection. Re-analysis now instantly processes cached energy arrays from IndexedDB instead of decoding large audio files.
- **Smoothing Filter**: Applied a 3-second moving average during re-analysis to filter out short noise bursts and improve event detection accuracy.

### Changed
- `analyzer.js`: Added `reanalyzeFromData` method to handle instant array reprocessing.
- `app.js`: Updated `btnReanalyze` event listener to fetch existing `analysisData` and map to the new decoupling logic.
- `storage.js`: Added `clearSessionEvents` to allow isolated clearing of event data without erasing cached analysis feature arrays.

---
本更新實現了核心分析邏輯的完全解耦，讓使用者在調整敏感度後，能瞬間得到重新判讀的結果，徹底解決了長音檔重新分析導致的時間浪費與記憶體崩潰問題。同時加入了平滑化處理，進一步提升偵測精準度。
 中文說明：將特徵提取與閾值判斷分離，大幅提升「再次分析」效能，並新增防呆過濾機制解決短促雜訊誤判的問題。

## [2026-03-02T00:13:00Z]
- Refactored audio upload logic to use WebCodecs (AudioDecoder) and mp4box.js chunk streaming for large files (300MB+).
- Resolved OOM crashes during the audio upload process.
- Fixed consecutive event count variable logic in analyzer to prevent interference during real-time re-analysis of audio.
- Included mp4box.js library inside `index.html` headers.

*改用 WebCodecs 與分塊讀取架構徹底避免大檔案上傳崩潰，同時消除重新分析時變數污染所造成的 bug。*

