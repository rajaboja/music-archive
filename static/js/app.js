// Simplified music player - single file implementation
import { CONFIG } from './config.js';
import { formatTime, showFeedback } from './utils.js';

class MediaPlayer {
  constructor() {
    // Simple state properties instead of StateManager
    this.player = null;
    this.playlist = [];
    this.currentIndex = -1;
    this.isPlaying = false;
    this.isVideoVisible = true;
    this.loopMode = CONFIG.LOOP_MODES.NONE;
    this.progressInterval = null;
    this.volumeTimer = null;
    this.playerReady = false;
    this.playerInitialized = false;

    this.initializeElements();
    this.loadYouTubeAPI();
    this.setupEventListeners();
  }

  // DOM element initialization
  initializeElements() {
    const elementIds = {
      playerContainer: 'player-container',
      playerControls: 'player-controls',
      player: 'player',
      playPauseButton: 'play-pause',
      prevTrackButton: 'prev-track',
      nextTrackButton: 'next-track',
      loopButton: 'loop-button',
      playIcon: 'play-icon',
      pauseIcon: 'pause-icon',
      progressContainer: 'progress-container',
      progressBar: 'progress-bar',
      timeDisplay: 'time-display',
      volumeButton: 'volume-button',
      volumeSlider: 'volume-slider',
      volumeContainer: 'volume-container',
      volumeSliderContainer: 'volume-slider-container',
      playlistButton: 'playlist-button',
      playlistPanel: 'playlist-panel',
      customPlaylist: 'custom-playlist',
      modalOverlay: 'modal-overlay'
    };
    
    this.elements = {};
    for (const [key, id] of Object.entries(elementIds)) {
      const element = document.getElementById(id);
      if (!element) console.warn(`Missing element: ${id}`);
      this.elements[key] = element;
    }
    
    this.elements.tracks = [...document.querySelectorAll('#playlist li')];
  }

  // YouTube API loading
  loadYouTubeAPI() {
    if (window.YT && window.YT.Player) {
      this.onYouTubeAPIReady();
      return;
    }

    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => this.onYouTubeAPIReady();
  }

  onYouTubeAPIReady() {
    this.playerReady = true;
    console.log('YouTube API ready');
  }

  // Event listeners setup
  setupEventListeners() {
    this.setupControlButtons();
    this.setupProgressBar();
    this.setupVolumeControls();
    this.setupPlaylistControls();
    this.setupTrackClickHandlers();
    this.setupKeyboardShortcuts();
    this.setupMiscEventListeners();
  }

  setupControlButtons() {
    // Control buttons
    this.elements.playPauseButton.addEventListener('click', () => this.togglePlayPause());
    this.elements.prevTrackButton.addEventListener('click', () => this.playPrevious());
    this.elements.nextTrackButton.addEventListener('click', () => this.playNext());
    this.elements.loopButton.addEventListener('click', () => this.toggleLoop());
  }

  setupProgressBar() {
    // Progress bar
    this.elements.progressContainer.addEventListener('click', (e) => this.handleProgressClick(e));
    this.elements.progressContainer.addEventListener('mousemove', (e) => this.handleProgressHover(e));
    this.elements.progressContainer.addEventListener('mouseleave', () => this.handleProgressLeave());
  }

  setupVolumeControls() {
    // Volume controls
    this.elements.volumeButton.addEventListener('click', () => this.toggleMute());
    this.elements.volumeSlider.addEventListener('input', (e) => this.handleVolumeChange(e));
    this.setupVolumeSliderBehavior();
  }

  setupPlaylistControls() {
    // Playlist
    this.elements.playlistButton.addEventListener('click', () => this.togglePlaylistPanel());
    this.elements.modalOverlay.addEventListener('click', () => this.togglePlaylistPanel());
  }

  setupTrackClickHandlers() {
    // Track clicks
    this.elements.tracks.forEach((track, index) => {
      track.addEventListener('click', () => this.playTrack(index));
    });

    // Add to playlist buttons
    document.querySelectorAll('.add-to-playlist').forEach(button => {
      button.addEventListener('click', (e) => this.handleAddToPlaylistClick(e, button));
    });
  }

  setupKeyboardShortcuts() {
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
  }

  setupMiscEventListeners() {
    // Video visibility toggle
    this.elements.playerControls.addEventListener('click', (e) => {
      if (e.target.closest('.player-controls-inner')) return;
      this.toggleVideoVisibility();
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => this.cleanup());
  }

  // Volume slider show/hide behavior
  setupVolumeSliderBehavior() {
    this.elements.volumeContainer.addEventListener('mouseenter', () => {
      clearTimeout(this.volumeTimer);
      this.elements.volumeSliderContainer.style.display = 'flex';
    });

    this.elements.volumeContainer.addEventListener('mouseleave', () => {
      this.volumeTimer = setTimeout(() => {
        this.elements.volumeSliderContainer.style.display = 'none';
      }, CONFIG.TIMINGS.volumeHideDelay);
    });
  }

  // Player creation and initialization
  createPlayer(videoId, trackIndex) {
    if (!this.playerReady) {
      console.warn('YouTube API not ready yet');
      return false;
    }

    try {
      this.showLoadingState();
      this.player = new YT.Player('player', {
        ...CONFIG.PLAYER,
        videoId,
        events: {
          'onReady': (event) => this.onPlayerReady(event, trackIndex, videoId),
          'onStateChange': (event) => this.onPlayerStateChange(event),
          'onError': (event) => this.onPlayerError(event)
        }
      });
      return true;
    } catch (error) {
      console.error('Failed to create player:', error);
      this.hideLoadingState();
      return false;
    }
  }

  onPlayerReady(event, trackIndex, videoId) {
    this.playerInitialized = true;
    this.hideLoadingState();
    
    event.target.playVideo();
    
    setTimeout(() => this.checkInitialPlaybackState(), CONFIG.TIMINGS.playAttemptDelay);
    this.setCurrentTrack(trackIndex, videoId);
  }

  checkInitialPlaybackState() {
    const isPlaying = this.player.getPlayerState() === YT.PlayerState.PLAYING;
    this.updatePlayPauseButtons(isPlaying);
    if (isPlaying) this.startProgressInterval();
  }

  setCurrentTrack(trackIndex, videoId) {
    this.highlightTrack(trackIndex);
    this.highlightPlaylistTrack(videoId);
    this.currentIndex = trackIndex;
  }

  onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
      this.handleTrackEnded();
    }
    this.updatePlayPauseButtons(event.data === YT.PlayerState.PLAYING);
    
    if (event.data === YT.PlayerState.PLAYING) {
      this.startProgressInterval();
    } else {
      clearInterval(this.progressInterval);
    }
  }

  // Track playback methods
  playTrack(index) {
    if (!this.playerReady || !this.isValidTrackIndex(index)) return;

    const { videoId, title } = this.getTrackData(index);
    
    if (!this.isInPlaylist(videoId)) {
      this.addToPlaylist(videoId, title, false);
    }

    if (this.playerInitialized) {
      this.loadExistingPlayerTrack(videoId, index);
    } else {
      this.createPlayer(videoId, index);
    }
  }

  isValidTrackIndex(index) {
    return index >= 0 && index < this.elements.tracks.length;
  }

  getTrackData(index) {
    const track = this.elements.tracks[index];
    return {
      videoId: track.getAttribute('data-video'),
      title: track.querySelector('.track-title').textContent.trim()
    };
  }

  loadExistingPlayerTrack(videoId, index) {
    this.player.loadVideoById(videoId);
    this.highlightTrack(index);
    this.highlightPlaylistTrack(videoId);
    this.currentIndex = index;
    this.showPlayerControls();
  }

  togglePlayPause() {
    if (!this.player || this.playlist.length === 0) return;

    if (this.isPlaying) {
      this.player.pauseVideo();
      return;
    }

    const currentVideoId = this.getCurrentVideoId();
    const shouldPlayFirstTrack = !currentVideoId || !this.isInPlaylist(currentVideoId);
    
    if (shouldPlayFirstTrack) {
      this.playPlaylistTrack(0);
    } else {
      this.player.playVideo();
    }
  }

  playNext() {
    if (this.playlist.length === 0) return;
    
    const currentVideoId = this.getCurrentVideoId();
    const playlistIndex = this.findPlaylistIndex(currentVideoId);
    
    if (playlistIndex === -1) return;
    
    let nextIndex = playlistIndex + 1;
    if (nextIndex >= this.playlist.length) {
      nextIndex = 0;
    }
    
    this.playPlaylistTrack(nextIndex);
  }

  playPrevious() {
    if (this.playlist.length === 0) return;
    
    const currentVideoId = this.getCurrentVideoId();
    const playlistIndex = this.findPlaylistIndex(currentVideoId);
    
    if (playlistIndex === -1) return;
    
    let prevIndex = playlistIndex - 1;
    if (prevIndex < 0) {
      prevIndex = this.playlist.length - 1;
    }
    
    this.playPlaylistTrack(prevIndex);
  }

  playPlaylistTrack(playlistIndex) {
    const track = this.playlist[playlistIndex];
    if (!track) return;

    this.player.loadVideoById(track.videoId);
    this.highlightPlaylistTrack(track.videoId);
    
    // Update main playlist highlighting if track exists there
    const mainIndex = this.elements.tracks.findIndex(t => 
      t.getAttribute('data-video') === track.videoId
    );
    if (mainIndex !== -1) {
      this.highlightTrack(mainIndex);
      this.currentIndex = mainIndex;
    } else {
      this.clearMainPlaylistHighlighting();
    }
  }

  handleTrackEnded() {
    if (this.loopMode === CONFIG.LOOP_MODES.SINGLE) {
      this.player.seekTo(0);
      this.player.playVideo();
      return;
    }

    if (this.playlist.length === 0) {
      this.updatePlayPauseButtons(false);
      return;
    }

    const currentVideoId = this.getCurrentVideoId();
    const playlistIndex = this.findPlaylistIndex(currentVideoId);
    
    if (playlistIndex === -1) {
      this.updatePlayPauseButtons(false);
      return;
    }

    const isLastTrack = playlistIndex === this.playlist.length - 1;
    
    if (isLastTrack && this.loopMode === CONFIG.LOOP_MODES.NONE) {
      this.updatePlayPauseButtons(false);
    } else {
      this.playNext();
    }
  }

  // Playlist management
  addToPlaylist(videoId, title, showPanel = false) {
    if (this.isInPlaylist(videoId)) return;

    this.playlist.push({ videoId, title });
    this.createPlaylistItem(videoId, title);
    this.updateAllPlaylistButtons(videoId, true);
    
    if (showPanel) {
      this.togglePlaylistPanel();
    }
  }

  removeFromPlaylist(videoId) {
    const index = this.findPlaylistIndex(videoId);
    if (index === -1) return;

    const wasCurrentTrack = this.getCurrentVideoId() === videoId;
    
    this.playlist.splice(index, 1);
    this.removePlaylistItem(videoId);
    this.updateAllPlaylistButtons(videoId, false);

    if (wasCurrentTrack && this.playlist.length > 0) {
      const nextIndex = index >= this.playlist.length ? 0 : index;
      this.playPlaylistTrack(nextIndex);
    } else if (this.playlist.length === 0) {
      this.stopPlayback();
    }
  }

  createPlaylistItem(videoId, title) {
    const li = document.createElement('li');
    li.setAttribute('data-video', videoId);
    li.innerHTML = `
      <div class="track-info">
        <span class="track-title">${title}</span>
      </div>
      <div class="track-controls">
        <button class="remove-btn" title="Remove from playlist">✕</button>
      </div>
    `;

    li.addEventListener('click', () => this.playPlaylistTrackById(videoId));
    li.querySelector('.remove-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeFromPlaylist(videoId);
    });

    this.elements.customPlaylist.appendChild(li);
  }

  removePlaylistItem(videoId) {
    const item = this.elements.customPlaylist.querySelector(`li[data-video="${videoId}"]`);
    if (item) item.remove();
  }

  playPlaylistTrackById(videoId) {
    const index = this.findPlaylistIndex(videoId);
    if (index !== -1) {
      this.playPlaylistTrack(index);
    }
  }

  // Control methods
  toggleLoop() {
    if (this.loopMode === CONFIG.LOOP_MODES.NONE) {
      this.loopMode = CONFIG.LOOP_MODES.SINGLE;
    } else if (this.loopMode === CONFIG.LOOP_MODES.SINGLE) {
      this.loopMode = CONFIG.LOOP_MODES.PLAYLIST;
    } else {
      this.loopMode = CONFIG.LOOP_MODES.NONE;
    }
    this.updateLoopButtonUI();
  }

  toggleMute() {
    if (!this.player) return;
    
    if (this.player.isMuted()) {
      this.player.unMute();
    } else {
      this.player.mute();
    }
    this.updateVolumeUI();
  }

  toggleVideoVisibility() {
    this.isVideoVisible = !this.isVideoVisible;
    
    if (this.isVideoVisible) {
      this.elements.playerContainer.style.opacity = '1';
      this.elements.playerContainer.style.pointerEvents = 'auto';
    } else {
      this.elements.playerContainer.style.opacity = '0';
      this.elements.playerContainer.style.pointerEvents = 'none';
    }
  }

  togglePlaylistPanel() {
    const isActive = this.elements.playlistPanel.classList.contains('active');
    
    if (isActive) {
      this.elements.playlistPanel.classList.remove('active');
      document.body.style.overflow = '';
    } else {
      this.elements.playlistPanel.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  // Progress and volume handling
  handleProgressClick(e) {
    if (!this.player) return;
    
    const rect = this.elements.progressContainer.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const duration = this.player.getDuration();
    this.player.seekTo(duration * percent, true);
  }

  handleProgressHover(e) {
    if (!this.player) return;
    
    const rect = this.elements.progressContainer.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const duration = this.player.getDuration();
    const time = duration * percent;
    
    this.elements.progressContainer.title = `Seek to ${formatTime(time)}`;
  }

  handleProgressLeave() {
    this.elements.progressContainer.title = 'Click to seek';
  }

  handleVolumeChange(e) {
    if (!this.player) return;
    
    const volume = parseInt(e.target.value);
    this.player.setVolume(volume);
    this.updateVolumeButtonState(volume === 0);
  }

  handleAddToPlaylistClick(e, button) {
    e.stopPropagation();
    
    const trackEl = button.closest('li');
    const videoId = trackEl.getAttribute('data-video');
    const title = trackEl.querySelector('.track-title').textContent.trim();
    
    if (this.isInPlaylist(videoId)) {
      this.removeFromPlaylist(videoId);
    } else {
      this.addToPlaylist(videoId, title);
    }
  }

  // Keyboard shortcuts
  handleKeyboardShortcuts(e) {
    if (this.elements.playlistPanel.classList.contains('active')) {
      if (e.key === 'Escape') this.togglePlaylistPanel();
      return;
    }

    if (!this.elements.playerControls.classList.contains('active')) return;

    const action = CONFIG.KEYBOARD.shortcuts[e.code];
    if (!action) return;

    e.preventDefault();
    this[action]?.();
  }

  // UI update methods
  updatePlayPauseButtons(isPlaying) {
    this.isPlaying = isPlaying;
    
    if (isPlaying) {
      this.elements.playIcon.style.display = 'none';
      this.elements.pauseIcon.style.display = 'block';
    } else {
      this.elements.playIcon.style.display = 'block';
      this.elements.pauseIcon.style.display = 'none';
    }
  }

  updateLoopButtonUI() {
    this.elements.loopButton.classList.remove('loop-single', 'loop-playlist');
    
    if (this.loopMode === CONFIG.LOOP_MODES.SINGLE) {
      this.elements.loopButton.classList.add('loop-single');
      this.elements.loopButton.title = 'Loop Single Track (L)';
    } else if (this.loopMode === CONFIG.LOOP_MODES.PLAYLIST) {
      this.elements.loopButton.classList.add('loop-playlist');
      this.elements.loopButton.title = 'Loop Playlist (L)';
    } else {
      this.elements.loopButton.title = 'No Loop (L)';
    }
  }

  updateVolumeUI() {
    if (!this.player) return;
    
    const volume = this.player.getVolume();
    const isMuted = this.player.isMuted();
    
    this.elements.volumeSlider.value = volume;
    this.updateVolumeButtonState(isMuted);
  }

  updateVolumeButtonState(isMuted) {
    if (isMuted) {
      this.elements.volumeButton.classList.add('muted');
    } else {
      this.elements.volumeButton.classList.remove('muted');
    }
  }

  updateAllPlaylistButtons(videoId, isInPlaylist) {
    const buttons = document.querySelectorAll('.add-to-playlist');
    
    buttons.forEach(button => {
      const trackEl = button.closest('li');
      if (trackEl?.getAttribute('data-video') !== videoId) return;
      
      button.innerHTML = isInPlaylist ? '✓' : '+';
      button.title = isInPlaylist ? 'Remove from Playlist' : 'Add to Playlist';
    });
  }

  highlightTrack(index) {
    this.elements.tracks.forEach((track, i) => {
      track.classList.toggle('playing', i === index);
    });
  }

  highlightPlaylistTrack(videoId) {
    const allTracks = this.elements.customPlaylist.querySelectorAll('li');
    allTracks.forEach(track => track.classList.remove('playing'));
    
    const currentTrack = this.elements.customPlaylist.querySelector(`li[data-video="${videoId}"]`);
    if (currentTrack) {
      currentTrack.classList.add('playing');
    }
  }

  clearMainPlaylistHighlighting() {
    this.elements.tracks.forEach(track => track.classList.remove('playing'));
  }

  // Progress tracking
  startProgressInterval() {
    clearInterval(this.progressInterval);
    this.progressInterval = setInterval(() => this.updateProgressBar(), CONFIG.TIMINGS.progressUpdateInterval);
  }

  updateProgressBar() {
    if (!this.player) return;
    
    const currentTime = this.player.getCurrentTime() || 0;
    const duration = this.player.getDuration() || 0;
    
    if (!duration) return;
    
    const percent = (currentTime / duration) * 100;
    this.elements.progressBar.style.width = `${percent}%`;
    this.elements.timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
  }

  // Utility methods
  showLoadingState() {
    this.elements.playerContainer.classList.add('pip', 'loading');
    this.elements.playerControls.classList.add('active');
    this.elements.playerContainer.style.opacity = '1';
    this.elements.playerContainer.style.pointerEvents = 'auto';
    this.isVideoVisible = true;
  }

  hideLoadingState() {
    this.elements.playerContainer.classList.remove('loading');
  }

  showPlayerControls() {
    this.elements.playerControls.classList.add('active');
  }

  stopPlayback() {
    if (this.player) {
      this.player.stopVideo();
    }
    this.updatePlayPauseButtons(false);
    this.clearMainPlaylistHighlighting();
    this.elements.playerContainer.classList.remove('pip');
    this.elements.playerContainer.style.display = 'none';
    this.isVideoVisible = false;
  }

  seekBackward() {
    if (!this.player) return;
    const currentTime = this.player.getCurrentTime();
    this.player.seekTo(Math.max(0, currentTime - 5), true);
  }

  seekForward() {
    if (!this.player) return;
    const currentTime = this.player.getCurrentTime();
    const duration = this.player.getDuration();
    this.player.seekTo(Math.min(duration, currentTime + 5), true);
  }

  volumeUp() {
    if (!this.player) return;
    const currentVolume = this.player.getVolume();
    const newVolume = Math.min(100, currentVolume + 5);
    this.player.setVolume(newVolume);
    this.updateVolumeUI();
  }

  volumeDown() {
    if (!this.player) return;
    const currentVolume = this.player.getVolume();
    const newVolume = Math.max(0, currentVolume - 5);
    this.player.setVolume(newVolume);
    this.updateVolumeUI();
  }

  getCurrentVideoId() {
    if (!this.player || !this.player.getVideoData) return null;
    const videoData = this.player.getVideoData();
    return videoData ? videoData.video_id : null;
  }

  isInPlaylist(videoId) {
    return this.playlist.some(track => track.videoId === videoId);
  }

  findPlaylistIndex(videoId) {
    return this.playlist.findIndex(track => track.videoId === videoId);
  }

  cleanup() {
    clearInterval(this.progressInterval);
    clearTimeout(this.volumeTimer);
    if (this.player && this.isPlaying) {
      this.player.pauseVideo();
    }
    console.log('Media Player cleaned up');
  }

  // Public API methods for external access
  getState() {
    return {
      player: this.player,
      playlist: this.playlist,
      currentIndex: this.currentIndex,
      isPlaying: this.isPlaying,
      loopMode: this.loopMode
    };
  }

  getPlayer() {
    return this.player;
  }

  getUserPlaylist() {
    return this.playlist;
  }

  addTrackToPlaylist(videoId, title) {
    this.addToPlaylist(videoId, title);
  }

  removeTrackFromPlaylist(videoId) {
    this.removeFromPlaylist(videoId);
  }

  setLoopMode(mode) {
    if (Object.values(CONFIG.LOOP_MODES).includes(mode)) {
      this.loopMode = mode;
      this.updateLoopButtonUI();
    }
  }

  setVolume(volume) {
    if (this.player && volume >= 0 && volume <= 100) {
      this.player.setVolume(volume);
      this.elements.volumeSlider.value = volume;
    }
  }

  mute() {
    this.toggleMute();
  }

  seekTo(seconds) {
    if (this.player) {
      this.player.seekTo(seconds, true);
    }
  }

  seekToPercent(percent) {
    if (this.player && percent >= 0 && percent <= 100) {
      const duration = this.player.getDuration();
      this.player.seekTo((duration * percent) / 100, true);
    }
  }
}

// Initialize the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.mediaPlayer = new MediaPlayer();
  });
} else {
  window.mediaPlayer = new MediaPlayer();
}

export default MediaPlayer;
