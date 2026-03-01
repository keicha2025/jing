# Jing Lab Design Language Specification

這份文件定義了 Jing Lab 專案索引頁面的核心設計語彙與視覺語言。

---

## 1. 基礎設計語彙 (Core Tokens)

| 類別 | 參數 | 對應 Tailwind / CSS | 備註 |
| :--- | :--- | :--- | :--- |
| **字體** | Inter, Noto Sans TC, sans-serif | `font-family: 'Inter', 'Noto Sans TC' ...` | 兼顧美觀與中文易讀性 |
| **字級 (常用)** | 標題: 20px (XL), 描述: 14px (SM) | `text-xl`, `text-sm`, `text-xs`, `text-[11px]` | 階層分明，強調資訊層次 |
| **色彩 (背景)** | Stone 50, Stone 100, #F8F8F7 | `bg-[#F8F8F7]`, `bg-stone-50`, `bg-stone-100` | 溫潤的暖灰色調 |
| **色彩 (文字)** | Stone 800 (內文), Stone 400 (副標) | `text-stone-800`, `text-stone-400`, `text-stone-900` | 低對比但清晰的閱讀體驗 |
| **色彩 (邊框)** | Stone 200 (60% 透明度) | `border-stone-200/60` | 極輕盈的線條分割 |
| **間距** | Container: 24px (px-6), Gap: 16px (gap-4) | `px-6`, `py-6`, `gap-4`, `mb-10` | 足夠的呼吸感 |
| **圓角** | Card: 12px (XL), Button: 12px/16px | `rounded-xl`, `rounded-2xl` | 現代科技感的圓潤風格 |

---

## 2. 玻璃擬態 (Glassmorphism)

專案採用「陶瓷質感」的玻璃效果，特別應用於標題列 (Header)：

*   **背景色**: `rgba(250, 250, 249, 0.85)` (Stone 50)
*   **模糊**: `backdrop-filter: blur(16px)`
*   **視覺感受**: 提供半透明的層次感，使內容滑動時具有優雅的透視效果。

---

## 3. 動效與使用者回饋 (Motion & Feedback)

優雅的互動感是高品質 Web App 的關鍵：

| 互動行為 | 效果說明 | 實作參數 |
| :--- | :--- | :--- |
| **卡片懸停 (Hover)** | 邊界加深、輕微陰影 | `transition-all duration-400 cubic-bezier(0.4, 0, 0.2, 1)` |
| **點擊反饋 (Active)** | 輕微縮小 3% | `transform: scale(0.97)` |
| **儲存按鈕彈出** | 自下方平滑滑入 | `cubic-bezier(0.16, 1, 0.3, 1)` |
| **搜尋框焦點** | 背景轉白與邊界加深 | `focus:bg-white focus:border-stone-400` |

---

## 4. 圖示與佈局規範

### 圖示規範 (Iconography)
*   **庫**: Lucide Icons
*   **粗細**: `stroke-[1.5px]`
*   **尺寸**: `w-4 h-4` (按鈕), `w-5 h-5` (主要圖示)
*   **視覺特色**: 採用細線條感，維持輕量視覺。

### 佈局原則 (Layout)
*   **容器**: 中央最大寬度 `max-w-5xl`。
*   **響應式**:
    *   Mobile: 單欄
    *   Tablet: 雙欄 (`sm:grid-cols-2`)
    *   Desktop: 三欄 (`lg:grid-cols-3`)
*   **安身點**: 支援 iOS `safe-area-inset-bottom` 墊底。

---

## 5. 設計建議補充

1.  **陰影使用 (Shadows)**: 僅在重要動作（如儲存）或頂層卡片使用 `shadow-sm` 或 `shadow-2xl`。
2.  **微動態 (Micro-interactions)**: 所有 `transition` 應盡量使用 `cubic-bezier` 而非預設的 `linear` 或 `ease`，以提升產品的「Premium」感。

---
*這份文件由 Antigravity 自動生成。*
中文補充：這是一份基於現有程式碼萃取的設計系統規範，旨在確保未來新功能的視覺統一性與優雅感。
