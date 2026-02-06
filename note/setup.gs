function initSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. _Meta_Tokens Sheet (Hidden System Sheet)
  let tokenSheet = ss.getSheetByName("_Meta_Tokens");
  if (!tokenSheet) {
    tokenSheet = ss.insertSheet("_Meta_Tokens");
    // Columns: device_token, created_at, last_used
    tokenSheet.appendRow(["device_token", "created_at", "last_used"]);
    tokenSheet.setFrozenRows(1);
    tokenSheet.hideSheet();
  }

  // 2. Notes Sheet (Main Data)
  let noteSheet = ss.getSheetByName("Notes");
  if (!noteSheet) {
    noteSheet = ss.insertSheet("Notes");
    // Columns: uuid, order, title, content, tags, updated_at
    noteSheet.appendRow(["uuid", "order", "title", "content", "tags", "updated_at"]);
    noteSheet.setFrozenRows(1);
    
    // Set column width for content
    noteSheet.setColumnWidth(4, 300); // content is now col 4
  } else {
    // Basic Migration: Check if 'title' exists (Check header count)
    const lastCol = noteSheet.getLastColumn();
    // Originally 5 cols (uuid, order, content, tags, updated_at)
    // New 6 cols. If 5, insert 'title' at index 3 (Column C)
    if (lastCol === 5) {
      noteSheet.insertColumnAfter(2); // After 'order'
      noteSheet.getRange("C1").setValue("title");
    }
  }
}
