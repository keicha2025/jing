# NightWhisper 部署指南

這份文件將引導您如何在終端機 (Terminal) 中，將 `NightWhisper` 專案更新並部署至 **GitHub Pages** 以及 **Firebase Hosting**。

---

## 🚀 部署至 GitHub Pages

目前的 GitHub Pages 直接讀取自您 `main` 分支的根目錄。只要將修改好的程式碼 Push 到 GitHub 上，GitHub Pages 就會自動（或由 Action）幫您更新網頁。

### 操作步驟：

打開終端機，確保您在 `jing` 專案的根目錄下（例如：`cd ~/Downloads/jing`），接著依序執行以下三個 Git 指令：

```bash
# 1. 將包含 nightwhisper 內的檔案的所有變更加入暫存區
git add nightwhisper/

# 2. 提交這次的修改版本與附記 (引號內可替換為實際更新內容)
git commit -m "feat(nightwhisper): 更新新版分析引擎與 PWA 版本號"

# 3. 推送修改到 GitHub (完成後約 1~2 分鐘，網頁就會自動更新)
git push
```

**⚠️ PWA 注意事項：**
因為 NightWhisper 是 Progressive Web App (PWA)，為了確保使用者的瀏覽器能立刻抓到新版，每次更新檔案前，請記得去 `index.html` 以及 `sw.js` 裡替換 `?v=版本號`。使用者重整頁面時才會主動抓取新的 JS/CSS 內容。

---

## 🔥 部署至 Firebase Hosting

在您的專案根目錄中，已經有一支名為 `full_deploy.sh` 的腳本。這支腳本會自動將專案內所有的子系統（包含 `nightwhisper`）複製到 `dist_release` 資料夾中，並且一次性部署上 Firebase。

### 操作步驟：

1. 一樣請開啟終端機並切換到 `jing` 專案根目錄：
   ```bash
   cd ~/Downloads/jing
   ```

2. 執行全面部署腳本：
   ```bash
   ./full_deploy.sh
   ```

**執行過程中腳本會自動完成以下事項：**
- 建立並打包所有需要編譯的子專案 (如 pdf-tool, travel-planner 等)
- 將 `nightwhisper` 資料夾直接拷貝至 `dist_release/nightwhisper` 中
- 透過 `npx firebase-tools deploy` 幫您將整個 `dist_release` 推送到 Firebase (`jing-lab.web.app`)

如只希望針對 **單一專案 (例如剛改好的 NightWhisper)** 以最高效率更新到 Firebase（不想等其他專案打包），您可以獨立手動執行這兩段指令：

```bash
# 將最新的程式碼從來源資料夾覆蓋進去
cp -r nightwhisper dist_release/

# 單獨推上 Firebase Hosting
npx -y firebase-tools deploy --only hosting --project gen-lang-client-0428297574
```

---

## 總結
- **快速更新 GitHub (推薦用於開源展示版)**： `git add` -> `git commit` -> `git push`
- **更新 Firebase (推薦用於生產環境)**： 執行根目錄的 `./full_deploy.sh` 腳本。
