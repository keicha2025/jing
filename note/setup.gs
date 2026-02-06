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
    // Columns: uuid, order, content, tags, updated_at
    noteSheet.appendRow(["uuid", "order", "content", "tags", "updated_at"]);
    noteSheet.setFrozenRows(1);
    
    // Set column width for content
    noteSheet.setColumnWidth(3, 300);
  }
}
