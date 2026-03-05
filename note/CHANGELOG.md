# Changelog

All notable changes to the note project will be documented in this file.

---

## 2026-02-09T16:17:00+08:00

### Summary
Implemented micro-interaction for copy button to replace toast notification with icon transition feedback.

### Technical Details

**Modified Files:**
- `index.html`
- `.gitignore`

**Implementation:**
1. Replaced toast notification (`showToast`) with icon transition micro-interaction
2. Added unique ID (`copy-btn-{uuid}`) to each copy button for JavaScript targeting
3. Implemented `copyToClipboard(text, uuid)` function to:
   - Change icon from `content_copy` to `check` on click
   - Automatically revert back to `content_copy` after 1.5 seconds
   - Maintain brand color consistency (removed green color change)
4. Added CSS transition (`transition-all duration-200`) for smooth icon switching

**User Experience Impact:**
- Eliminates duplicate notifications (custom toast + native mobile clipboard notification)
- Provides immediate visual feedback through icon change
- Maintains clean, minimal UI without intrusive overlays
- Follows modern micro-interaction design patterns

**Affected Components:**
- Copy button in note card view mode (line 470-472)
- `copyToClipboard()` utility function (line 720-737)

**Migration Notes:**
None. This is a pure UI enhancement with no breaking changes or data structure modifications.

---


---

## 2026-03-05T13:55:00+08:00

### Summary
Fixed critical script loading issues and PWA deprecation warnings in the note application.

### Technical Details
**Modified Files:**
- `note/index.html`

**Implementation:**
1. Updated script, manifest, and service worker paths from relative to absolute paths (`/note/`) to ensure stability across different URL versions.
2. Resolved `firebaseConfig is not defined` error caused by `config.js` failing to load (404-as-HTML issue).
3. Added `<meta name="mobile-web-app-capable" content="yes">` to resolve PWA deprecation warnings.
4. Corrected path references for manifest and service worker registration to `/note/` root.

**User Experience Impact:**
- Application now loads correctly regardless of whether the URL ends with a trailing slash.
- Restored authentication and persistent data fetching by ensuring configuration integrity.
- Resolved browser warnings in console and tab metadata.

**Affected Components:**
- Page Header (meta tags, script tags)
- App Initialization (Service Worker, manifest linking)

**Migration Notes:**
None.

---

**中文說明：** 修復了筆記應用程式中因相對路徑引用錯誤導致的 `config.js` 載入失敗與 Firebase 配置遺失問題。同步更新了 PWA 標籤並確保在各種 URL 格式下資源都能正確載入。

