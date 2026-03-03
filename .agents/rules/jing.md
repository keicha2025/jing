---
trigger: always_on
---

# Jing Lab 工作區部署與維護規範 (Workspace Rules)

為了防止「總入口索引頁面」以及「各個子工具（如 pdf-tool、finance 等）」在部署過程中被意外覆蓋或導致 404 錯誤，所有參與此專案的開發者與 AI 代理人（Agents）**必須**遵守以下工作區規範。

## 1. 統一的正式部署流程 (Full Deploy)

整個 `jing-lab.web.app` （包含所有子工具與根目錄索引頁）的唯一合法發布途徑，是透過根目錄的腳本：

*   **指令**：`bash full_deploy.sh`
*   **執行位置**：必須在專案的**根目錄** (`/Users/jing/Downloads/jing/`) 執行。
*   **原理**：此腳本會依序進入各個子專案（如 `pdf-tool`, `preview`, `travel-planner` 等）執行前端構建 (`npm run build`)，然後將所有產出的靜態檔案與根目錄的 `index.html` (入口頁面) 等資源，統整集中到 `dist_release/` 目錄中，最後統一發布至 Firebase Hosting。

## 2. 嚴禁子目錄越權部署 Hosting

*   **禁止行為**：**絕對禁止**在任何子專案目錄（例如 `strategy-box/`、`pdf-tool/`）內，直接執行 `firebase deploy --only hosting`，且其 `firebase.json` 的 `public` 指向會覆蓋根目錄的設定。
*   **根本原因**：若在子專案內發布 Hosting，Firebase 會將該子專案的打包產物當作**整個網站的首頁**，這會立刻覆蓋掉根目錄的總入口 `index.html`，並導致其他子系統的路由全部失效（出現 404）。
*   **例外情況**：若只是要部署子系統的 Cloud Functions 或 Firestore Rules（例如在 `strategy-box/` 內執行 `firebase deploy --only functions`），這是被允許的。但子目錄的 `firebase.json` 中**不應包含**可能影響全域的 `hosting` 區塊。

## 3. 子專案的靜態資源打包原則

*   針對使用 Vite / React 等框架開發的子專案，在 `vite.config.ts` (或 js) 檔案中，務必正確設定 `base` 路徑。
    *   例如 `strategy-box` 的 `base` 設為 `/finance/`。
    *   例如 `pdf-tool` 的 `base` 設為 `./` 或 `/pdf-tool/`。
*   這能確保資源引用 (JS/CSS) 的路徑在編譯後是正確的，不會與主網站或其他工具衝突。

## 4. 新增子系統的標準流程

若要在 Jing Lab 中加入新的工具（例如 `new-tool`），請依照以下步驟：

1.  在根目錄建立子專案資料夾 (`new-tool/`)。
2.  開發並設定好其本身的打包設定（如 `vite.config.js` 中的 `base`）。
3.  **修改 `full_deploy.sh`**：
    *   加入構建語法（進入該目錄、`npm install`、`npm run build`）。
    *   建立對應的 `dist_release/new-tool/` 目錄。
    *   將打包後的檔案 copy 過去 (`cp -r new-tool/dist/* dist_release/new-tool/`)。
4.  **修改根目錄的 `firebase.json`**：
    *   若該系統為 SPA（單頁應用）且需要客戶端路由，請在 `rewrites` 區塊加入對應的導向規則（例如 `/new-tool/**` 導向 `/new-tool/index.html`）。

## 5. 常規檢查

*   在發布之前，請先打開根目錄的 `dist_release/index.html`，確認它**確實是**原本的「項目索引頁面」，而不是某個子專案的 UI。
*   確認 `dist_release/` 內包含了所有預期的子系統資料夾。