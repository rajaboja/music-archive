function deleteAllTriggers() {
  const allTriggers = ScriptApp.getProjectTriggers();
  allTriggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  Logger.log(`Deleted ${allTriggers.length} existing triggers`);
}

function setup() {
  try {
    deleteAllTriggers();
    
    // From Code.js
    setupSourceSheet();
    
    // From ProcessVideos.js
    setupProcessing();
    
    // From ManageYouTubePlaylist.js
    setupPlaylist();
    
    // From CleanSpreadsheetSync.js
    setupCleanSpreadsheetTrigger();
    
    Logger.log('Setup completed successfully');
  } catch (error) {
    Logger.log('Setup failed: ' + error.message);
    throw error;
  }
} 