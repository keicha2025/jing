/**
 * SheetDB.js
 * 
 * Helper to treat Sheets as Tables.
 * Requires columns in Row 1.
 */

const SCRIPT_PROP = PropertiesService.getScriptProperties();

const SheetDB = {
    getSpreadsheet: function () {
        // If we have a stored ID, use it. Otherwise use Active (bound script).
        // Ideally put the Sheet ID in Script Properties 'SHEET_ID'
        const id = SCRIPT_PROP.getProperty('SHEET_ID');
        if (id) return SpreadsheetApp.openById(id);
        return SpreadsheetApp.getActiveSpreadsheet();
    },

    load: function () {
        // Reads all tables into memory (Careful with large datasets!)
        // Returns { users: [...], trips: [...] }
        const ss = this.getSpreadsheet();
        const result = {};
        const tabs = ['Users', 'Trips', 'Days', 'Spots', 'Accommodations', 'Flights', 'SpotTypes'];

        tabs.forEach(tabName => {
            const sheet = ss.getSheetByName(tabName);
            if (!sheet) {
                result[tabName.toLowerCase()] = [];
                return;
            }
            const data = sheet.getDataRange().getValues();
            const headers = data[0];
            const rows = data.slice(1);

            result[tabName.toLowerCase()] = rows.map(row => {
                const obj = {};
                headers.forEach((h, i) => {
                    obj[h] = row[i];
                });
                return obj;
            });
        });

        return result;
    },

    insert: function (tabName, dataObj) {
        const ss = this.getSpreadsheet();
        let sheet = ss.getSheetByName(tabName);
        if (!sheet) throw new Error("Sheet not found: " + tabName);

        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        const newRow = headers.map(h => {
            // Handle dates or specific types if needed
            return dataObj[h] !== undefined ? dataObj[h] : "";
        });

        sheet.appendRow(newRow);
        return dataObj;
    },

    update: function (tabName, idField, idValue, updateData) {
        // This is O(N) scan.
        const ss = this.getSpreadsheet();
        const sheet = ss.getSheetByName(tabName);
        const data = sheet.getDataRange().getValues();
        const headers = data[0];
        const idIndex = headers.indexOf(idField);

        if (idIndex === -1) throw new Error("ID field not found: " + idField);

        for (let i = 1; i < data.length; i++) {
            if (String(data[i][idIndex]) === String(idValue)) {
                // Found row
                const rowNum = i + 1;
                headers.forEach((h, colIdx) => {
                    if (updateData[h] !== undefined) {
                        sheet.getRange(rowNum, colIdx + 1).setValue(updateData[h]);
                        // update local result
                        data[i][colIdx] = updateData[h];
                    }
                });

                // Return updated object
                const result = {};
                headers.forEach((h, colIdx) => {
                    result[h] = data[i][colIdx];
                });
                return result;
            }
        }
        throw new Error("Record not found to update");
    },

    deleteRow: function (tabName, idField, idValue) {
        const ss = this.getSpreadsheet();
        const sheet = ss.getSheetByName(tabName);
        const data = sheet.getDataRange().getValues();
        const headers = data[0];
        const idIndex = headers.indexOf(idField);

        for (let i = 1; i < data.length; i++) {
            if (String(data[i][idIndex]) === String(idValue)) {
                sheet.deleteRow(i + 1);
                return;
            }
        }
    }
};
