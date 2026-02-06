/**
 * Setup.js
 * Run this function 'setupSheets' once to initialize the document.
 */

function setupSheets() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const sheets = [
        { name: "Users", headers: ["user_id", "username", "password", "display_name", "role", "created_at"] },
        { name: "Trips", headers: ["trip_id", "owner_id", "title", "start_date", "end_date", "cover_image", "is_template", "created_at"] },
        { name: "Days", headers: ["day_id", "trip_id", "day_order", "date", "weekday", "theme", "note"] },
        { name: "Spots", headers: ["spot_id", "day_id", "spot_order", "time", "type", "title", "note", "map_link", "created_at"] },
        { name: "Accommodations", headers: ["id", "trip_id", "name", "address", "check_in", "check_out", "map_link", "note"] },
        { name: "Flights", headers: ["id", "trip_id", "type", "flight_no", "airline", "dep_airport", "arr_airport", "dep_time", "arr_time", "duration", "baggage_checked", "baggage_carry_on"] },
        { name: "SpotTypes", headers: ["id", "code", "name", "icon", "order"] }
    ];

    for (const sheetConfig of sheets) {
        const tabName = sheetConfig.name;
        const headers = sheetConfig.headers;
        let sheet = ss.getSheetByName(tabName);
        if (!sheet) {
            sheet = ss.insertSheet(tabName);
            sheet.appendRow(headers);
            // Freeze header
            sheet.setFrozenRows(1);
            Logger.log("Created sheet: " + tabName);
        } else {
            Logger.log("Sheet already exists: " + tabName);
            // Optional: Verify headers
        }
    }

    // Create default admin user if not exists
    const usersSheet = ss.getSheetByName('Users');
    if (usersSheet.getLastRow() <= 1) {
        usersSheet.appendRow([Utilities.getUuid(), 'admin', 'admin1234', 'admin', 'Super Admin', new Date().toISOString()]);
        Logger.log("Created default admin user");
    }
}
