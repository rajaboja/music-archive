// Configuration constants
const CONFIG = {
    VIDEOS_PER_REQUEST: 50,
    MIN_DURATION_SECONDS: 120,
    GEMINI_MODEL: 'gemini-1.5-flash-8b',
    API_VERSION: 'v1beta',
    SHEETS: {
        SOURCE: {
            ID: null // Will be loaded from environment
        },
        PROCESSED: {
            ID: null // Will be loaded from environment
        }
    }
};
  
function loadConfig() {
    const properties = PropertiesService.getScriptProperties();
    CONFIG.SHEETS.SOURCE.ID = properties.getProperty('SOURCE_SPREADSHEET_ID');
    CONFIG.SHEETS.PROCESSED.ID = properties.getProperty('PROCESSED_SPREADSHEET_ID');
    
    if (!CONFIG.SHEETS.SOURCE.ID || !CONFIG.SHEETS.PROCESSED.ID) {
        throw new Error('Spreadsheet IDs not configured in script properties');
    }
}
  
function setupProcessedSheet() {
    loadConfig();
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEETS.PROCESSED.ID);
    let sheet = spreadsheet.getSheets()[0];  // Get first sheet
    
    // Check if header row exists
    const headerRange = sheet.getRange(1, 1, 1, 8);
    const headerValues = headerRange.getValues()[0];
    
    if (!headerValues[0]) { // If first cell is empty, set headers
        headerRange.setValues([[
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
    return sheet;
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
    const formattedVideos = videos.map(video => {
        return `<video>
            <id>${video[0]}</id>
            <title>${video[1]}</title>
            <description>${video[4]}</description>
        </video>`
    }).join('\n\n');  // Use separator between videos
    
    const prompt = `Analyze these YouTube videos and classify if each is a music video/performance by T.M.Krishna.

<videos>
${formattedVideos}
</videos>

<guidelines>
- TRUE: Videos where T.M.Krishna is performing music (concerts, recordings, music videos)
- FALSE: All other content (lectures, interviews, non-musical content)
</guidelines>`;
    
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
                    description: "true if the video is a music performance by T.M.Krishna, false otherwise"
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
    loadConfig();
    const sourceSheet = SpreadsheetApp.openById(CONFIG.SHEETS.SOURCE.ID)
        .getSheets()[0];  // Get first sheet
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
    
    const unclassifiedVideos = new Set(); // Track videos that need retry
    
    // First pass: Process all videos
    for (let i = 0; i < eligibleVideos.length; i += CONFIG.VIDEOS_PER_REQUEST) {
        const videoBatch = eligibleVideos.slice(i, i + CONFIG.VIDEOS_PER_REQUEST);
        const classifications = classifyVideosWithGemini(videoBatch);
        
        if (classifications) {
            // Track which videos were classified
            const classifiedIds = new Set(classifications.map(c => c.video_id));
            
            // Store classifications and track unclassified videos
            videoBatch.forEach(video => {
                const videoId = video[0];
                const classification = classifications.find(c => c.video_id === videoId);
                
                if (classification) {
                    processedSheet.appendRow([...video, classification.is_music]);
                } else {
                    unclassifiedVideos.add(videoId);
                }
            });
        } else {
            // If classification failed entirely, add all videos to retry
            videoBatch.forEach(video => unclassifiedVideos.add(video[0]));
        }
    }
    
    // Second pass: Retry unclassified videos
    if (unclassifiedVideos.size > 0) {
        Logger.log(`Retrying classification for ${unclassifiedVideos.size} videos`);
        
        const videosToRetry = eligibleVideos.filter(video => unclassifiedVideos.has(video[0]));
        
        // Process retry batch
        for (let i = 0; i < videosToRetry.length; i += CONFIG.VIDEOS_PER_REQUEST) {
            const retryBatch = videosToRetry.slice(i, i + CONFIG.VIDEOS_PER_REQUEST);
            const classifications = classifyVideosWithGemini(retryBatch);
            
            if (classifications) {
                retryBatch.forEach(video => {
                    const classification = classifications.find(c => c.video_id === video[0]);
                    // Store with classification if available, null if still missing
                    processedSheet.appendRow([...video, classification ? classification.is_music : null]);
                });
            } else {
                // If retry failed, store all with null classification
                retryBatch.forEach(video => {
                    processedSheet.appendRow([...video, null]);
                });
            }
        }
    }
    
    // After all processing is complete, sort the processed sheet
    const lastRow = processedSheet.getLastRow();
    if (lastRow > 1) {  // Only sort if there's data beyond the header
        const range = processedSheet.getRange(2, 1, lastRow - 1, 8);  // Exclude header row
        range.sort({
            column: 4,  // published_date column
            ascending: false
        });
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
    // Verify spreadsheet IDs are configured
    loadConfig();
    
    // Setup processed sheet
    setupProcessedSheet();
    
    // Create trigger
    createDailyProcessingTrigger();
    
    Logger.log('Setup completed successfully');
} 