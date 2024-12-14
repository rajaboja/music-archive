// Configuration management
const CONFIG = {
    PLAYLIST: {
        ID: null,
        NAME: "T.M. Krishna Music Performances",
        DESCRIPTION: "A curated playlist of T.M. Krishna's music performances, concerts, and recordings. Updated daily."
    },
    SHEETS: {
        PROCESSED: {
            ID: null
        }
    },
    BATCH_SIZE: 50  // YouTube API batch request limit
};

function setup() {
    try {
        // Create or update script properties
        const scriptProperties = PropertiesService.getScriptProperties();
        
        // Check if properties are already set
        const existingPlaylistId = scriptProperties.getProperty('YOUTUBE_PLAYLIST_ID');
        const existingSheetId = scriptProperties.getProperty('PROCESSED_SHEET_ID');
        
        if (!existingPlaylistId) {
            // Create new playlist
            const newPlaylist = createPlaylist();
            Logger.log(`Created new playlist with ID: ${newPlaylist.id}`);
        }
        
        if (!existingSheetId) {
            throw new Error('PROCESSED_SHEET_ID not configured. Please set this property manually.');
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
    CONFIG.PLAYLIST.ID = properties.getProperty('YOUTUBE_PLAYLIST_ID');
    CONFIG.SHEETS.PROCESSED.ID = properties.getProperty('PROCESSED_SHEET_ID');

    if (!CONFIG.PLAYLIST.ID || !CONFIG.SHEETS.PROCESSED.ID) {
        throw new Error('Required configuration missing. Please run setup() first.');
    }
}

function addVideoToPlaylist(videoId) {
    const playlistItem = {
        snippet: {
            playlistId: CONFIG.PLAYLIST.ID,
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
    
    const processedSheet = SpreadsheetApp.openById(CONFIG.SHEETS.PROCESSED.ID)
        .getSheets()[0];
    
    const data = processedSheet.getDataRange().getValues();
    const musicVideos = data.slice(1)  // Skip header
        .filter(row => row[7] === true);  // Only music videos
    
    // Process videos in batches
    for (let i = 0; i < musicVideos.length; i += CONFIG.BATCH_SIZE) {
        const batch = musicVideos.slice(i, i + CONFIG.BATCH_SIZE);
        
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
                title: CONFIG.PLAYLIST.NAME,
                description: CONFIG.PLAYLIST.DESCRIPTION
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