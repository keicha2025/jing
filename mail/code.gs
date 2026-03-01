/**
 * 服務頁面入口
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Minimalist Email Generator')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * 處理 POST 請求 (跨域 API)
 */
function doPost(e) {
  var result;
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.action === 'getUserAliases') {
      result = getUserAliases();
    } else if (data.action === 'sendEmail') {
      result = sendEmail(data);
    } else if (data.action === 'checkAccess') {
      result = checkAccess(data.email);
    } else {
      throw new Error("Invalid action: " + data.action);
    }
  } catch (error) {
    result = { success: false, message: error.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 檢查使用者是否有權限 (白名單在伺服器端)
 */
function checkAccess(email) {
  // 白名單定義在伺服器端，不對外洩露
  const ALLOWED_EMAILS = [
    'wj209ing@gmail.com',
    'scu13115137@gmail.com'
  ];
  
  const isAllowed = ALLOWED_EMAILS.includes(email);
  return { 
    success: isAllowed, 
    message: isAllowed ? "驗證成功" : "驗證失敗：您無權存取此工具" 
  };
}

/**
 * 取得使用者的 Gmail 別名
 * 強制將 scu13115137@gmail.com 排在第一位 (預設)
 */
function getUserAliases() {
  const targetEmail = 'scu13115137@gmail.com';
  let aliases = [];
  
  try {
    const rawAliases = GmailApp.getAliases();
    const primary = Session.getActiveUser().getEmail();
    aliases = [primary, ...rawAliases];
  } catch (e) {
    console.warn("開發模式：使用模擬別名");
    aliases = [targetEmail, 'user@example.com', 'admin@test.com'];
  }

  // 排序邏輯：優先置頂目標信箱
  const targetIndex = aliases.indexOf(targetEmail);
  if (targetIndex > -1) {
    aliases.splice(targetIndex, 1);
    aliases.unshift(targetEmail);
  }

  return aliases;
}

/**
 * 寄送郵件並紀錄到試算表
 */
function sendEmail(data) {
  try {
    const { recipient, subject, htmlBody, from, senderName, cc, bcc, body } = data;
    
    if (!recipient || !subject || !htmlBody) {
      throw new Error("缺少必要資訊 (收件人、主旨或內容)");
    }

    const options = {
      htmlBody: htmlBody,
      from: from,
      cc: cc,
      bcc: bcc,
      name: senderName || from // 若無名稱則使用 Email
    };

    GmailApp.sendEmail(recipient, subject, "您的裝置不支援 HTML 預覽，請使用瀏覽器查看。", options);

    // 紀錄到試算表
    logEmailToSheet(data);

    return { success: true, message: "信件已成功發送並紀錄！" };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * 紀錄郵件資訊至試算表
 */
function logEmailToSheet(data) {
  try {
    var ssId = PropertiesService.getScriptProperties().getProperty('LOG_SHEET_ID');
    var ss;
    
    if (ssId) {
      try {
        ss = SpreadsheetApp.openById(ssId);
      } catch(e) {
        ss = null;
      }
    }
    
    if (!ss) {
      // 建立新的試算表並儲存 ID
      ss = SpreadsheetApp.create('Minimalist Email Studio Logs');
      PropertiesService.getScriptProperties().setProperty('LOG_SHEET_ID', ss.getId());
    }
    
    var sheet = ss.getSheets()[0];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['時間戳記', '寄件帳號', '顯示名稱', '收件人', '副本', '密件副本', '主旨', '內文摘要']);
      sheet.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#f3f3f3');
      sheet.setFrozenRows(1);
    }
    
    sheet.appendRow([
      new Date(),
      data.from,
      data.senderName,
      data.recipient,
      data.cc,
      data.bcc,
      data.subject,
      data.body ? data.body.substring(0, 500) : ''
    ]);
  } catch (e) {
    console.error("試算表寫入失敗: " + e.toString());
  }
}

function authorize() {
  // 手動觸發權限用
  GmailApp.getAliases();
  Session.getActiveUser().getEmail();
  SpreadsheetApp.getActiveSpreadsheet();
}