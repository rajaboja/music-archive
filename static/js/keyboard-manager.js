// Keyboard shortcuts management for the TMK player
import { CONFIG } from './config.js';

export class KeyboardManager {
  constructor(stateManager, domElements, playerManager, controlsManager, uiManager) {
    this.state = stateManager;
    this.dom = domElements;
    this.playerManager = playerManager;
    this.controlsManager = controlsManager;
    this.uiManager = uiManager;
    
    this.setupKeyboardShortcuts();
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      this.handleKeydown(e);
    });
  }

  handleKeydown(e) {
    // Handle escape key for playlist panel
    if (e.key === 'Escape' && this.dom.playlistPanel.classList.contains('active')) {
      this.uiManager.togglePlaylistPanel();
      return;
    }
    
    // Only handle shortcuts if player is active and no modal is open
    if (!this.dom.playerControls.classList.contains('active') || 
        this.dom.playlistPanel.classList.contains('active')) {
      return;
    }
    
    const action = CONFIG.KEYBOARD.shortcuts[e.code];
    if (action) {
      e.preventDefault(); // Prevent default browser behavior
      this.executeShortcut(action);
    }
  }

  executeShortcut(action) {
    switch (action) {
      case 'togglePlayPause':
        this.playerManager.togglePlayPause();
        break;
      case 'playNext':
        this.playerManager.playNext();
        break;
      case 'playPrevious':
        this.playerManager.playPrevious();
        break;
      case 'toggleLoop':
        this.controlsManager.toggleLoop();
        break;
      case 'toggleVideoVisibility':
        this.controlsManager.toggleVideoVisibility();
        break;
      case 'seekBackward':
        this.controlsManager.seekBackward();
        break;
      case 'seekForward':
        this.controlsManager.seekForward();
        break;
      case 'volumeUp':
        this.controlsManager.volumeUp();
        break;
      case 'volumeDown':
        this.controlsManager.volumeDown();
        break;
      default:
        console.warn(`Unknown keyboard shortcut action: ${action}`);
    }
  }

  // Method to add custom shortcuts
  addShortcut(keyCode, action) {
    CONFIG.KEYBOARD.shortcuts[keyCode] = action;
  }

  // Method to remove shortcuts
  removeShortcut(keyCode) {
    delete CONFIG.KEYBOARD.shortcuts[keyCode];
  }
}
