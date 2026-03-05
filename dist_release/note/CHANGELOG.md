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


---

## 2026-03-05T13:50:00+08:00

### Summary
Refactored internal CSS components from Tailwind `@apply` to standard Vanilla CSS.

### Technical Details
**Modified Files:**
- `note/index.html`

**Implementation:**
1. Replaced Tailwind-specific `@apply` directives with equivalent standard CSS properties in the `<style>` block.
2. Manually mapped Tailwind utility classes (`bg-gray-100`, `ring-2`, etc.) to accurate hex color codes and CSS specifications.
3. Implemented pseudo-selector `:active` directly in CSS for better browser support and cleaner code.
4. Resolved IDE warnings regarding "Unknown at rule @apply" to ensure better tooling compatibility.

**User Experience Impact:**
- No visual changes in the UI.
- Improved rendering stability by reducing reliance on Tailwind's runtime CSS processing for custom components.

**Affected Components:**
- `.tap-feedback`, `del`, `ins`, `.note-card.editing`

**Migration Notes:**
None.

---

**中文說明：** 將筆記應用程式內部的 `@apply` 語法改寫為標準的 Vanilla CSS。這解除了 IDE 的警告，同時減少了對 Tailwind 執行期解析的依賴，使元件樣式更穩定。


