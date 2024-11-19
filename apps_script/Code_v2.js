// Google Apps Script to fetch T M Krishna's YouTube videos daily using a general search

const SEARCH_QUERY = 'T M Krishna';
const MAX_RESULTS = 50; 
const CATEGORY_CACHE_KEY = 'VIDEO_CATEGORIES';

function updateSpreadsheetDaily() {
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
    sheet.getRange(2, 1, data.length, 7).setValues(data);
    Logger.log('Spreadsheet updated successfully with ' + data.length + ' videos');
  } else {
    Logger.log('No videos found');
  }
}

function clearExistingData(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) { // If there's data beyond the header row
    sheet.getRange(2, 1, lastRow - 1, 7).clear();
    Logger.log('Cleared existing data from spreadsheet');
  }
}

function fetchAllVideos() {
  var pageToken;
  var allVideos = [];

  do {
    var results = YouTube.Search.list('snippet', {
      q: SEARCH_QUERY,
      maxResults: MAX_RESULTS,
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
  var cache = CacheService.getScriptCache();
  var cached = cache.get(CATEGORY_CACHE_KEY);
  
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
  
  cache.put(CATEGORY_CACHE_KEY, JSON.stringify(categories), 21600); // Cache for 6 hours
  return categories;
}

function initializeSpreadsheet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 7).setValues([
      ['video_id', 'title', 'length', 'published_date', 'description', 'category_id', 'category_name']
    ]);
  }
  updateSpreadsheetDaily();
}

function createDailyTrigger() {
  // Delete any existing triggers first
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    ScriptApp.deleteTrigger(trigger);
  });
  
  // Create new daily trigger
  ScriptApp.newTrigger('updateSpreadsheetDaily')
      .timeBased()
      .everyDays(1)
      .create();
  
  Logger.log('Daily trigger created successfully');
}

function setup() {
  initializeSpreadsheet();
  createDailyTrigger();
} 