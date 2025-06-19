// Import configuration management
// Note: In Apps Script, this would be included via the script editor
  
function setupProcessedSheet() {
    const spreadsheet = SpreadsheetApp.openById(getConfig('ENV.PROCESSED_SPREADSHEET_ID'));
    let sheet = spreadsheet.getSheets()[0];  // Get first sheet
    
    // Check if header row exists
    const headerCount = getConfig('SHEETS.HEADERS.PROCESSED').length;
    const headerRange = sheet.getRange(1, 1, 1, headerCount);
    const headerValues = headerRange.getValues()[0];
    
    if (!headerValues[0]) { // If first cell is empty, set headers
        const headers = getConfig('SHEETS.HEADERS.PROCESSED');
        headerRange.setValues([headers]);
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
    const titleIndex = getColumnIndex('TITLE');
    const descriptionIndex = getColumnIndex('DESCRIPTION');
    const searchText = `${video[titleIndex] || ''}\n${video[descriptionIndex] || ''}`;
    const pattern = getConfig('PATTERNS.TM_KRISHNA');
    return pattern.test(searchText);
}
  
function truncateDescription(description) {
    if (!description) return '';
    
    const maxLength = getConfig('PROCESSING.MAX_DESCRIPTION_LENGTH');
    
    if (description.length <= maxLength) {
        return description;
    }
    
    const truncated = description.substring(0, maxLength);

    return truncated.trim() + '...';
}
  
function classifyVideosWithGemini(videos) {
    const url = Config.getGeminiApiUrl();
    
    const systemInstruction = `You are a video content classifier specialized in identifying music performances by T.M.Krishna. 
Your task is to analyze YouTube video metadata and determine if each video contains a music performance by T.M.Krishna.

Classification Guidelines:
- TRUE: Videos where T.M.Krishna is performing music (concerts, recordings, music videos)
- FALSE: All other content (lectures, interviews, non-musical content)`;

    // Format videos for the prompt
    const videoIdIndex = getColumnIndex('VIDEO_ID');
    const titleIndex = getColumnIndex('TITLE');
    const descriptionIndex = getColumnIndex('DESCRIPTION');
    
    const formattedVideos = videos.map(video => {
        return `<video>
            ID: ${video[videoIdIndex]}
            Title: ${video[titleIndex]}
            Description: ${truncateDescription(video[descriptionIndex])}
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
            maxOutputTokens: getConfig('API.GEMINI.MAX_OUTPUT_TOKENS'),
            responseMimeType: getConfig('API.GEMINI.RESPONSE_MIME_TYPE'),
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
    initializeConfig(); // Load configuration first
    
    const sourceSheet = SpreadsheetApp.openById(getConfig('ENV.SOURCE_SPREADSHEET_ID')).getSheets()[0];
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
    const videoIdIndex = getColumnIndex('VIDEO_ID');
    return new Set(processedData.slice(1).map(row => row[videoIdIndex]));
}
  
function getEligibleVideos(sourceSheet, processedVideoIds) {
    const sourceData = sourceSheet.getDataRange().getValues();
    const videos = sourceData.slice(1);
    
    const videoIdIndex = getColumnIndex('VIDEO_ID');
    const lengthIndex = getColumnIndex('LENGTH');
    const minDuration = getConfig('PROCESSING.MIN_DURATION_SECONDS');
    
    return videos.filter(video => {
        const duration = parseISO8601Duration(video[lengthIndex]);
        return duration >= minDuration && 
               !processedVideoIds.has(video[videoIdIndex]);
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
    const videosPerRequest = getConfig('PROCESSING.VIDEOS_PER_REQUEST');
    
    // First pass: Process all videos
    for (let i = 0; i < videos.length; i += videosPerRequest) {
        const videoBatch = videos.slice(i, i + videosPerRequest);
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
    const videoIdIndex = getColumnIndex('VIDEO_ID');
    
    if (classifications) {      
        videoBatch.forEach(video => {
            const videoId = video[videoIdIndex];
            const classification = classifications.find(c => c.video_id === videoId);
            
            if (classification) {
                processedSheet.appendRow([...video, classification.is_music]);
            } else {
                unclassifiedVideos.add(videoId);
            }
        });
    } else {
        videoBatch.forEach(video => unclassifiedVideos.add(video[videoIdIndex]));
    }
}
  
function processRetryBatch(processedSheet, videosToRetry) {
    const videosPerRequest = getConfig('PROCESSING.VIDEOS_PER_REQUEST');
    const videoIdIndex = getColumnIndex('VIDEO_ID');
    
    for (let i = 0; i < videosToRetry.length; i += videosPerRequest) {
        const retryBatch = videosToRetry.slice(i, i + videosPerRequest);
        const classifications = classifyVideosWithGemini(retryBatch);
        
        retryBatch.forEach(video => {
            const classification = classifications?.find(c => c.video_id === video[videoIdIndex]);
            processedSheet.appendRow([...video, classification ? classification.is_music : null]);
        });
    }
}
  
function sortProcessedSheet(processedSheet) {
    const lastRow = processedSheet.getLastRow();
    if (lastRow > 1) {
        const headerCount = getConfig('SHEETS.HEADERS.PROCESSED').length;
        const publishedDateColumn = getColumnIndex('PUBLISHED_DATE') + 1; // 1-based for Sheets API
        const range = processedSheet.getRange(2, 1, lastRow - 1, headerCount);
        range.sort({
            column: publishedDateColumn,
            ascending: false
        });
    }
}
  
function createDailyProcessingTrigger() {    
    const processingHour = getConfig('TRIGGERS.PROCESSING_HOUR');
    const intervalDays = getConfig('TRIGGERS.INTERVAL_DAYS');
    
    // Create new daily trigger to run after the raw data is updated
    ScriptApp.newTrigger('processVideos')
        .timeBased()
        .everyDays(intervalDays)
        .atHour(processingHour)
        .create();
    
    Logger.log('Daily processing trigger created successfully');
}
  
function setupProcessing() {  
    // Create trigger
    createDailyProcessingTrigger();
    
    Logger.log('Setup completed successfully');
}