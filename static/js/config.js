// Configuration constants for the media player
export const CONFIG = {
  PLAYER: {
    height: '100%',
    width: '100%',
    playerVars: {
      controls: 0, // Hide YouTube controls
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      disablekb: 0,
      playsinline: 1 // Important for mobile
    }
  },
  TIMINGS: {
    progressUpdateInterval: 1000,
    volumeHideDelay: 1000,
    playAttemptDelay: 1000
  },
  KEYBOARD: {
    shortcuts: {
      'Space': 'togglePlayPause',
      'KeyN': 'playNext',
      'KeyP': 'playPrevious',
      'KeyL': 'toggleLoop',
      'KeyV': 'toggleVideoVisibility',
      'ArrowLeft': 'seekBackward',
      'ArrowRight': 'seekForward',
      'ArrowUp': 'volumeUp',
      'ArrowDown': 'volumeDown'
    }
  },
  LOOP_MODES: {
    NONE: 'none',
    SINGLE: 'single',
    PLAYLIST: 'playlist'
  },
  ICONS: {
    ADD_TO_PLAYLIST: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 10H2v2h12v-2zm0-4H2v2h12V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM2 16h8v-2H2v2z"/>
    </svg>`,
    REMOVE_FROM_PLAYLIST: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 13H5v-2h14v2z"/>
    </svg>`
  }
};
