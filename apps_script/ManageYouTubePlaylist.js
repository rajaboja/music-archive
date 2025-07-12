function createPlaylist() {
  const playlistName = getConfig('PLAYLIST.NAME');
  const playlistDescription = getConfig('PLAYLIST.DESCRIPTION');
  const privacyStatus = getConfig('PLAYLIST.PRIVACY_STATUS');
  
  const playlist = YouTube.Playlists.insert({
    snippet: {
      title: playlistName,
      description: playlistDescription
    },
    status: { privacyStatus: privacyStatus }
  }, 'snippet,status');

  const props = PropertiesService.getScriptProperties();
  props.setProperty('PLAYLIST_ID', playlist.id);
  return playlist;
}

function getPlaylistVideos() {
  const playlistId = getConfig('ENV.PLAYLIST_ID');
  const maxResults = getConfig('API.YOUTUBE.MAX_RESULTS');
  let videos = [];
  let pageToken;

  do {
    const response = YouTube.PlaylistItems.list('snippet', {
      playlistId: playlistId,
      maxResults: maxResults,
      pageToken: pageToken
    });
    
    videos = videos.concat(response.items.map(item => item.snippet.resourceId.videoId));
    pageToken = response.nextPageToken;
  } while (pageToken);

  return videos;
}

function deleteVideoFromSheet(videoId) {
  const sheet = SpreadsheetApp.openById(getConfig('ENV.PROCESSED_SPREADSHEET_ID')).getSheets()[0];
  const data = sheet.getDataRange().getValues();
  const videoIdIndex = getColumnIndex('VIDEO_ID');
  const rowIndex = data.findIndex((row, index) => index > 0 && row[videoIdIndex] === videoId);
  
  if (rowIndex > 0) {
    sheet.deleteRow(rowIndex + 1);
    Logger.log(`Deleted row for video ${videoId} from the sheet`);
  }
}

function addVideoToPlaylist(videoId) {
  const playlistId = getConfig('ENV.PLAYLIST_ID');
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

function removeVideoFromPlaylist(videoId) {
  const playlistId = getConfig('ENV.PLAYLIST_ID');
  const playlistItems = YouTube.PlaylistItems.list('id', {
    playlistId: playlistId,
    videoId: videoId
  });

  if (playlistItems.items && playlistItems.items.length > 0) {
    YouTube.PlaylistItems.remove(playlistItems.items[0].id);
    Logger.log(`Removed video ${videoId} from playlist`);
  }
}

function syncToYouTubePlaylist() {
  initializeConfig();
  
  // Create playlist if it doesn't exist
  if (!getConfig('ENV.PLAYLIST_ID')) {
    createPlaylist();
  }
  
  const sheet = SpreadsheetApp.openById(getConfig('ENV.PROCESSED_SPREADSHEET_ID')).getSheets()[0];
  const allSheetRows = sheet.getDataRange().getValues().slice(1);
  
  const videoIdIndex = getColumnIndex('VIDEO_ID');
  const isMusicIndex = getColumnIndex('IS_MUSIC_VIDEO');
  
  const shouldBeInPlaylist = allSheetRows
    .filter(row => row[isMusicIndex] === true)
    .map(row => row[videoIdIndex]);

  Logger.log(`Found ${shouldBeInPlaylist.length} videos that should be in playlist`);

  const existingVideos = getPlaylistVideos();
  
  const videosToAdd = shouldBeInPlaylist.filter(id => !existingVideos.includes(id));
  const videosToRemove = existingVideos.filter(id => !shouldBeInPlaylist.includes(id));

  Logger.log(`Identified ${videosToAdd.length} videos to add and ${videosToRemove.length} to remove`);

  for (const videoId of videosToRemove) {
    try {
      removeVideoFromPlaylist(videoId);
    } catch (e) {
      Logger.log(`Failed to remove video ${videoId}: ${e.message}`);
    }
  }

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