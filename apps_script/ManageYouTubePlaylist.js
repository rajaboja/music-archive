const props = PropertiesService.getScriptProperties();
const PLAYLIST_NAME = "T.M. Krishna Music Performances";

function createPlaylist() {
  const playlist = YouTube.Playlists.insert({
    snippet: {
      title: PLAYLIST_NAME,
      description: "A curated playlist of T.M. Krishna's music performances. Updated daily."
    },
    status: { privacyStatus: 'private' }
  }, 'snippet,status');

  props.setProperty('PLAYLIST_ID', playlist.id);
  return playlist;
}

function getPlaylistVideos() {
  const playlistId = props.getProperty('PLAYLIST_ID');
  let videos = [];
  let pageToken;

  do {
    const response = YouTube.PlaylistItems.list('snippet', {
      playlistId: playlistId,
      maxResults: 50,
      pageToken: pageToken
    });
    
    videos = videos.concat(response.items.map(item => item.snippet.resourceId.videoId));
    pageToken = response.nextPageToken;
  } while (pageToken);

  return videos;
}

function deleteVideoFromSheet(videoId) {
  const sheet = SpreadsheetApp.openById(props.getProperty('PROCESSED_SPREADSHEET_ID')).getSheets()[0];
  const data = sheet.getDataRange().getValues();
  const rowIndex = data.findIndex((row, index) => index > 0 && row[0] === videoId);
  
  if (rowIndex > 0) {
    sheet.deleteRow(rowIndex + 1);
    Logger.log(`Deleted row for video ${videoId} from the sheet`);
  }
}

function addVideoToPlaylist(videoId) {
  const playlistId = props.getProperty('PLAYLIST_ID');
  try {
    return YouTube.PlaylistItems.insert({
      snippet: {
        playlistId,
        resourceId: { 
          kind: 'youtube#video', 
          videoId 
        }
      }
    }, 'snippet');
  } catch (e) {
    if (e.message.includes('Video not found')) {
      Logger.log(`Video ${videoId} not found. Deleting from sheet...`);
      deleteVideoFromSheet(videoId);
    }
    throw e;
  }
}

function syncToYouTubePlaylist() {
  const sheet = SpreadsheetApp.openById(props.getProperty('PROCESSED_SPREADSHEET_ID')).getSheets()[0];
  const newVideos = sheet.getDataRange().getValues()
    .slice(1)  // Skip header
    .filter(row => row[7] === true)  // Only rows marked as music videos with true
    .map(row => row[0]);  // Get video IDs

  Logger.log(`Found ${newVideos.length} new videos to process`);

  const existingVideos = getPlaylistVideos();
  const videosToAdd = newVideos.filter(id => !existingVideos.includes(id));

  Logger.log(`Identified ${videosToAdd.length} videos to add to the playlist`);

  for (const videoId of videosToAdd) {
    try {
      addVideoToPlaylist(videoId);
    } catch (e) {
      if (e.message.includes('quota')) {
        Logger.log('YouTube API quota exceeded. Stopping further processing.');
        return;
      }
      
      if (!e.message.includes('videoNotFound')) {
        Logger.log(`Failed to add video ${videoId}: ${e.message}`);
      }
    }
  }
}

function setupPlaylist() {
  if (!props.getProperty('PLAYLIST_ID')) createPlaylist();
  if (!props.getProperty('PROCESSED_SPREADSHEET_ID')) throw new Error('Set PROCESSED_SPREADSHEET_ID in script properties');
  
  ScriptApp.newTrigger('syncToYouTubePlaylist').timeBased().everyDays(1).atHour(3).create();
}