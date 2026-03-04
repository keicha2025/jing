# JING Finance 響應式設計診斷報告 (Responsive Audit Report)

## 📌 診斷目標
針對 **Viewport Width < 400px** (例如 iPhone SE, 320px) 的極窄螢幕環境，找出影響操作與佈局的核心問題，並提出針對性的修復方案。

---

## 🛑 第一部分：佈局致命傷 (Critical Layout Bug List)

### 1. 導航列重疊與溢出 (Navbar)
- **現狀**：Logo 與三個導航項目 (`Home`, `Config`, `AI`) 在 350px 以下會發生重疊，且右側頭像與登出按鈕可能被擠出螢幕外。
- **原因**：採用固定 `justify-content: space-between` 且缺乏對導航文字標籤的隱藏邏輯。

### 2. 配置表格寬度擠壓 (Monthly Config Table)
- **現狀**：5 欄式的 Grid 佈局在窄螢幕下導致欄位剩不到 50px。
- **後果**：`Dropdown` 指標箭頭與文字重疊，輸入框寬度不足以顯示幣別後綴 (`.TW`)，點擊極其困難。

### 3. 多欄位規劃卡片 (Idle Funds Planning)
- **現狀**：6 欄式的 Grid 橫向排列。
- **後果**：在 320px 寬度下，日期選擇器 (`input type="month"`) 縮減至無法顯示內容，金額輸入框溢出。

### 4. 字體與間距佔比過高
- **現狀**：大標題 (`h1`) 在窄螢幕仍維持近 `2.5rem`。
- **後果**：標題發生垂直單字換行，佔據超過一屏高度，核心操作區被推至下方。

---

## 💡 第二部分：UX 優化與實作建議 (Solution Strategy)

### 1. 採用「減法設計」
- 在 480px 以下，自動隱藏導航項目的文字，僅保留圖示 (Icons only)。
- 減少 `glass-card` 的內距 (Padding: 1.5rem -> 1rem)。

### 2. 佈局轉向 (Grid to Flex Stack)
- 當寬度不足以容納 4 欄以上時，強制將 `grid-template-columns` 設為 `1fr`。
- 每筆投資標的從「行 (Row)」轉化為「卡片 (Card)」。

### 3. 動態流體字體 (Fluid Typography)
- 使用 `clamp()` 函數定義標題字級，確保在 320px 到 1200px 之間平滑縮放。

---

## 🛠️ 第三部分：CSS 實作範例

```css
/* 建議新增的響應式斷點 */
@media (max-width: 480px) {
  :root {
    --page-padding: 1rem;
    --title-size: clamp(1.2rem, 5vw, 1.8rem);
  }
}

/* 表格卡片化 */
.investment-row-mobile {
  display: flex !important;
  flex-direction: column;
  gap: 0.75rem;
}
```

---

## ✅ 第四部分：檢查清單 (Post-fix Checklist)
- [ ] 320px 下無橫向滾動軸。
- [ ] 導航圖示具備足夠點擊間距。
- [ ] 所有輸入框在手機鍵盤彈出後仍可視。
- [ ] 圖表在窄螢幕下自動縮放且 Legend 正確排序。

---
*Reported by Antigravity UX Audit Agent*
