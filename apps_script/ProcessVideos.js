// const GEMINI_API_KEY = ''; // Store this in Script Properties

// Configuration constants
const CONFIG = {
  SOURCE_SHEET_NAME: 'Raw Videos',
  PROCESSED_SHEET_NAME: 'Processed Videos',
  BATCH_SIZE: 10,
  WAIT_TIME: 65000,
  MIN_DURATION_SECONDS: 120,
  GEMINI_MODEL: 'gemini-pro',
  API_VERSION: 'v1beta'
};

function setupProcessedSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let processedSheet = spreadsheet.getSheetByName(CONFIG.PROCESSED_SHEET_NAME);
  
  if (!processedSheet) {
    processedSheet = spreadsheet.insertSheet(CONFIG.PROCESSED_SHEET_NAME);
    processedSheet.getRange(1, 1, 1, 8).setValues([[
      'video_id', 
      'title', 
      'length', 
      'published_date', 
      'description', 
      'category_id', 
      'category_name',
      'is_music_video'
    ]]);
  }
  return processedSheet;
}

function parseISO8601Duration(duration) {
  const matches = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!matches) return 0;
  
  const hours = parseInt(matches[1] || 0);
  const minutes = parseInt(matches[2] || 0);
  const seconds = parseInt(matches[3] || 0);
  
  return hours * 3600 + minutes * 60 + seconds;
}

async function classifyVideoWithGemini(title, description) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  const url = `https://generativelanguage.googleapis.com/${CONFIG.API_VERSION}/models/${CONFIG.GEMINI_MODEL}:generateContent`;
  
  const prompt = `Analyze this YouTube video's title and description and classify if it's a music video/performance or not.
  
  Title: ${title}
  Description: ${description}
  
  Respond in this exact format:
  <CLASSIFICATION>MUSIC</CLASSIFICATION> or <CLASSIFICATION>NON_MUSIC</CLASSIFICATION>
  
  Guidelines:
  - MUSIC: If it's a music performance, concert, song, or music-related content
  - NON_MUSIC: If it's a lecture, interview, talk, discussion, or non-musical content`;
  
  const requestBody = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }]
  };
  
  const options = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    payload: JSON.stringify(requestBody)
  };
  
  try {
    const response = JSON.parse(UrlFetchApp.fetch(url, options));
    const result = response.candidates[0].content.parts[0].text.trim();
    
    // Extract classification from XML-like tags
    const match = result.match(/<CLASSIFICATION>(MUSIC|NON_MUSIC)<\/CLASSIFICATION>/);
    if (!match) {
      Logger.log(`Invalid classification format received: ${result}`);
      return null;
    }
    
    return match[1] === 'MUSIC';
  } catch (error) {
    Logger.log(`Error classifying video: ${error}`);
    return null;
  }
}

function processVideos() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = spreadsheet.getSheetByName(CONFIG.SOURCE_SHEET_NAME);
  const processedSheet = setupProcessedSheet();
  
  // Get existing processed video IDs
  const processedData = processedSheet.getDataRange().getValues();
  const processedVideoIds = new Set(processedData.slice(1).map(row => row[0]));
  
  // Get source data
  const sourceData = sourceSheet.getDataRange().getValues();
  const videos = sourceData.slice(1);
  
  // Process videos in batches
  for (let i = 0; i < videos.length; i += CONFIG.BATCH_SIZE) {
    const batch = videos.slice(i, i + CONFIG.BATCH_SIZE);
    processBatch(batch, processedSheet, processedVideoIds);
    
    if (i + CONFIG.BATCH_SIZE < videos.length) {
      Utilities.sleep(CONFIG.WAIT_TIME);
    }
  }
}

function processBatch(batch, processedSheet, processedVideoIds) {
  batch.forEach(async function(video) {
    const videoId = video[0];
    const duration = video[2];
    
    // Skip if already processed or too short
    if (processedVideoIds.has(videoId) || parseISO8601Duration(duration) < CONFIG.MIN_DURATION_SECONDS) {
      return;
    }
    
    const isMusicVideo = await classifyVideoWithGemini(video[1], video[4]);
    if (isMusicVideo === null) {
      Logger.log(`Skipping video ${videoId} due to classification error`);
      return;
    }
    
    // Only add music videos
    if (isMusicVideo) {
      processedSheet.appendRow([...video, true]);
    }
  });
}

function createDailyProcessingTrigger() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  // Create new daily trigger to run after the raw data is updated
  ScriptApp.newTrigger('processVideos')
    .timeBased()
    .everyDays(1)
    .atHour(2) // Run at 2 AM
    .create();
  
  Logger.log('Daily processing trigger created successfully');
}

function setup() {
  setupProcessedSheet();
  createDailyProcessingTrigger();
} 