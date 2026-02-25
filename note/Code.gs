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
    let params;
    try {
      params = JSON.parse(e.postData.contents);
    } catch (parseError) {
      params = e.parameter;
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
      case 'delete_note':
        result = handleDeleteNote(params);
        break;
      default:
        throw new Error("Invalid Action");
    }

    // 2. CORS Response
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
  const allowedEmails = ["wj209ing@gmail.com"]; // 管理員 Email 白名單
  const userEmail = params.email;

  if (!userEmail || allowedEmails.indexOf(userEmail) === -1) {
    return { success: false, message: "存取被拒：您的帳號不在允許清單中" };
  }

  const token = Utilities.getUuid();
  const tokenSheet = SS.getSheetByName("_Meta_Tokens") || SS.insertSheet("_Meta_Tokens");
  
  // Ensure headers exist if new sheet
  if (tokenSheet.getLastRow() === 0) {
    tokenSheet.appendRow(["token", "created_at", "last_used_at"]);
  }
  
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
  if(!tokenSheet) return false;
  
  const data = tokenSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === token) {
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
  if(!sheet) return { success: true, notes: [] };

  const data = sheet.getDataRange().getValues();
  // Headers: uuid, order, title, content, tags, updated_at
  // (Assuming migration ran or new sheet created)
  
  // Dynamic column check:
  // If only 5 cols, it's old schema. If 6, new.
  // Ideally setup.gs migration handles this, but let's be safe.
  const hasTitle = (data[0] && data[0][2] === 'title');

  const notes = [];
  for (let i = 1; i < data.length; i++) {
    let note = {};
    if (hasTitle) {
      note = {
        uuid: data[i][0],
        order: Number(data[i][1]),
        title: data[i][2],
        content: data[i][3],
        tags: data[i][4],
        updated_at: data[i][5]
      };
    } else {
      // Legacy mapping fallback
      note = {
        uuid: data[i][0],
        order: Number(data[i][1]),
        title: "",
        content: data[i][2],
        tags: data[i][3],
        updated_at: data[i][4]
      };
    }
    notes.push(note);
  }

  notes.sort((a, b) => a.order - b.order);

  return { success: true, notes: notes };
}

function handleAddNote(params) {
  if (!validateToken(params.token)) return { success: false, error: "Unauthorized" };

  const sheet = SS.getSheetByName("Notes");
  const uuid = Utilities.getUuid();
  const lastRow = sheet.getLastRow();
  
  let newOrder = 1;
  if (lastRow > 1) {
    // Order col is always index 2 (column B)
    const orders = sheet.getRange(2, 2, lastRow - 1, 1).getValues().flat();
    const maxOrder = Math.max(...orders);
    newOrder = maxOrder + 1;
  }

  const tags = JSON.stringify(params.tags || []);
  const now = new Date();
  
  // uuid, order, title, content, tags, updated_at
  sheet.appendRow([uuid, newOrder, params.title || "", params.content, tags, now]);

  return { success: true, note: { uuid, order: newOrder, title: params.title || "", content: params.content, tags: params.tags, updated_at: now } };
}

function handleUpdateNote(params) {
  if (!validateToken(params.token)) return { success: false, error: "Unauthorized" };

  const sheet = SS.getSheetByName("Notes");
  const data = sheet.getDataRange().getValues();
  const rowIndex = data.findIndex(row => row[0] === params.uuid);

  if (rowIndex === -1) return { success: false, error: "Note not found" };

  const rowNum = rowIndex + 1;
  const now = new Date();
  
  // uuid(1), order(2), title(3), content(4), tags(5), updated_at(6)
  sheet.getRange(rowNum, 3).setValue(params.title || "");
  sheet.getRange(rowNum, 4).setValue(params.content);
  sheet.getRange(rowNum, 5).setValue(JSON.stringify(params.tags || []));
  sheet.getRange(rowNum, 6).setValue(now);

  return { success: true, updated_at: now };
}

function handleDeleteNote(params) {
  if (!validateToken(params.token)) return { success: false, error: "Unauthorized" };

  const sheet = SS.getSheetByName("Notes");
  const data = sheet.getDataRange().getValues();
  const rowIndex = data.findIndex(row => row[0] === params.uuid);

  if (rowIndex === -1) return { success: false, error: "Note not found" };

  // Delete row (rowIndex + 1)
  sheet.deleteRow(rowIndex + 1);

  return { success: true };
}

function handleReorderNotes(params) {
  if (!validateToken(params.token)) return { success: false, error: "Unauthorized" };
  
  const orderedUuids = params.ordered_uuids;
  if (!orderedUuids || orderedUuids.length === 0) return { success: false };

  const sheet = SS.getSheetByName("Notes");
  const data = sheet.getDataRange().getValues();
  
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
      orders.push([data[i][1]]);
    }
  }

  if (orders.length > 0) {
    sheet.getRange(2, 2, orders.length, 1).setValues(orders);
  }

  return { success: true };
}
