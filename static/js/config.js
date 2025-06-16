// Configuration constants for the TMK player
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
  }
};
