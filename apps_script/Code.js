// Google Apps Script to fetch T M Krishna's latest YouTube videos using a general search and update the spreadsheet

const SEARCH_QUERY = 'T M Krishna';
const MAX_RESULTS = 50; 

function updateSpreadsheet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastVideoDate = getLastVideoDate(sheet);
  var newVideos = getLatestVideos(lastVideoDate);
  
  if (newVideos.length > 0) {
    var headerRow = 1;
    sheet.insertRowsAfter(headerRow, newVideos.length);
    var data = newVideos.map(function(video) {
      return [
        video.id,
        video.snippet.title,
        video.contentDetails.duration,
        video.snippet.publishedAt,
        video.snippet.description,
        video.snippet.categoryId // Add category ID
      ];
    });
    sheet.getRange(headerRow + 1, 1, data.length, 6).setValues(data);
    
    Logger.log('Spreadsheet updated successfully with ' + newVideos.length + ' new videos');
  } else {
    Logger.log('No new videos found');
  }
}

function getLastVideoDate(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var firstVideoDateCell = sheet.getRange(2, 4); // Row 2, Column 4 is published_date of the most recent video
    return new Date(firstVideoDateCell.getValue());
  }
  return new Date(0); // Return epoch time if sheet is empty (except for header)
}

function getLatestVideos(lastVideoDate) {
  var results = YouTube.Search.list('snippet', {
    q: SEARCH_QUERY,
    maxResults: MAX_RESULTS,
    order: 'date',
    type: 'video',
    publishedAfter: lastVideoDate.toISOString(),
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
    sheet.getRange(1, 1, 1, 6).setValues([['video_id', 'title', 'length', 'published_date', 'description', 'category_id']]);
    fetchAllVideos();
  }
}

// Modified function to fetch all available videos
function fetchAllVideos() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var pageToken;
  var allVideos = [];

  do {
    var results = YouTube.Search.list('snippet', {
      q: SEARCH_QUERY,
      maxResults: MAX_RESULTS,
      order: 'date',
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
      video.snippet.categoryId // Add category ID
    ];
  });

  // Insert all videos into the spreadsheet
  if (data.length > 0) {
    sheet.getRange(2, 1, data.length, 6).setValues(data);
    Logger.log('Spreadsheet initialized with ' + data.length + ' videos');
  } else {
    Logger.log('No videos found');
  }
}

// Run this function to set up the trigger and initialize the spreadsheet
function setup() {
  initializeSpreadsheet();
  createTimeDrivenTrigger();
}
