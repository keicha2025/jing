/* 
  Brand: Personal Material Manager
  Style: MUJI Minimialism
  Backend: Google Apps Script
*/

const SCRIPT_PROP = PropertiesService.getScriptProperties();
const SS = SpreadsheetApp.getActiveSpreadsheet();

// --- API Entry Points ---

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Personal Note Manager')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    // 1. CORS Hack: Parse text/plain body as JSON
    // When using fetch with 'application/json', browser sends OPTIONS preflight which GAS fails on.
    // We send as default (text/plain), so e.postData.contents contains the stringified JSON.
    let params;
    try {
      params = JSON.parse(e.postData.contents);
    } catch (parseError) {
      // Fallback if needed, or error out
      params = e.parameter; // For simple form posts
    }
    
    const action = params.action;
    let result = {};

    switch (action) {
      case 'login':
        result = handleLogin(params);
        break;
      case 'auth_check':
        result = handleAuthCheck(params);
        break;
      case 'get_notes':
        result = handleGetNotes(params);
        break;
      case 'add_note':
        result = handleAddNote(params);
        break;
      case 'update_note':
        result = handleUpdateNote(params);
        break;
      case 'reorder_notes':
        result = handleReorderNotes(params);
        break;
      default:
        throw new Error("Invalid Action");
    }

    // 2. CORS Response: Must use setMimeType(JSON)
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// --- Auth Handling ---

function handleLogin(params) {
  const masterPwd = SCRIPT_PROP.getProperty("MASTER_PWD");
  if (String(params.password) !== String(masterPwd)) {
    return { success: false, message: "Incorrect Password" };
  }

  const token = Utilities.getUuid();
  const tokenSheet = SS.getSheetByName("_Meta_Tokens");
  tokenSheet.appendRow([token, new Date(), new Date()]);

  return { success: true, token: token };
}

function handleAuthCheck(params) {
  if (validateToken(params.token)) {
    return { success: true };
  }
  return { success: false, message: "Invalid Token" };
}

function validateToken(token) {
  if (!token) return false;
  const tokenSheet = SS.getSheetByName("_Meta_Tokens");
  const data = tokenSheet.getDataRange().getValues();
  // Simple scan - for production with huge user base, use ID search logic
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === token) {
      // Update last used time
      tokenSheet.getRange(i + 1, 3).setValue(new Date());
      return true;
    }
  }
  return false;
}

// --- Data Handling ---

function handleGetNotes(params) {
  if (!validateToken(params.token)) return { success: false, error: "Unauthorized" };

  const sheet = SS.getSheetByName("Notes");
  const data = sheet.getDataRange().getValues();
  // Headers: uuid, order, content, tags, updated_at
  
  const notes = [];
  for (let i = 1; i < data.length; i++) {
    notes.push({
      uuid: data[i][0],
      order: Number(data[i][1]),
      content: data[i][2],
      tags: data[i][3],
      updated_at: data[i][4]
    });
  }

  // Sort by order
  notes.sort((a, b) => a.order - b.order);

  return { success: true, notes: notes };
}

function handleAddNote(params) {
  if (!validateToken(params.token)) return { success: false, error: "Unauthorized" };

  const sheet = SS.getSheetByName("Notes");
  const uuid = Utilities.getUuid();
  const lastRow = sheet.getLastRow();
  
  // New order = max order + 1
  // If empty (only header), order start at 1
  let newOrder = 1;
  if (lastRow > 1) {
    const orders = sheet.getRange(2, 2, lastRow - 1, 1).getValues().flat();
    const maxOrder = Math.max(...orders);
    newOrder = maxOrder + 1;
  }

  const tags = JSON.stringify(params.tags || []);
  const now = new Date();

  sheet.appendRow([uuid, newOrder, params.content, tags, now]);

  return { success: true, note: { uuid, order: newOrder, content: params.content, tags: params.tags, updated_at: now } };
}

function handleUpdateNote(params) {
  if (!validateToken(params.token)) return { success: false, error: "Unauthorized" };

  const sheet = SS.getSheetByName("Notes");
  const data = sheet.getDataRange().getValues();
  const rowIndex = data.findIndex(row => row[0] === params.uuid); // 0-indexed in array

  if (rowIndex === -1) return { success: false, error: "Note not found" };

  const rowNum = rowIndex + 1; // 1-indexed for Sheet
  const now = new Date();
  
  // uuid, order, content, tags, updated_at
  // We only update content, tags, updated_at
  sheet.getRange(rowNum, 3).setValue(params.content);
  sheet.getRange(rowNum, 4).setValue(JSON.stringify(params.tags || []));
  sheet.getRange(rowNum, 5).setValue(now);

  return { success: true, updated_at: now };
}

function handleReorderNotes(params) {
  if (!validateToken(params.token)) return { success: false, error: "Unauthorized" };
  
  const orderedUuids = params.ordered_uuids; // Array of UUIDs in new order
  if (!orderedUuids || orderedUuids.length === 0) return { success: false };

  const sheet = SS.getSheetByName("Notes");
  const data = sheet.getDataRange().getValues();
  
  // Map UUID to Row Index
  const uuidMap = {};
  for (let i = 1; i < data.length; i++) {
    uuidMap[data[i][0]] = i + 1;
  }

  // Update orders
  // To avoid writing cell by cell, we can read all orders, update array, write back
  // But here we need to update potentially sporadic rows. 
  // Optimization: Read all data, update order column in memory, write back entire order column.
  
  const updates = [];
  // data[i][0] is UUID, [i][1] is order.
  // We want to rewrite the order column (Column B).
  
  // Create a map for O(1) lookup of new order
  const newOrderMap = {};
  orderedUuids.forEach((uuid, index) => {
    newOrderMap[uuid] = index + 1;
  });

  const orders = [];
  for (let i = 1; i < data.length; i++) {
    const uuid = data[i][0];
    if (newOrderMap[uuid]) {
      orders.push([newOrderMap[uuid]]);
    } else {
      // Keep existing order if not in list (shouldn't happen ideally)
      orders.push([data[i][1]]);
    }
  }

  if (orders.length > 0) {
    sheet.getRange(2, 2, orders.length, 1).setValues(orders);
  }

  return { success: true };
}
