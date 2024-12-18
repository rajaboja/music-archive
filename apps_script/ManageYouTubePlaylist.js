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

function addVideoToPlaylist(videoId) {
  const playlistId = props.getProperty('PLAYLIST_ID');
  return YouTube.PlaylistItems.insert({
    snippet: {
      playlistId,
      position: 0, // Insert at the beginning of the playlist
      resourceId: { kind: 'youtube#video', videoId }
    }
  }, 'snippet');
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

  videosToAdd.forEach(videoId => {
    try {
      addVideoToPlaylist(videoId);
    } catch (e) {
      if (!e.message.includes('videoNotFound')) {
        Logger.log(`Failed to add video ${videoId}: ${e.message}`);
      }
    }
  });
}

function setupPlaylist() {
  if (!props.getProperty('PLAYLIST_ID')) createPlaylist();
  if (!props.getProperty('PROCESSED_SPREADSHEET_ID')) throw new Error('Set PROCESSED_SPREADSHEET_ID in script properties');
  
  ScriptApp.newTrigger('syncToYouTubePlaylist').timeBased().everyDays(1).atHour(3).create();
} 