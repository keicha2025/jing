# 網頁原生組件汰換診斷報告 ——從「原生預設」過渡到「自定義設計」

## 專案對象：Jing Lab Finance (strategy-box)
**診斷範圍**：`finance/src` 目錄下之所有 React 組件與樣式表。

---

## 第一部分：原生組件分布清單 (Discovery List)

經由代碼審查與系統搜尋，目前 `finance` 專案中仍存在的原生組件如下：

| 組件類型 | 實作關鍵字 | 數量 | 所在位置 (範例) | 備註 |
| :--- | :--- | :--- | :--- | :--- |
| **對話框** | `confirm()` | 2 | `AIAnalyst.tsx` (L225, L234) | 用於刪除確認與恢復預設值。 |
| **選擇器** | `<select>` | 3 | `AIAnalyst.tsx`, `MonthlyConfig.tsx` | 雖有 CSS 樣式修飾，但仍為原生行為。 |
| **輸入框** | `<input>` | 10+ | 各大頁面 (`Dashboard.tsx`, `MonthlyConfig.tsx`) | 使用 `.input-field` 半標準化樣式。 |
| **按鈕** | `<button>` | 20+ | 全域 | 混合使用 `.btn-*` 樣式與部屬的內聯 Inline Style。 |
| **檔案上傳** | `type="file"` | 0 | 未偵測到 | 目前暫無檔案上傳需求。 |

---

## 第二部分：UX 痛點分析 (UX Pain Points)

### 1. 視覺斷裂感 (Branding Disruption)
原生 `confirm()` 對話框會呼叫瀏覽器層級的 UI。在 `finance` 專案深色背景、玻璃擬態 (Glassmorphism) 的精緻設計下，突然彈出的系統白底對話框會造成強烈的視覺衝突，破壞「沉浸式體驗」。

### 2. JS 執行緒阻塞 (Process Blocking)
`window.confirm` 是 **同步 (Synchronous)** 阻塞的。當對話框彈出時，整個網頁的 UI 渲染與背景邏輯（如匯率更新、AI 分析）會全部停擺，這在當代 SPA 開發中是非常低階的做法，容易導致動畫卡頓或連線超時。

### 3. 表單互動限制
原生的 `<select>` 在移動端會觸發系統底部的選單，雖然方便，但在桌面端無法進行關鍵字搜尋 (Searchable Select) 或自定義分組圖示，對於資產配置中的眾多標的選擇，效率較低。

---

## 第三部分：組件轉換技術提案 (Technical Migration Proposal)

### 1. 對話框 (Dialogs) 異步化重構

**傳統做法 (同步)：**
```javascript
if (confirm('確定要刪除嗎？')) {
    doDelete();
}
```

**推薦做法 (Promisified Modal)：**
我們應封裝一個 `useConfirm` Hook 或全域 Modal 控制器。

```tsx
// 邏輯實作範例
const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    onResolve: (val: boolean) => void;
} | null>(null);

const askConfirm = (msg: string) => {
    return new Promise((resolve) => {
        setConfirmModal({ 
            show: true, 
            title: msg, 
            onResolve: (val) => { resolve(val); setConfirmModal(null); } 
        });
    });
};

// 使用端 (變得非常優雅)
const handleDelete = async () => {
    const isConfirmed = await askConfirm("確定要刪除此模式嗎？");
    if (isConfirmed) {
        // ... 執行刪除
    }
}
```

### 2. 選擇器組件 (Custom Select) 封裝
建議使用 `Headless UI` 或單純的 `React State` 來模擬下拉選單。
- **樣式控制**：使用 `absolute` 定位清單，套用 `backdrop-filter: blur(12px)`。
- **改進點**：當標的過多時，頂部加入一個小小的 Input 進行 `filter` 篩選。

---

## 第四部分：一致性優化建議 (Consistency Suggestions)

為了確保新組件完美融入現有 `Jing Lab` 視覺系統，請遵循以下 UI 規範：

### 1. 配色規範 (Color Palette)
- **主要色**：使用 `--primary: #6366f1` (Indigo Gradient)。
- **危險/警告色**：移除傳統紅色，改用 `--error: #64748b` (等深色調) 或配合專案目前的漸層色。
- **文字**：標題與確認按鈕應使用 `linear-gradient` 以強調層次感。

### 2. 物理效果 (Micro-interactions)
- **Modal 出現**：應伴隨 `scale(0.95) -> 1.0` 與 `opacity` 的轉場。
- **Button Hover**：應具備 `transform: translateY(-2px)` 與 Subtle Shadow 的提升感。

### 3. 一致性 Checkpoint
- **圓角 (Border Radius)**：統一使用 `1.5rem` (Card) 或 `0.75rem` (Component)。
- **邊框 (Border)**：統一使用 `1px solid rgba(255, 255, 255, 0.05)`。
- **陰影 (Shadow)**：使用 `box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.5)` 提供深度。

---

### 下一步建議
1.  **實作全域對話框控制器**：先處理 `AIAnalyst.tsx` 中的 `confirm` 呼叫。
2.  **建立 `Dropdown` 元件庫**：替換 `MonthlyConfig.tsx` 中的月份與幣別選擇。
3.  **標準化按鈕樣式**：清理內聯 Inline Style，統一回歸 `index.css` 的定義類別。
