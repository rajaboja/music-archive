function runDailyWorkflow() {
  updateSpreadsheetDaily();
  processVideos();
  syncToYouTubePlaylist();
  syncCleanSpreadsheet();
  Logger.log('Daily workflow completed successfully');
}

function setup() {
  // Delete existing triggers
  const allTriggers = ScriptApp.getProjectTriggers();
  allTriggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  Logger.log(`Deleted ${allTriggers.length} existing triggers`);
  
  // Get configuration values
  const intervalDays = getConfig('TRIGGERS.INTERVAL_DAYS');
  const processedSpreadsheet = SpreadsheetApp.openById(getConfig('ENV.PROCESSED_SPREADSHEET_ID'));
  
  // Create daily workflow trigger
  ScriptApp.newTrigger('runDailyWorkflow')
    .timeBased()
    .everyDays(intervalDays)
    .atHour(1)
    .create();
  
  // Create spreadsheet triggers
  ScriptApp.newTrigger('syncToYouTubePlaylist')
    .forSpreadsheet(processedSpreadsheet)
    .onChange()
    .create();
  
  ScriptApp.newTrigger('syncCleanSpreadsheet')
    .forSpreadsheet(processedSpreadsheet)
    .onEdit()
    .create();
  
  Logger.log('Setup completed successfully');
}