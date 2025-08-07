// Playlist management for the media player

// Validates playlist operations and business rules
class PlaylistValidator {
  constructor(playlistStateManager) {
    this.playlistState = playlistStateManager;
  }

  canAddTrack(videoId) {
    return !this.playlistState.isTrackInPlaylist(videoId);
  }

  canRemoveTrack(videoId) {
    return this.playlistState.isTrackInPlaylist(videoId);
  }

  isPlaylistEmpty() {
    return this.playlistState.getPlaylistLength() === 0;
  }

  validateTrackData(videoId, title) {
    if (!videoId || typeof videoId !== 'string') {
      throw new Error('Invalid video ID');
    }
    
    if (!title || typeof title !== 'string') {
      throw new Error('Invalid track title');
    }
    
    return true;
  }
}

// Handles DOM creation and rendering for playlist items
class PlaylistItemRenderer {
  constructor() {
    this.icons = {
      add: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14 10H2v2h12v-2zm0-4H2v2h12V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM2 16h8v-2H2v2z"/></svg>',
      added: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"></polyline></svg>',
      remove: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>'
    };
  }

  createPlaylistItem(videoId, title, onItemClick, onRemoveClick) {
    const li = document.createElement('li');
    li.setAttribute('data-video', videoId);
    li.setAttribute('role', 'listitem');
    
    const trackInfo = this.createTrackInfo(title);
    const trackControls = this.createTrackControls(videoId, title, onRemoveClick);
    
    li.appendChild(trackInfo);
    li.appendChild(trackControls);
    
    li.addEventListener('click', () => onItemClick(videoId));
    
    return li;
  }

  createTrackInfo(title) {
    const trackInfo = document.createElement('div');
    trackInfo.classList.add('track-info');
    
    const trackTitle = document.createElement('span');
    trackTitle.classList.add('track-title');
    trackTitle.textContent = title;
    trackInfo.appendChild(trackTitle);
    
    return trackInfo;
  }

  createTrackControls(videoId, title, onRemoveClick) {
    const trackControls = document.createElement('div');
    trackControls.classList.add('track-controls');
    
    const removeButton = this.createRemoveButton(videoId, title, onRemoveClick);
    trackControls.appendChild(removeButton);
    
    return trackControls;
  }

  createRemoveButton(videoId, title, onRemoveClick) {
    const removeButton = document.createElement('button');
    removeButton.classList.add('add-to-playlist');
    removeButton.title = 'Remove from Playlist';
    removeButton.setAttribute('aria-label', `Remove ${title} from playlist`);
    removeButton.innerHTML = this.icons.remove;
    
    removeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      onRemoveClick(videoId);
    });
    
    return removeButton;
  }

  updateButtonState(button, isInPlaylist) {
    if (isInPlaylist) {
      button.innerHTML = this.icons.added;
      button.title = 'Remove from Playlist';
      button.classList.add('in-playlist');
    } else {
      button.innerHTML = this.icons.add;
      button.title = 'Add to Playlist';
      button.classList.remove('in-playlist');
    }
  }

  updateAllButtonStates(videoId, isInPlaylist) {
    document.querySelectorAll(`li[data-video="${videoId}"] .add-to-playlist`).forEach(button => {
      this.updateButtonState(button, isInPlaylist);
    });
  }
}

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
