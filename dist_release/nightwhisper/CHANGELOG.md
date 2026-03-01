# Changelog

All notable changes to this project will be documented in this file.

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

