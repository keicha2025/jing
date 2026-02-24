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

**中文說明：** 將複製按鈕的「已複製」浮窗提示改為微交互設計，點擊後圖示從複製符號短暫變為打勾，1.5 秒後自動恢復，避免與手機原生提示重複。
