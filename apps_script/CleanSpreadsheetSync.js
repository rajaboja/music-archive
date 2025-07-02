/**
 * Clean Spreadsheet Sync - Simple copy of true music videos
 */

function syncCleanSpreadsheet() {
    try {
        initializeConfig();
        
        const processedSheet = SpreadsheetApp.openById(getConfig('ENV.PROCESSED_SPREADSHEET_ID')).getSheets()[0];
        const cleanSheet = SpreadsheetApp.openById(getConfig('ENV.CLEAN_SPREADSHEET_ID')).getSheets()[0];
        
        // Get all data from processed sheet
        const data = processedSheet.getDataRange().getValues();
        const headers = data[0];
        const isMusicIndex = getColumnIndex('IS_MUSIC_VIDEO');
        
        // Clear clean sheet and set headers (without is_music_video column)
        cleanSheet.clear();
        const cleanHeaders = headers.slice(0, isMusicIndex);
        cleanSheet.getRange(1, 1, 1, cleanHeaders.length).setValues([cleanHeaders]);
        
        // Filter and copy only music videos (true rows)
        const musicRows = data.slice(1)
            .filter(row => row[isMusicIndex] === true)
            .map(row => row.slice(0, isMusicIndex)); // Remove is_music_video column
        
        if (musicRows.length > 0) {
            cleanSheet.getRange(2, 1, musicRows.length, cleanHeaders.length).setValues(musicRows);
        }
        
        Logger.log(`Synced ${musicRows.length} music videos to clean spreadsheet`);
        
    } catch (error) {
        Logger.log(`Error syncing clean spreadsheet: ${error.message}`);
        throw error;
    }
}

function setupCleanSpreadsheetTrigger() {
    initializeConfig();
    
    const processedSpreadsheet = SpreadsheetApp.openById(getConfig('ENV.PROCESSED_SPREADSHEET_ID'));
    
    // Remove existing triggers
    ScriptApp.getProjectTriggers().forEach(trigger => {
        if (trigger.getHandlerFunction() === 'syncCleanSpreadsheet') {
            ScriptApp.deleteTrigger(trigger);
        }
    });
    
    // Create new trigger - directly use syncCleanSpreadsheet as handler
    ScriptApp.newTrigger('syncCleanSpreadsheet')
        .on(processedSpreadsheet)
        .onChange()
        .create();
    
    Logger.log('Clean spreadsheet trigger setup completed');
    syncCleanSpreadsheet(); // Initial sync
}
