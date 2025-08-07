// Playlist management for the media player
import { PlaylistValidator, PlaylistItemRenderer } from './utils.js';

// Manages playlist-specific state and track highlighting
class PlaylistStateManager {
  constructor(stateManager, domElements) {
    this.state = stateManager;
    this.dom = domElements;
  }

  addTrack(track) {
    this.state.addToUserPlaylist(track);
  }

  removeTrack(videoId) {
    this.state.removeFromUserPlaylist(videoId);
  }

  isTrackInPlaylist(videoId) {
    return this.state.isInUserPlaylist(videoId);
  }

  getPlaylistLength() {
    return this.state.getUserPlaylistLength();
  }

  getTrackByIndex(index) {
    return this.state.getUserPlaylistTrack(index);
  }

  findTrackIndex(videoId) {
    return this.state.findUserPlaylistIndex(videoId);
  }

  highlightPlaylistTrack(videoId) {
    const allTracks = document.querySelectorAll('#custom-playlist li');
    allTracks.forEach(track => track.classList.remove('playing'));
    
    const currentTrack = document.querySelector(`#custom-playlist li[data-video="${videoId}"]`);
    if (currentTrack) {
      currentTrack.classList.add('playing');
    }
  }

  highlightMainTrack(index) {
    this.dom.tracks.forEach((track, i) => {
      track.classList.toggle('playing', i === index);
    });
  }

  clearAllHighlights() {
    this.dom.tracks.forEach(track => track.classList.remove('playing'));
    document.querySelectorAll('#custom-playlist li').forEach(track => {
      track.classList.remove('playing');
    });
  }

  findMainPlaylistIndex(videoId) {
    return this.dom.tracks.findIndex(track => 
      track.getAttribute('data-video') === videoId
    );
  }
}

// Handles all playlist-related events and user interactions
class PlaylistEventHandler {
  constructor(playlistStateManager, renderer, playerManager) {
    this.playlistState = playlistStateManager;
    this.renderer = renderer;
    this.playerManager = playerManager;
  }

  handleItemClick(videoId) {
    if (!this.playlistState.state.get('playerReady')) {
      return;
    }

    if (!this.playlistState.state.get('playerInitialized')) {
      this.handleUninitializedPlayerClick(videoId);
      return;
    }

    this.handleInitializedPlayerClick(videoId);
  }

  handleUninitializedPlayerClick(videoId) {
    const originalIndex = this.playlistState.findMainPlaylistIndex(videoId);
    
    if (originalIndex >= 0) {
      this.playerManager.initializePlayerWithTrack(originalIndex);
      return;
    }

    this.playlistState.state.set('currentIndex', -1);
    this.playlistState.state.get('player').loadVideoById(videoId);
  }

  handleInitializedPlayerClick(videoId) {
    this.ensurePlayerVisible();
    
    this.playlistState.state.get('player').loadVideoById(videoId);
    this.playlistState.highlightPlaylistTrack(videoId);
    
    const originalIndex = this.playlistState.findMainPlaylistIndex(videoId);
    
    if (originalIndex >= 0) {
      this.playlistState.state.set('currentIndex', originalIndex);
      this.playlistState.highlightMainTrack(originalIndex);
    }
  }

  handleAddToPlaylistButtonClick(e, button) {
    e.stopPropagation();
    
    const trackEl = button.closest('li');
    const videoId = trackEl.getAttribute('data-video');
    const trackTitle = trackEl.querySelector('.track-title');
    const title = trackTitle.textContent.trim();
    
    if (this.playlistState.isTrackInPlaylist(videoId)) {
      this.removeFromPlaylist(videoId);
    } else {
      this.addToPlaylist(videoId, title);
    }
  }

  handleRemoveClick(videoId) {
    this.removeFromPlaylist(videoId);
  }

  addToPlaylist(videoId, title) {
    this.playlistState.addTrack({ videoId, title });
    this.renderer.updateAllButtonStates(videoId, true);
  }

  removeFromPlaylist(videoId) {
    const wasCurrentTrack = this.isCurrentTrack(videoId);
    const wasPlaying = this.playlistState.state.get('isPlaying');
    const trackIndex = this.playlistState.findTrackIndex(videoId);
    
    this.removeDOMElement(videoId);
    this.playlistState.removeTrack(videoId);
    this.renderer.updateAllButtonStates(videoId, false);
    
    if (wasCurrentTrack) {
      this.handleCurrentTrackRemoval(trackIndex, wasPlaying);
    }
  }

  removeDOMElement(videoId) {
    const playlistItem = this.playlistState.dom.customPlaylist.querySelector(`li[data-video="${videoId}"]`);
    if (playlistItem) {
      playlistItem.remove();
    }
  }

  handleCurrentTrackRemoval(trackIndex, wasPlaying) {
    this.stopCurrentPlayback();
    
    if (this.playlistState.getPlaylistLength() > 0) {
      this.selectNextTrack(trackIndex, wasPlaying);
    } else {
      this.clearPlayerState();
    }
  }

  stopCurrentPlayback() {
    const player = this.playlistState.state.get('player');
    player.pauseVideo();
    this.playlistState.state.set('isPlaying', false);
    
    this.resetProgressDisplay();
    this.updatePlayPauseButton(false);
    
    clearInterval(this.playlistState.state.get('progressInterval'));
  }

  selectNextTrack(removedIndex, wasPlaying) {
    const playlistLength = this.playlistState.getPlaylistLength();
    const nextIndex = removedIndex >= playlistLength ? 0 : removedIndex;
    const nextTrack = this.playlistState.getTrackByIndex(nextIndex);
    
    const player = this.playlistState.state.get('player');
    player.cueVideoById(nextTrack.videoId);
    this.playlistState.highlightPlaylistTrack(nextTrack.videoId);
    
    const mainPlaylistIndex = this.playlistState.findMainPlaylistIndex(nextTrack.videoId);
    
    if (mainPlaylistIndex !== -1) {
      this.playlistState.state.set('currentIndex', mainPlaylistIndex);
      this.playlistState.highlightMainTrack(mainPlaylistIndex);
    } else {
      this.playlistState.clearAllHighlights();
    }
    
    if (wasPlaying) {
      this.resumePlayback();
    }
  }

  clearPlayerState() {
    const player = this.playlistState.state.get('player');
    player.stopVideo();
    
    this.playlistState.dom.playerContainer.classList.remove('pip');
    this.playlistState.dom.playerContainer.style.display = 'none';
    this.playlistState.state.set('isVideoVisible', false);
    
    this.playlistState.clearAllHighlights();
    this.playlistState.state.set('currentIndex', -1);
    this.playlistState.state.set('isPlaying', false);
    
    this.resetProgressDisplay();
  }

  resumePlayback() {
    const player = this.playlistState.state.get('player');
    player.playVideo();
    
    this.resetProgressDisplay();
    
    if (this.controlsManager) {
      this.controlsManager.startProgressInterval();
    }
  }

  resetProgressDisplay() {
    if (this.playlistState.dom.progressBar) {
      this.playlistState.dom.progressBar.style.width = '0%';
    }
    if (this.playlistState.dom.timeDisplay) {
      this.playlistState.dom.timeDisplay.textContent = '0:00 / 0:00';
    }
  }

  updatePlayPauseButton(isPlaying) {
    if (this.playlistState.dom.playIcon && this.playlistState.dom.pauseIcon) {
      this.playlistState.dom.playIcon.style.display = isPlaying ? 'none' : 'block';
      this.playlistState.dom.pauseIcon.style.display = isPlaying ? 'block' : 'none';
    }
  }

  ensurePlayerVisible() {
    this.playlistState.dom.playerContainer.style.display = 'block';
    this.playlistState.dom.playerContainer.classList.add('pip');
    this.playlistState.dom.playerControls.classList.add('active');
  }

  isCurrentTrack(videoId) {
    return this.playerManager && this.playerManager.isCurrentTrack(videoId);
  }

  setControlsManager(controlsManager) {
    this.controlsManager = controlsManager;
  }
}

export class PlaylistManager {
  constructor(stateManager, domElements) {
    this.state = stateManager;
    this.dom = domElements;
    
    this.playlistState = new PlaylistStateManager(stateManager, domElements);
    this.validator = new PlaylistValidator(this.playlistState);
    this.renderer = new PlaylistItemRenderer();
    this.eventHandler = new PlaylistEventHandler(this.playlistState, this.renderer, null);
  }

  addToPlaylist(videoId, title, showPanelOrOptions = false) {
    let options = {};
    
    // Handle backward compatibility - if third param is boolean, treat as showPanel
    if (typeof showPanelOrOptions === 'boolean') {
      options = { showPanel: showPanelOrOptions };
    } else if (typeof showPanelOrOptions === 'object') {
      options = showPanelOrOptions;
    }
    
    const { showPanel = false } = options;
    
    if (!this.validator.canAddTrack(videoId)) {
      return;
    }
    
    this.validator.validateTrackData(videoId, title);
    
    this.playlistState.addTrack({ videoId, title });
    
    const li = this.renderer.createPlaylistItem(
      videoId, 
      title, 
      (id) => this.eventHandler.handleItemClick(id),
      (id) => this.eventHandler.handleRemoveClick(id)
    );
    
    this.dom.customPlaylist.appendChild(li);
    
    if (showPanel) {
      this.togglePlaylistPanel();
    }
    
    this.renderer.updateAllButtonStates(videoId, true);
  }

  removeFromPlaylist(videoId) {
    if (!this.validator.canRemoveTrack(videoId)) {
      return;
    }
    
    this.eventHandler.removeFromPlaylist(videoId);
  }

  highlightPlaylistTrack(videoId) {
    this.playlistState.highlightPlaylistTrack(videoId);
  }

  highlightTrack(index) {
    this.playlistState.highlightMainTrack(index);
  }

  updatePlaylistButtonState(button, isInPlaylist) {
    this.renderer.updateButtonState(button, isInPlaylist);
  }

  updateAllPlaylistButtonStates(videoId, isInPlaylist) {
    this.renderer.updateAllButtonStates(videoId, isInPlaylist);
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

  setupPlaylistButtons() {
    this.dom.playlistButton.addEventListener('click', () => this.togglePlaylistPanel());
    
    document.querySelectorAll('.add-to-playlist').forEach((button) => {
      const trackEl = button.closest('li');
      const videoId = trackEl.getAttribute('data-video');
      const isInPlaylist = this.playlistState.isTrackInPlaylist(videoId);
      this.renderer.updateButtonState(button, isInPlaylist);
      
      button.addEventListener('click', (e) => {
        this.eventHandler.handleAddToPlaylistButtonClick(e, button);
      });
    });
  }

  handleAddToPlaylistClick(e, button) {
    this.eventHandler.handleAddToPlaylistButtonClick(e, button);
  }

  setPlayerManager(playerManager) {
    this.playerManager = playerManager;
    this.eventHandler.playerManager = playerManager;
  }

  setControlsManager(controlsManager) {
    this.controlsManager = controlsManager;
    this.eventHandler.setControlsManager(controlsManager);
  }

  setupTrackClickHandlers() {
    this.dom.tracks.forEach((track, index) => {
      track.addEventListener('click', () => {
        if (this.state.get('playerReady')) {
          this.playerManager.initializePlayerWithTrack(index);
        } else {
          this.state.set('pendingTrackIndex', index);
        }
      });
    });
  }
}
