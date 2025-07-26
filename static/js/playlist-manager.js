// Playlist management for the media player
export class PlaylistManager {
  constructor(stateManager, domElements) {
    this.state = stateManager;
    this.dom = domElements;
  }

  addToPlaylist(videoId, title, showPanel = false) {
    // Check if already in playlist
    if (this.state.isInUserPlaylist(videoId)) {
      return; // Skip if already in playlist
    }
    
    // Add to playlist array
    this.state.addToUserPlaylist({ videoId, title });
    
    // Create playlist entry
    const li = this.createPlaylistItem(videoId, title);
    
    // Add to DOM
    this.dom.customPlaylist.appendChild(li);
    
    // Show playlist if not visible and showPanel is true
    if (showPanel) {
      this.togglePlaylistPanel();
    }
    
    // Update all matching buttons to show "added" state
    this.updateAllPlaylistButtonStates(videoId, true);
  }

  createPlaylistItem(videoId, title) {
    const li = document.createElement('li');
    li.setAttribute('data-video', videoId);
    li.setAttribute('role', 'listitem');
    
    // Create track info element
    const trackInfo = document.createElement('div');
    trackInfo.classList.add('track-info');
    
    const trackTitle = document.createElement('span');
    trackTitle.classList.add('track-title');
    trackTitle.textContent = title;
    trackInfo.appendChild(trackTitle);
    
    // Create track controls with remove button
    const trackControls = document.createElement('div');
    trackControls.classList.add('track-controls');
    
    const removeButton = this.createRemoveButton(videoId, title, li);
    trackControls.appendChild(removeButton);
    
    // Add elements to the li
    li.appendChild(trackInfo);
    li.appendChild(trackControls);
    
    // Add click handler to play the track
    li.addEventListener('click', () => this.handlePlaylistItemClick(videoId));
    
    return li;
  }

  createRemoveButton(videoId, title, li) {
    const removeButton = document.createElement('button');
    removeButton.classList.add('add-to-playlist');
    removeButton.title = 'Remove from Playlist';
    removeButton.setAttribute('aria-label', `Remove ${title} from playlist`);
    // Use a better remove icon - X/cross
    removeButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
    
    // Remove track when clicked
    removeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeFromPlaylist(videoId);
    });
    
    return removeButton;
  }

  handleRemoveFromPlaylist(e, videoId, li) {
    e.stopPropagation();
    
    // Check if this is the currently playing track
    const isCurrentTrack = this.playerManager && this.playerManager.isCurrentTrack(videoId);
    
    // Store the current play/pause state before removal
    const wasPlaying = this.state.get('isPlaying');
    
    // Find the index of this track in the playlist before we remove it
    const trackIndexBeforeRemoval = this.state.findUserPlaylistIndex(videoId);
    
    // Remove from DOM and filter from playlist array
    li.remove();
    this.state.removeFromUserPlaylist(videoId);
    
    // If we're removing the currently playing track
    if (isCurrentTrack) {
      this.handleCurrentTrackRemoval(trackIndexBeforeRemoval, wasPlaying);
    }
  }

  handleCurrentTrackRemoval(trackIndexBeforeRemoval, wasPlaying) {
    const player = this.state.get('player');
    
    // Immediate Stop Approach: Stop playback immediately
    player.pauseVideo();
    this.state.set('isPlaying', false);
    
    // Reset progress bar and time display
    if (this.dom.progressBar) {
      this.dom.progressBar.style.width = '0%';
    }
    if (this.dom.timeDisplay) {
      this.dom.timeDisplay.textContent = '0:00 / 0:00';
    }
    
    // Clear progress update interval
    clearInterval(this.state.get('progressInterval'));
    
    // Update UI to show play button
    if (this.dom.playIcon && this.dom.pauseIcon) {
      this.dom.playIcon.style.display = 'block';
      this.dom.pauseIcon.style.display = 'none';
    }
    
    // If there are other tracks in the playlist, select the next track while maintaining pause state
    if (this.state.getUserPlaylistLength() > 0) {
      this.selectNextTrackAfterRemoval(trackIndexBeforeRemoval, wasPlaying);
    } else {
      // If playlist is now empty, completely clear the player state
      this.clearPlayerState();
    }
  }

  clearPlayerState() {
    const player = this.state.get('player');
    
    // Stop the video completely and clear it
    player.stopVideo();
    
    // Hide only the player container, keep controls visible
    this.dom.playerContainer.classList.remove('pip');
    this.dom.playerContainer.style.display = 'none';
    this.state.set('isVideoVisible', false);
    
    // Keep the player controls visible - don't remove 'active' class
    // this.dom.playerControls.classList.remove('active'); // Commented out
    
    // Clear highlighting from all tracks
    this.dom.tracks.forEach(track => track.classList.remove('playing'));
    
    // Reset current index
    this.state.set('currentIndex', -1);
    
    // Clear any playing states
    this.state.set('isPlaying', false);
    
    // Reset progress bar and time display
    if (this.dom.progressBar) {
      this.dom.progressBar.style.width = '0%';
    }
    if (this.dom.timeDisplay) {
      this.dom.timeDisplay.textContent = '0:00 / 0:00';
    }
  }

  selectNextTrackAfterRemoval(trackIndexBeforeRemoval, wasPlaying) {
    const userPlaylistLength = this.state.getUserPlaylistLength();
    
    // Determine next track index - loop to start if we removed the last track
    const nextIndex = trackIndexBeforeRemoval >= userPlaylistLength ? 0 : trackIndexBeforeRemoval;
    
    const nextTrack = this.state.getUserPlaylistTrack(nextIndex);
    const player = this.state.get('player');
    
    // Load video but don't play it
    player.cueVideoById(nextTrack.videoId);
    this.highlightPlaylistTrack(nextTrack.videoId);
    
    // Handle main playlist highlighting
    const mainPlaylistIndex = this.dom.tracks.findIndex(track => 
      track.getAttribute('data-video') === nextTrack.videoId
    );
    
    if (mainPlaylistIndex !== -1) {
      this.state.set('currentIndex', mainPlaylistIndex);
      this.highlightTrack(mainPlaylistIndex);
      return this.handlePlaybackIfWasPlaying(wasPlaying, player);
    }
    
    // Clear highlighting if not in main playlist
    this.dom.tracks.forEach(track => track.classList.remove('playing'));
    this.handlePlaybackIfWasPlaying(wasPlaying, player);
  }

  handlePlaybackIfWasPlaying(wasPlaying, player) {
    if (!wasPlaying) return;
    
    player.playVideo();
    
    if (this.dom.progressBar) {
      this.dom.progressBar.style.width = '0%';
    }
    
    if (this.controlsManager) {
      this.controlsManager.startProgressInterval();
    }
  }

  handlePlaylistItemClick(videoId) {
    if (!this.state.get('playerReady')) {
      return;
    }

    if (!this.state.get('playerInitialized')) {
      this.handleUninitializedPlayer(videoId);
      return;
    }

    this.handleInitializedPlayer(videoId);
  }

  handleUninitializedPlayer(videoId) {
    const originalIndex = this.dom.tracks.findIndex(t => 
      t.getAttribute('data-video') === videoId
    );
    
    if (originalIndex >= 0) {
      this.playerManager.initializePlayerWithTrack(originalIndex);
      return;
    }

    // If not in original list, create a temp option
    this.state.set('currentIndex', -1); // Special flag
    this.state.get('player').loadVideoById(videoId);
  }

  handleInitializedPlayer(videoId) {
    // Ensure player container is configured for playback
    this.dom.playerContainer.style.display = 'block';
    this.dom.playerContainer.classList.add('pip');
    
    // Ensure controls are visible
    this.dom.playerControls.classList.add('active');
    
    this.state.get('player').loadVideoById(videoId);
    this.highlightPlaylistTrack(videoId);
    
    // Also highlight in main playlist if the track exists there
    const originalIndex = this.dom.tracks.findIndex(t => 
      t.getAttribute('data-video') === videoId
    );
    
    if (originalIndex >= 0) {
      this.state.set('currentIndex', originalIndex);
      this.highlightTrack(originalIndex);
    }
  }

  removeFromPlaylist(videoId) {
    // Find and remove the track from DOM
    const playlistItem = this.dom.customPlaylist.querySelector(`li[data-video="${videoId}"]`);
    if (playlistItem) {
      this.handleRemoveFromPlaylist({ stopPropagation: () => {} }, videoId, playlistItem);
    }
    
    // Update all matching buttons to show "add" state
    this.updateAllPlaylistButtonStates(videoId, false);
  }

  highlightPlaylistTrack(videoId) {
    // Remove highlight from all tracks
    const allTracks = document.querySelectorAll('#custom-playlist li');
    allTracks.forEach(track => track.classList.remove('playing'));
    
    // Add highlight to current track
    const currentTrack = document.querySelector(`#custom-playlist li[data-video="${videoId}"]`);
    if (currentTrack) {
      currentTrack.classList.add('playing');
    }
  }

  highlightTrack(index) {
    this.dom.tracks.forEach((track, i) => {
      track.classList.toggle('playing', i === index);
    });
  }

  updatePlaylistButtonState(button, isInPlaylist) {
    if (isInPlaylist) {
      // Show "remove" state - outline checkmark icon and different styling
      button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"></polyline></svg>';
      button.title = 'Remove from Playlist';
      button.classList.add('in-playlist');
    } else {
      // Show "add" state - plus icon
      button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14 10H2v2h12v-2zm0-4H2v2h12V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM2 16h8v-2H2v2z"/></svg>';
      button.title = 'Add to Playlist';
      button.classList.remove('in-playlist');
    }
  }

  updateAllPlaylistButtonStates(videoId, isInPlaylist) {
    document.querySelectorAll(`li[data-video="${videoId}"] .add-to-playlist`).forEach(button => {
      this.updatePlaylistButtonState(button, isInPlaylist);
    });
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
    // Setup playlist button
    this.dom.playlistButton.addEventListener('click', () => this.togglePlaylistPanel());
    
    // Add event listeners to "add to playlist" buttons
    document.querySelectorAll('.add-to-playlist').forEach((button) => {
      // Initialize button state
      const trackEl = button.closest('li');
      const videoId = trackEl.getAttribute('data-video');
      const isInPlaylist = this.state.isInUserPlaylist(videoId);
      this.updatePlaylistButtonState(button, isInPlaylist);
      
      button.addEventListener('click', (e) => {
        this.handleAddToPlaylistClick(e, button);
      });
    });
  }

  handleAddToPlaylistClick(e, button) {
    e.stopPropagation(); // Prevent track from playing
    
    const trackEl = button.closest('li');
    const videoId = trackEl.getAttribute('data-video');
    
    // Get the track title
    const trackTitle = trackEl.querySelector('.track-title');
    const title = trackTitle.textContent.trim();
    
    // Check if already in playlist
    if (this.state.isInUserPlaylist(videoId)) {
      // Remove from playlist
      this.removeFromPlaylist(videoId);
      // Update button to show "add" state
      this.updatePlaylistButtonState(button, false);
    } else {
      // Add to playlist
      this.addToPlaylist(videoId, title);
      // Update button to show "added" state
      this.updatePlaylistButtonState(button, true);
    }
  }

  setupTrackClickHandlers() {
    // Add click event listeners to tracks in Recent Additions
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

  // Set references to other managers
  setPlayerManager(playerManager) {
    this.playerManager = playerManager;
  }

  setControlsManager(controlsManager) {
    this.controlsManager = controlsManager;
  }
}
