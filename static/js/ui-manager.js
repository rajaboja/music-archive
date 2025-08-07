// UI management for the media player
import { showFeedback } from './utils.js';
export class UIManager {
  constructor(stateManager, domElements) {
    this.state = stateManager;
    this.dom = domElements;
    
    this.setupUIEventListeners();
  }

  setupUIEventListeners() {
    // Close playlist panel when clicking overlay
    this.dom.modalOverlay.addEventListener('click', () => this.togglePlaylistPanel());
  }

  togglePlaylistPanel() {
    const isActive = this.dom.playlistPanel.classList.contains('active');
    
    if (isActive) {
      this.dom.playlistPanel.classList.remove('active');
      this.dom.modalOverlay.classList.remove('active');
      document.body.style.overflow = '';
    } else {
      this.dom.playlistPanel.classList.add('active');
      this.dom.modalOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  showLoadingState() {
    this.dom.playerContainer.classList.add('loading');
  }

  hideLoadingState() {
    this.dom.playerContainer.classList.remove('loading');
  }

  showPlayerControls() {
    this.dom.playerControls.classList.add('active');
  }

  hidePlayerControls() {
    this.dom.playerControls.classList.remove('active');
  }

  showPlayerInPiP() {
    this.dom.playerContainer.classList.add('pip');
  }

  hidePlayerFromPiP() {
    this.dom.playerContainer.classList.remove('pip');
  }

  ensureVideoVisible() {
    this.dom.playerContainer.style.opacity = '1';
    this.dom.playerContainer.style.pointerEvents = 'auto';
    this.state.set('isVideoVisible', true);
  }

  hideVideo() {
    this.dom.playerContainer.style.opacity = '0';
    this.dom.playerContainer.style.pointerEvents = 'none';
    this.state.set('isVideoVisible', false);
  }

  updatePlayIcon(isPlaying) {
    if (isPlaying) {
      this.dom.playIcon.style.display = 'none';
      this.dom.pauseIcon.style.display = 'block';
    } else {
      this.dom.playIcon.style.display = 'block';
      this.dom.pauseIcon.style.display = 'none';
    }
  }

  resetProgressDisplay() {
    if (this.dom.progressBar) {
      this.dom.progressBar.style.width = '0%';
    }
    if (this.dom.timeDisplay) {
      this.dom.timeDisplay.textContent = '0:00 / 0:00';
    }
  }

  // Method to display error messages
  showError(message) {
    showFeedback(message, 'error', 5000);
  }

  // Method to display success messages
  showSuccess(message) {
    showFeedback(message, 'success', 2000);
  }
}
