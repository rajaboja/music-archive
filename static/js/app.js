// Main application entry point for the TMK player
import { CONFIG } from './config.js';
import { DOMElements } from './dom-elements.js';
import { StateManager } from './state-manager.js';
import { PlayerManager } from './player-manager.js';
import { PlaylistManager } from './playlist-manager.js';
import { ControlsManager } from './controls-manager.js';
import { KeyboardManager } from './keyboard-manager.js';
import { UIManager } from './ui-manager.js';

class TMKPlayer {
  constructor() {
    this.initializeApp();
  }

  initializeApp() {
    try {
      // Initialize core components
      this.domElements = new DOMElements();
      this.stateManager = new StateManager();
      this.uiManager = new UIManager(this.stateManager, this.domElements);
      
      // Initialize managers
      this.playlistManager = new PlaylistManager(this.stateManager, this.domElements);
      this.controlsManager = new ControlsManager(this.stateManager, this.domElements);
      this.playerManager = new PlayerManager(
        this.stateManager, 
        this.domElements, 
        this.playlistManager, 
        this.controlsManager
      );
      
      // Set up cross-references between managers
      this.playlistManager.setPlayerManager(this.playerManager);
      this.playlistManager.setControlsManager(this.controlsManager);
      this.controlsManager.setPlayerManager(this.playerManager);
      
      // Initialize keyboard shortcuts
      this.keyboardManager = new KeyboardManager(
        this.stateManager,
        this.domElements,
        this.playerManager,
        this.controlsManager,
        this.uiManager
      );
      
      // Set up event listeners
      this.setupEventListeners();
      
      console.log('TMK Player initialized successfully');
    } catch (error) {
      console.error('Failed to initialize TMK Player:', error);
      this.uiManager?.showError('Failed to initialize player. Please refresh the page.');
    }
  }

  setupEventListeners() {
    // Set up playlist buttons and track click handlers
    this.playlistManager.setupPlaylistButtons();
    this.playlistManager.setupTrackClickHandlers();
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page is hidden, could pause video if desired
        console.log('Page hidden');
      } else {
        // Page is visible again
        console.log('Page visible');
      }
    });

    // Handle window beforeunload for cleanup
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }

  cleanup() {
    // Clear any intervals
    const progressInterval = this.stateManager.get('progressInterval');
    if (progressInterval) {
      clearInterval(progressInterval);
    }
    
    // Pause video if playing
    const player = this.stateManager.get('player');
    if (player && this.stateManager.get('isPlaying')) {
      player.pauseVideo();
    }
    
    console.log('TMK Player cleaned up');
  }

  // Public API methods for external access
  getState() {
    return this.stateManager.getState();
  }

  getPlayer() {
    return this.stateManager.get('player');
  }

  getUserPlaylist() {
    return this.stateManager.get('userPlaylist');
  }

  addTrackToPlaylist(videoId, title) {
    this.playlistManager.addToPlaylist(videoId, title);
  }

  removeTrackFromPlaylist(videoId) {
    this.playlistManager.removeFromPlaylist(videoId);
  }

  playTrack(index) {
    if (this.stateManager.get('playerReady')) {
      this.playerManager.initializePlayerWithTrack(index);
    } else {
      this.stateManager.set('pendingTrackIndex', index);
    }
  }

  togglePlayPause() {
    this.playerManager.togglePlayPause();
  }

  playNext() {
    this.playerManager.playNext();
  }

  playPrevious() {
    this.playerManager.playPrevious();
  }

  setLoopMode(mode) {
    if (Object.values(CONFIG.LOOP_MODES).includes(mode)) {
      this.stateManager.set('loopMode', mode);
      // Update UI to reflect the change
      this.updateLoopButtonUI(mode);
    }
  }

  updateLoopButtonUI(mode) {
    const loopButton = this.domElements.loopButton;
    loopButton.classList.remove('loop-single', 'loop-playlist');
    
    switch (mode) {
      case CONFIG.LOOP_MODES.SINGLE:
        loopButton.classList.add('loop-single');
        loopButton.title = 'Loop Single Track (L)';
        break;
      case CONFIG.LOOP_MODES.PLAYLIST:
        loopButton.classList.add('loop-playlist');
        loopButton.title = 'Loop Playlist (L)';
        break;
      default:
        loopButton.title = 'No Loop (L)';
    }
  }

  // Volume control methods
  setVolume(volume) {
    const player = this.stateManager.get('player');
    if (player && volume >= 0 && volume <= 100) {
      player.setVolume(volume);
      this.domElements.volumeSlider.value = volume;
    }
  }

  mute() {
    this.controlsManager.toggleMute();
  }

  // Seeking methods
  seekTo(seconds) {
    const player = this.stateManager.get('player');
    if (player) {
      player.seekTo(seconds, true);
    }
  }

  seekToPercent(percent) {
    const player = this.stateManager.get('player');
    if (player && percent >= 0 && percent <= 100) {
      const duration = player.getDuration();
      player.seekTo((duration * percent) / 100, true);
    }
  }
}

// Initialize the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.tmkPlayer = new TMKPlayer();
  });
} else {
  window.tmkPlayer = new TMKPlayer();
}

// Export for potential external use
export default TMKPlayer;
