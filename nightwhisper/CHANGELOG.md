# Changelog - NightWhisper

All notable changes to this project will be documented in this file.

## [2024-05-24] 新增靜音過濾與超長音檔支援 (Silence Filtering & Heavy File Support)
- **Feature: Silence Filtering Script**
  - Added `scripts/filter_silence.py` Python tool based on `pydub`.
  - Automatically extracts non-silent audio segments for faster AI processing.
  - Supports custom dBFS thresholding for better precision.
- **Fix: Extreme Audio Processing (9h+) Support**
  - Implemented 8kHz ultra-low memory decoding in `App.jsx`.
  - Added aggressive tensor garbage collection and yielding for 9-hour, 400MB M4A stability.
  - Reduced memory peak during decoding by 90% (from 11GB down to ~1GB).
- 中文總結：新增 Python 預處理工具，並修復了 9 小時超長音檔分析崩潰的問題，將解碼採樣率降至 8kHz 以維持系統穩定。

### [2025-05-23] AI 分析時間線與互動增強 (AI Analysis Timeline & Interaction)
- **智慧事件持久化**: 將 AI 辨識到的聲音事件（打呼、夢話等）儲存於 IndexedDB。
- **分析報告時間線**: 在歷史報告中新增「智慧辨識時間線」，可依時間軸查看所有偵測到的事件及其信心度。
- **點擊跳轉播放**: 實作時間線與波形圖聯動，點擊特定事件即可自動跳轉並播放該時段音訊。
- **外部音檔智慧分析**: 新增匯入功能，支援上傳 MP3/WAV/M4A 檔案，並在本地端進行自動化聲音標記分析。
- **數據關聯邏輯**: 確保 AI 事件與對應的錄音 Session ID 綁定，支援完整刪除。
- **UI 優化**: 報告頁面新增滾動式時間線組件，並支援事件偏移時間顯示。
- 中文總結：實作了 AI 事件持久化、點擊時間線跳轉，以及外部音檔匯入分析功能。

### [2024-05-22] 歷史分析系統 (History & Analysis System)
- **IndexedDB 整合**: 實作本地音訊切片儲存，支援長效錄音。
- **音訊波形視覺化**: 整合 `wavesurfer.js` 實現歷史錄音的回覽波形。
- **分析報告頁面**: 建立詳細的監測報告 UI，包含數據統計與檔案導出。
- 中文總結：整合了 IndexedDB 與波形圖，提供完整的歷史報告功能。

### [2024-05-21] AI 分析引擎整合 (AI Analysis Engine Integration)
- **TensorFlow.js 整合**: 引入 `@tensorflow/tfjs` 與 `@tensorflow-models/speech-commands`。
- **即時聲音辨識**: 實作聲音分類邏輯，支援打呼與背景噪音辨識。
- **AI 控制開關**: 新增 UI 開關以啟用/禁用本地 AI 分析。
- 中文總結：導入 TensorFlow.js 實現本地端聲音辨識功能。

## [2026-03-11] WebCodecs 串流音訊分析 (WebCodecs Streaming Analysis)

### Added
- **WebCodecs 串流音訊分析 (Streaming Audio Analysis)**: 
  - 捨棄傳統 `decodeAudioData` (一次性載入)，改用 `AudioDecoder` 與 `mp4box.js` 實作低記憶體消耗的串流解碼。
  - 支援高達 9 小時以上之長音檔，記憶體佔用保持在極低水平。
  - 實作了 **Backpressure (背壓)** 機制與即時記憶體釋放 (`AudioData.close()`)，有效防止瀏覽器崩潰。
- **Chunked AI Analysis**: `AIEngine` 現在支援處理串流 PCM 數據塊，並能維持分析精準度。

### Fixed
- 修正了在處理超大型 M4A 檔案時，因 V8 Heap 記憶體溢位導致的分頁崩潰問題。
- 修正了 `mp4box.js` 在 ESM 環境下的導入路徑問題。
- 恢復並優化了 UI 中的分析進度條顯示。

**中文說明：實作了 WebCodecs 串流解碼技術，讓 9 小時的長音檔也能在不崩潰的情況下進行低記憶體分析。**
