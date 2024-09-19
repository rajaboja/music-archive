// Google Apps Script to fetch T M Krishna's latest YouTube videos using a general search and update the spreadsheet

const YOUTUBE_API_KEY = 'YOUR_YOUTUBE_API_KEY';
const SEARCH_QUERY = 'T M Krishna';
const MAX_RESULTS = 50; // Number of videos to fetch

function updateSpreadsheet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var videos = getLatestVideos();
  
  // Clear existing content
  sheet.clear();
  
  // Set headers
  sheet.getRange(1, 1, 1, 5).setValues([['video_id', 'title', 'length', 'published_date', 'description']]);
  
  // Populate data
  if (videos.length > 0) {
    var data = videos.map(function(video) {
      return [
        video.id.videoId,
        video.snippet.title,
        video.contentDetails.duration,
        video.snippet.publishedAt,
        video.snippet.description
      ];
    });
    sheet.getRange(2, 1, data.length, 5).setValues(data);
  }
  
  Logger.log('Spreadsheet updated successfully with ' + videos.length + ' videos');
}

function getLatestVideos() {
  var results = YouTube.Search.list('snippet', {
    q: SEARCH_QUERY,
    maxResults: MAX_RESULTS,
    order: 'date',
    type: 'video'
  });
  
  var videoIds = results.items.map(function(item) {
    return item.id.videoId;
  });
  
  var videoDetails = YouTube.Videos.list('contentDetails', {
    id: videoIds.join(',')
  });
  
  // Merge search results with video details
  return results.items.map(function(item, index) {
    item.contentDetails = videoDetails.items[index].contentDetails;
    return item;
  });
}

// Set up a time-based trigger to run this function periodically
function createTimeDrivenTrigger() {
  ScriptApp.newTrigger('updateSpreadsheet')
      .timeBased()
      .everyHours(6)  // Run every 6 hours, adjust as needed
      .create();
}