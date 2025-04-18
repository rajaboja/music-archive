// Configuration constants
const CONFIG = {
    VIDEOS_PER_REQUEST: 50,
    MIN_DURATION_SECONDS: 120,
    GEMINI_MODEL: 'gemini-2.0-flash-lite',
    API_VERSION: 'v1beta',
    MAX_DESCRIPTION_LENGTH: 500, // Maximum characters for description
    SOURCE_ID: null,      // Will be loaded from environment
    PROCESSED_ID: null    // Will be loaded from environment
};

const PATTERN = /t\.?\s*m\.?\s*krishna/i;

function loadConfig() {
    const properties = PropertiesService.getScriptProperties();
    CONFIG.SOURCE_ID = properties.getProperty('SOURCE_SPREADSHEET_ID');
    CONFIG.PROCESSED_ID = properties.getProperty('PROCESSED_SPREADSHEET_ID');
    
    if (!CONFIG.SOURCE_ID || !CONFIG.PROCESSED_ID) {
        throw new Error('Spreadsheet IDs not configured in script properties');
    }
}
  
function setupProcessedSheet() {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.PROCESSED_ID);
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
  
function matchesPattern(video) {
    const searchText = `${video[1] || ''}\n${video[4] || ''}`;
    return PATTERN.test(searchText);
}
  
function truncateDescription(description) {
    if (!description) return '';
    
    
    if (description.length <= CONFIG.MAX_DESCRIPTION_LENGTH) {
        return description;
    }
    
    const truncated = description.substring(0, CONFIG.MAX_DESCRIPTION_LENGTH);

    return truncated.trim() + '...';
}
  
function classifyVideosWithGemini(videos) {
    const apiKey = PropertiesService.getScriptProperties().getProperty('GOOGLE_API_KEY');
    const url = `https://generativelanguage.googleapis.com/${CONFIG.API_VERSION}/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${apiKey}`;
    
    const systemInstruction = `You are a video content classifier specialized in identifying music performances by T.M.Krishna. 
Your task is to analyze YouTube video metadata and determine if each video contains a music performance by T.M.Krishna.

Classification Guidelines:
- TRUE: Videos where T.M.Krishna is performing music (concerts, recordings, music videos)
- FALSE: All other content (lectures, interviews, non-musical content)`;

    // Format videos for the prompt
    const formattedVideos = videos.map(video => {
        return `<video>
            ID: ${video[0]}
            Title: ${video[1]}
            Description: ${truncateDescription(video[4])}
        </video>`
    }).join('\n\n');

    
    const requestBody = {
        contents: [{
            role: "user",
            parts: [{
                text: formattedVideos
            }]
        }],
        systemInstruction: {
            role: "user",
            parts: [{
                text: systemInstruction
            }]
        },
        generationConfig: {
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
            responseSchema: {
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
            }
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
    const sourceSheet = SpreadsheetApp.openById(CONFIG.SOURCE_ID).getSheets()[0];
    const processedSheet = setupProcessedSheet();
    
    try {
        // Get data from sheets
        const processedVideoIds = getProcessedVideoIds(processedSheet);
        const eligibleVideos = getEligibleVideos(sourceSheet, processedVideoIds);
        
        // Split videos into matching and non-matching
        const { matchingVideos, nonMatchingVideos } = categorizeVideos(eligibleVideos);
        
        // Process non-matching videos (automatically marked as non-music)
        processNonMatchingVideos(processedSheet, nonMatchingVideos);
        
        // Process matching videos through Gemini
        processMatchingVideos(processedSheet, matchingVideos);
        
        // Sort the processed sheet by date
        sortProcessedSheet(processedSheet);
        
    } catch (error) {
        Logger.log(`Error in processVideos: ${error.message}`);
        throw error;
    }
}
  
function getProcessedVideoIds(processedSheet) {
    const processedData = processedSheet.getDataRange().getValues();
    return new Set(processedData.slice(1).map(row => row[0]));
}
  
function getEligibleVideos(sourceSheet, processedVideoIds) {
    const sourceData = sourceSheet.getDataRange().getValues();
    const videos = sourceData.slice(1);
    
    return videos.filter(video => {
        const duration = parseISO8601Duration(video[2]);
        return duration >= CONFIG.MIN_DURATION_SECONDS && 
               !processedVideoIds.has(video[0]);
    });
}
  
function categorizeVideos(videos) {
    const matchingVideos = [];
    const nonMatchingVideos = [];
    
    videos.forEach(video => {
        if (matchesPattern(video)) {
            matchingVideos.push(video);
        } else {
            nonMatchingVideos.push(video);
        }
    });
    
    return { matchingVideos, nonMatchingVideos };
}
  
function processNonMatchingVideos(processedSheet, videos) {
    videos.forEach(video => {
        processedSheet.appendRow([...video, false]);
    });
    Logger.log(`Processed ${videos.length} non-matching videos`);
}
  
function processMatchingVideos(processedSheet, videos) {
    const unclassifiedVideos = new Set();
    
    // First pass: Process all videos
    for (let i = 0; i < videos.length; i += CONFIG.VIDEOS_PER_REQUEST) {
        const videoBatch = videos.slice(i, i + CONFIG.VIDEOS_PER_REQUEST);
        processVideoBatch(processedSheet, videoBatch, unclassifiedVideos);
    }
    
    // Second pass: Retry unclassified videos
    if (unclassifiedVideos.size > 0) {
        Logger.log(`Retrying classification for ${unclassifiedVideos.size} videos`);
        const videosToRetry = videos.filter(video => unclassifiedVideos.has(video[0]));
        processRetryBatch(processedSheet, videosToRetry);
    }
}
  
function processVideoBatch(processedSheet, videoBatch, unclassifiedVideos) {
    const classifications = classifyVideosWithGemini(videoBatch);
    
    if (classifications) {      
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
        videoBatch.forEach(video => unclassifiedVideos.add(video[0]));
    }
}
  
function processRetryBatch(processedSheet, videosToRetry) {
    for (let i = 0; i < videosToRetry.length; i += CONFIG.VIDEOS_PER_REQUEST) {
        const retryBatch = videosToRetry.slice(i, i + CONFIG.VIDEOS_PER_REQUEST);
        const classifications = classifyVideosWithGemini(retryBatch);
        
        retryBatch.forEach(video => {
            const classification = classifications?.find(c => c.video_id === video[0]);
            processedSheet.appendRow([...video, classification ? classification.is_music : null]);
        });
    }
}
  
function sortProcessedSheet(processedSheet) {
    const lastRow = processedSheet.getLastRow();
    if (lastRow > 1) {
        const range = processedSheet.getRange(2, 1, lastRow - 1, 8);
        range.sort({
            column: 4,  // published_date column
            ascending: false
        });
    }
}
  
function createDailyProcessingTrigger() {    
    // Create new daily trigger to run after the raw data is updated
    ScriptApp.newTrigger('processVideos')
        .timeBased()
        .everyDays(1)
        .atHour(2) // Run at 2 AM
        .create();
    
    Logger.log('Daily processing trigger created successfully');
}
  
function setupProcessing() {  
    // Create trigger
    createDailyProcessingTrigger();
    
    Logger.log('Setup completed successfully');
}