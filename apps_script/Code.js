// Google Apps Script to fetch T M Krishna's latest YouTube videos using a general search and update the spreadsheet

const SEARCH_QUERY = 'T M Krishna';
const MAX_RESULTS = 50; 
const CATEGORY_CACHE_KEY = 'VIDEO_CATEGORIES';
const LAST_RUN_PROPERTY = 'LAST_RUN_TIMESTAMP';

function updateSpreadsheet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRunDate = getLastRunDate();
  var newVideos = getLatestVideos(lastRunDate);
  var categories = getVideoCategories();
  
  if (newVideos.length > 0) {
    var lastRow = sheet.getLastRow();
    var data = newVideos.map(function(video) {
      return [
        video.id,
        video.snippet.title,
        video.contentDetails.duration,
        video.snippet.publishedAt,
        video.snippet.description,
        video.snippet.categoryId,
        categories[video.snippet.categoryId] || 'Unknown' // Add category name
      ];
    });
    sheet.getRange(lastRow + 1, 1, data.length, 7).setValues(data);
    
    Logger.log('Spreadsheet updated successfully with ' + newVideos.length + ' new videos');
  } else {
    Logger.log('No new videos found');
  }
  
  // Update the last run timestamp
  setLastRunDate(new Date());
}

function getLastRunDate() {
  var userProperties = PropertiesService.getUserProperties();
  var lastRunTimestamp = userProperties.getProperty(LAST_RUN_PROPERTY);
  return lastRunTimestamp ? new Date(lastRunTimestamp) : new Date(0);
}

function setLastRunDate(date) {
  var userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty(LAST_RUN_PROPERTY, date.toISOString());
}

function getLatestVideos(lastRunDate) {
  var results = YouTube.Search.list('snippet', {
    q: SEARCH_QUERY,
    maxResults: MAX_RESULTS,
    order: 'date',
    type: 'video',
    publishedAfter: lastRunDate.toISOString(),
    videoEmbeddable: true
  });
  
  var videoIds = results.items.map(function(item) {
    return item.id.videoId;
  });
  
  var videoDetails = YouTube.Videos.list('snippet,contentDetails', {
    id: videoIds.join(',')
  });
  
  return videoDetails.items;
}

// Add this function to fetch and cache video categories
function getVideoCategories() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get(CATEGORY_CACHE_KEY);
  
  if (cached != null) {
    return JSON.parse(cached);
  }
  
  var categories = {};
  var response = YouTube.VideoCategories.list('snippet', {
    regionCode: 'US'  // You can change this to the appropriate region code
  });
  
  response.items.forEach(function(item) {
    categories[item.id] = item.snippet.title;
  });
  
  cache.put(CATEGORY_CACHE_KEY, JSON.stringify(categories), 21600); // Cache for 6 hours
  return categories;
}

// Set up a time-based trigger to run this function daily
function createTimeDrivenTrigger() {
  ScriptApp.newTrigger('updateSpreadsheet')
      .timeBased()
      .everyDays(1)  // Run every day
      .create();
}

// Initialize the spreadsheet if it's empty
function initializeSpreadsheet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getLastRow() <= 1) {
    sheet.getRange(1, 1, 1, 7).setValues([['video_id', 'title', 'length', 'published_date', 'description', 'category_id', 'category_name']]);
    fetchAllVideos();
  }
}

// Modified function to fetch all available videos
function fetchAllVideos() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var pageToken;
  var allVideos = [];
  var categories = getVideoCategories();

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

    var videoDetails = YouTube.Videos.list('snippet,contentDetails', {
      id: videoIds.join(',')
    });

    allVideos = allVideos.concat(videoDetails.items);
    pageToken = results.nextPageToken;
  } while (pageToken);

  // Prepare data for spreadsheet
  var data = allVideos.map(function(video) {
    return [
      video.id,
      video.snippet.title,
      video.contentDetails.duration,
      video.snippet.publishedAt,
      video.snippet.description,
      video.snippet.categoryId,
      categories[video.snippet.categoryId] || 'Unknown' // Add category name
    ];
  });

  // Insert all videos into the spreadsheet
  if (data.length > 0) {
    sheet.getRange(2, 1, data.length, 7).setValues(data);
    Logger.log('Spreadsheet initialized with ' + data.length + ' videos');
  } else {
    Logger.log('No videos found');
  }
  
  // Set the initial last run date
  setLastRunDate(new Date());
}

// Run this function to set up the trigger and initialize the spreadsheet
function setup() {
  initializeSpreadsheet();
  createTimeDrivenTrigger();
}
