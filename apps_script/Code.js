// Google Apps Script to fetch T M Krishna's YouTube videos daily using a general search
// Import configuration management - included via Apps Script editor

function updateSpreadsheetDaily() {
  initializeConfig(); // Load configuration first
  Logger.log('Starting daily full refresh of videos');
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Clear existing data while preserving headers
  clearExistingData(sheet);
  
  // Fetch all videos and categories
  var allVideos = fetchAllVideos();
  var categories = getVideoCategories();
  
  if (allVideos.length > 0) {
    // Sort videos by publishedAt date in descending order (newest first)
    allVideos.sort(function(a, b) {
      return new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt);
    });
    
    var data = allVideos.map(function(video) {
      return [
        video.id,
        video.snippet.title,
        video.contentDetails.duration,
        video.snippet.publishedAt,
        video.snippet.description,
        video.snippet.categoryId,
        categories[video.snippet.categoryId] || 'Unknown'
      ];
    });
    
    // Insert all videos into the spreadsheet
    const headerCount = getConfig('SHEETS.HEADERS.SOURCE').length;
    sheet.getRange(2, 1, data.length, headerCount).setValues(data);
    Logger.log('Spreadsheet updated successfully with ' + data.length + ' videos');
  } else {
    Logger.log('No videos found');
  }
}

function clearExistingData(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) { // If there's data beyond the header row
    const headerCount = getConfig('SHEETS.HEADERS.SOURCE').length;
    sheet.getRange(2, 1, lastRow - 1, headerCount).clear();
    Logger.log('Cleared existing data from spreadsheet');
  }
}

function fetchAllVideos() {
  var pageToken;
  var allVideos = [];
  const searchQuery = getConfig('API.YOUTUBE.SEARCH_QUERY');
  const maxResults = getConfig('API.YOUTUBE.MAX_RESULTS');

  do {
    var results = YouTube.Search.list('snippet', {
      q: searchQuery,
      maxResults: maxResults,
      type: 'video',
      videoEmbeddable: true,
      pageToken: pageToken
    });

    var videoIds = results.items.map(function(item) {
      return item.id.videoId;
    });

    if (videoIds.length > 0) {
      var videoDetails = YouTube.Videos.list('snippet,contentDetails', {
        id: videoIds.join(',')
      });
      allVideos = allVideos.concat(videoDetails.items);
    }

    pageToken = results.nextPageToken;
  } while (pageToken);

  return allVideos;
}

function getVideoCategories() {
  const cacheKey = getConfig('CACHE.CATEGORIES_KEY');
  const cacheTtl = getConfig('CACHE.CATEGORIES_TTL');
  var cache = CacheService.getScriptCache();
  var cached = cache.get(cacheKey);
  
  if (cached != null) {
    return JSON.parse(cached);
  }
  
  var categories = {};
  var response = YouTube.VideoCategories.list('snippet', {
    regionCode: 'US'
  });
  
  response.items.forEach(function(item) {
    categories[item.id] = item.snippet.title;
  });
  
  cache.put(cacheKey, JSON.stringify(categories), cacheTtl);
  return categories;
}

function initializeSpreadsheet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getLastRow() === 0) {
    const headers = getConfig('SHEETS.HEADERS.SOURCE');
    const headerCount = headers.length;
    sheet.getRange(1, 1, 1, headerCount).setValues([headers]);
  }
}

function createDailyTrigger() {  
  const intervalDays = getConfig('TRIGGERS.INTERVAL_DAYS');
  
  // Create new daily trigger
  ScriptApp.newTrigger('updateSpreadsheetDaily')
      .timeBased()
      .everyDays(intervalDays)
      .create();
  
  Logger.log('Daily trigger created successfully');
}

function setupSourceSheet() {
  initializeConfig(); // Load configuration first
  initializeSpreadsheet();
  createDailyTrigger();
} 