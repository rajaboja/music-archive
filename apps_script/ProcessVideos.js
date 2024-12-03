// Configuration constants
const CONFIG = {
    SOURCE_SHEET_NAME: 'Raw Videos',
    PROCESSED_SHEET_NAME: 'Processed Videos',
    VIDEOS_PER_REQUEST: 50,
    MIN_DURATION_SECONDS: 120,
    GEMINI_MODEL: 'gemini-1.5-flash-8b',
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
  
  function classifyVideosWithGemini(videos) {
    const apiKey = PropertiesService.getScriptProperties().getProperty('GOOGLE_API_KEY');
    const url = `https://generativelanguage.googleapis.com/${CONFIG.API_VERSION}/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${apiKey}`;
    
    // Format videos for the prompt
    const formattedVideos = videos.map((video, index) => {
      return `Video ${index + 1}:
      ID: ${video[0]}
      Title: ${video[1]}
      Description: ${video[4]}`
    }).join('\n\n');
    
    const prompt = `Analyze these YouTube videos and classify if each is a music video/performance or not.

${formattedVideos}

Guidelines for classification:
- Music: music performances, concerts, songs, music videos, live performances
- Non-music: lectures, interviews, talks, discussions, tutorials`;
    
    const responseSchema = {
      type: "array",
      items: {
        type: "object",
        properties: {
          video_id: {
            type: "string",
            description: "The ID of the YouTube video"
          },
          is_music: {
            type: "boolean",
            description: "true if the video is music-related, false otherwise"
          }
        },
        required: ["video_id", "is_music"]
      }
    };
    
    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    };
    
    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'payload': JSON.stringify(requestBody),
      'muteHttpExceptions': true
    };
    
    try {
      const response = JSON.parse(UrlFetchApp.fetch(url, options));
      const result = response.candidates[0].content.parts[0].text.trim();
      return JSON.parse(result);
    } catch (error) {
      Logger.log(`Error classifying videos batch: ${error}`);
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
    
    // Filter videos less than 2 minutes and not already processed
    const eligibleVideos = videos.filter(video => {
      const duration = parseISO8601Duration(video[2]);
      return duration >= CONFIG.MIN_DURATION_SECONDS && !processedVideoIds.has(video[0]);
    });
    
    for (let i = 0; i < eligibleVideos.length; i += CONFIG.VIDEOS_PER_REQUEST) {
      const videoBatch = eligibleVideos.slice(i, i + CONFIG.VIDEOS_PER_REQUEST);
      const classifications = classifyVideosWithGemini(videoBatch);
      
      if (classifications) {
        classifications.forEach(classification => {
          const video = videoBatch.find(v => v[0] === classification.video_id);
          if (video) {
            // Store all classified videos with their classification
            processedSheet.appendRow([...video, classification.is_music]);
          }
        });
      }
    }
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