// Configuration management
const PLAYLIST_CONFIG = {
    PLAYLIST: {
        ID: null,
        NAME: "T.M. Krishna Music Performances",
        DESCRIPTION: "A curated playlist of T.M. Krishna's music performances, concerts, and recordings. Updated daily."
    },
    SHEET_ID: null,
    BATCH_SIZE: 50  // YouTube API batch request limit
};

function setup() {
    try {
        // Create or update script properties
        const scriptProperties = PropertiesService.getScriptProperties();
        
        // Check if properties are already set
        const existingPlaylistId = scriptProperties.getProperty('YOUTUBE_PLAYLIST_ID');
        const existingSheetId = scriptProperties.getProperty('PROCESSED_SPREADSHEET_ID');
        
        if (!existingPlaylistId) {
            // Create new playlist
            const newPlaylist = createPlaylist();
            Logger.log(`Created new playlist with ID: ${newPlaylist.id}`);
        }
        
        if (!existingSheetId) {
            throw new Error('PROCESSED_SPREADSHEET_ID not configured. Please set this property manually.');
        }
        
        // Create daily sync trigger
        createDailySyncTrigger();
        
        Logger.log('Setup completed successfully');
    } catch (error) {
        Logger.log(`Setup failed: ${error}`);
        throw error;
    }
}

function loadConfig() {
    const properties = PropertiesService.getScriptProperties();
    PLAYLIST_CONFIG.PLAYLIST.ID = properties.getProperty('YOUTUBE_PLAYLIST_ID');
    PLAYLIST_CONFIG.SHEET_ID = properties.getProperty('PROCESSED_SPREADSHEET_ID');

    if (!PLAYLIST_CONFIG.PLAYLIST.ID || !PLAYLIST_CONFIG.SHEET_ID) {
        throw new Error('Required configuration missing. Please run setup() first.');
    }
}

function addVideoToPlaylist(videoId) {
    const playlistItem = {
        snippet: {
            playlistId: PLAYLIST_CONFIG.PLAYLIST.ID,
            resourceId: {
                kind: 'youtube#video',
                videoId: videoId
            }
        }
    };
    
    return YouTube.PlaylistItems.insert(playlistItem, 'snippet');
}

function syncToYouTubePlaylist() {
    loadConfig();
    
    const processedSheet = SpreadsheetApp.openById(PLAYLIST_CONFIG.SHEET_ID)
        .getSheets()[0];
    
    const data = processedSheet.getDataRange().getValues();
    const musicVideos = data.slice(1)  // Skip header
        .filter(row => row[7] === true);  // Only music videos
    
    for (let i = 0; i < musicVideos.length; i += PLAYLIST_CONFIG.BATCH_SIZE) {
        const batch = musicVideos.slice(i, i + PLAYLIST_CONFIG.BATCH_SIZE);
        
        batch.forEach(video => {
            try {
                addVideoToPlaylist(video[0]);
                Logger.log(`Added video ${video[1]} to playlist`);
            } catch {
                Logger.log(`Failed to add video ${video[1]}`);
            }
        });
    }
}

function createPlaylist() {
    try {
        const playlist = {
            snippet: {
                title: PLAYLIST_CONFIG.PLAYLIST.NAME,
                description: PLAYLIST_CONFIG.PLAYLIST.DESCRIPTION
            },
            status: {
                privacyStatus: 'private'
            }
        };
        
        const newPlaylist = YouTube.Playlists.insert(playlist, 'snippet,status');
        PropertiesService.getScriptProperties()
            .setProperty('YOUTUBE_PLAYLIST_ID', newPlaylist.id);
            
        Logger.log(`Created playlist: ${newPlaylist.id}`);
        return newPlaylist;
    } catch (error) {
        Logger.log(`Error creating playlist: ${error}`);
        throw error;
    }
}

function createDailySyncTrigger() {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
    
    ScriptApp.newTrigger('syncToYouTubePlaylist')
        .timeBased()
        .everyDays(1)
        .atHour(3)
        .create();
    
    Logger.log('Daily sync trigger created');
} 