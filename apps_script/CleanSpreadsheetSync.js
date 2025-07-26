function transformMusicVideoData(data, isMusicIndex, lengthIndex) {
    const headers = data[0];
    const cleanHeaders = headers.slice(0, isMusicIndex);
    cleanHeaders.push('formatted_duration');
    
    const musicRows = data.slice(1)
        .filter(row => row[isMusicIndex] === true)
        .map(row => {
            const cleanRow = row.slice(0, isMusicIndex);
            const formattedDuration = formatDuration(row[lengthIndex]);
            cleanRow.push(formattedDuration);
            return cleanRow;
        });
    
    return { cleanHeaders, musicRows };
}

function syncCleanSpreadsheet() {
    try {
        const processedSheet = SpreadsheetApp.openById(getConfig('ENV.PROCESSED_SPREADSHEET_ID')).getSheets()[0];
        const cleanSheet = SpreadsheetApp.openById(getConfig('ENV.CLEAN_SPREADSHEET_ID')).getSheets()[0];
        
        const data = processedSheet.getDataRange().getValues();
        const isMusicIndex = getColumnIndex('IS_MUSIC_VIDEO');
        const lengthIndex = getColumnIndex('LENGTH');
        
        const { cleanHeaders, musicRows } = transformMusicVideoData(data, isMusicIndex, lengthIndex);
        
        cleanSheet.clear();
        cleanSheet.getRange(1, 1, 1, cleanHeaders.length).setValues([cleanHeaders]);
        
        if (musicRows.length > 0) {
            cleanSheet.getRange(2, 1, musicRows.length, cleanHeaders.length).setValues(musicRows);
        }
        
        Logger.log(`Synced ${musicRows.length} music videos to clean spreadsheet`);
        
    } catch (error) {
        Logger.log(`Error syncing clean spreadsheet: ${error.message}`);
        throw error;
    }
}
