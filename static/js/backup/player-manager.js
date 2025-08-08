// Refactored player management with focused services in a single file
import { CONFIG } from './config.js';

// YouTube API loading and initialization
class YouTubeAPIManager {
  constructor() {
    this.apiReadyCallback = null;
    this.isAPILoaded = false;
  }

  loadYouTubeAPI() {
    if (this.isAPILoaded) return;
    
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => this.onYouTubeIframeAPIReady();
  }

  onYouTubeIframeAPIReady() {
    this.isAPILoaded = true;
    if (this.apiReadyCallback) {
      this.apiReadyCallback();
    }
  }

  onAPIReady(callback) {
    this.apiReadyCallback = callback;
    if (this.isAPILoaded) {
      callback();
    }
  }

  createPlayer(elementId, videoId, events) {
    if (!this.isAPILoaded) {
      throw new Error('YouTube API not loaded');
    }

    return new YT.Player(elementId, {
      ...CONFIG.PLAYER,
      videoId: videoId,
      events: events
    });
  }
}

// UI state management for the player
class PlayerUIController {
  constructor(domElements, stateManager) {
    this.dom = domElements;
    this.state = stateManager;
  }

  setupLoadingState() {
    this.dom.playerContainer.classList.add('pip');
    this.dom.playerContainer.classList.add('loading');
    this.dom.playerControls.classList.add('active');
    
    this.dom.playerContainer.style.opacity = '1';
    this.dom.playerContainer.style.pointerEvents = 'auto';
    this.state.set('isVideoVisible', true);
  }

  removeLoadingState() {
    this.dom.playerContainer.classList.remove('loading');
  }

  updatePlayPauseButtons(isPlaying) {
    this.state.set('isPlaying', isPlaying);
    
    if (isPlaying) {
      this.dom.playIcon.style.display = 'none';
      this.dom.pauseIcon.style.display = 'block';
    } else {
      this.dom.playIcon.style.display = 'block';
      this.dom.pauseIcon.style.display = 'none';
    }
  }

  showPlayerControls() {
    this.dom.playerControls.classList.add('active');
  }

  ensureVideoVisible() {
    this.dom.playerContainer.style.opacity = '1';
    this.dom.playerContainer.style.pointerEvents = 'auto';
    this.state.set('isVideoVisible', true);
  }

  clearMainPlaylistHighlighting() {
    this.dom.tracks.forEach(track => track.classList.remove('playing'));
  }
}

// Track navigation and playback logic
class TrackNavigationService {
  constructor(stateManager, domElements, playlistManager, uiController) {
    this.state = stateManager;
    this.dom = domElements;
    this.playlistManager = playlistManager;
    this.uiController = uiController;
  }

  handleTrackEnded() {
    const loopMode = this.state.get('loopMode');
    
    if (loopMode === CONFIG.LOOP_MODES.SINGLE) {
      this._replayCurrentTrack();
      return;
    }
    
    if (this.state.getUserPlaylistLength() === 0) {
      this._stopPlayback();
      return;
    }
    
    const currentVideoId = this._getCurrentVideoId();
    const currentIndex = this.state.findUserPlaylistIndex(currentVideoId);
    
    if (currentIndex === -1) {
      this._stopPlayback();
      return;
    }
    
    const isLastTrack = currentIndex === this.state.getUserPlaylistLength() - 1;
    
    if (isLastTrack && loopMode === CONFIG.LOOP_MODES.NONE) {
      this._stopPlayback();
    } else {
      this.playNext();
    }
  }

  playNext() {
    this._playTrackAtOffset(1);
  }

  playPrevious() {
    this._playTrackAtOffset(-1);
  }

  playFirstTrackFromPlaylist() {
    const firstTrack = this.state.getUserPlaylistTrack(0);
    const player = this.state.get('player');
    
    player.loadVideoById(firstTrack.videoId);
    this.playlistManager.highlightPlaylistTrack(firstTrack.videoId);
  }

  resumeCurrentTrack() {
    const player = this.state.get('player');
    player.playVideo();
  }

  _replayCurrentTrack() {
    const player = this.state.get('player');
    player.seekTo(0);
    player.playVideo();
  }

  _stopPlayback() {
    this.uiController.updatePlayPauseButtons(false);
  }

  _getCurrentVideoId() {
    const player = this.state.get('player');
    return player?.getVideoData()?.video_id || null;
  }

  _playTrackAtOffset(offset) {
    const player = this.state.get('player');
    const userPlaylistLength = this.state.getUserPlaylistLength();
    
    if (userPlaylistLength === 0) return;
    
    const currentVideoId = player.getVideoData().video_id;
    const currentPlaylistIndex = this.state.findUserPlaylistIndex(currentVideoId);
    
    if (currentPlaylistIndex === -1) return;
    
    let targetIndex = currentPlaylistIndex + offset;
    if (targetIndex < 0) {
      targetIndex = userPlaylistLength - 1;
    } else if (targetIndex >= userPlaylistLength) {
      targetIndex = 0;
    }
    
    const targetTrack = this.state.getUserPlaylistTrack(targetIndex);
    
    player.loadVideoById(targetTrack.videoId);
    this.playlistManager.highlightPlaylistTrack(targetTrack.videoId);
    
    this._updateMainPlaylistHighlighting(targetTrack.videoId);
  }

  _updateMainPlaylistHighlighting(videoId) {
    const mainPlaylistIndex = this.dom.tracks.findIndex(track => 
      track.getAttribute('data-video') === videoId
    );
    
    if (mainPlaylistIndex !== -1) {
      this.state.set('currentIndex', mainPlaylistIndex);
      this.playlistManager.highlightTrack(mainPlaylistIndex);
    } else {
      this.uiController.clearMainPlaylistHighlighting();
    }
  }
}

// Player state and lifecycle management
class PlayerStateController {
  constructor(stateManager, domElements, playlistManager, controlsManager, uiController, youtubeAPI) {
    this.state = stateManager;
    this.dom = domElements;
    this.playlistManager = playlistManager;
    this.controlsManager = controlsManager;
    this.uiController = uiController;
    this.youtubeAPI = youtubeAPI;
    this.navigationService = null;
  }

  setNavigationService(navigationService) {
    this.navigationService = navigationService;
  }

  initializePlayerWithTrack(index) {
    const trackData = this._getTrackData(index);
    
    if (this.state.get('playerInitialized')) {
      this._loadTrackInExistingPlayer(trackData, index);
    } else {
      this._createNewPlayerWithTrack(trackData, index);
    }
  }

  onPlayerReady(event, index, videoId) {
    this.state.set('playerInitialized', true);
    this.uiController.removeLoadingState();
    this.controlsManager.setupControls();
    
    event.target.playVideo();
    
    setTimeout(() => {
      this._checkPlaybackState();
    }, CONFIG.TIMINGS.playAttemptDelay);
    
    this.playlistManager.highlightTrack(index);
    this.playlistManager.highlightPlaylistTrack(videoId);
    this.state.set('currentIndex', index);
  }

  onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED && this.navigationService) {
      this.navigationService.handleTrackEnded();
    }
    
    this._updatePlayPauseButton(event.data);
  }

  _getTrackData(index) {
    const videoId = this.dom.tracks[index].getAttribute('data-video');
    const trackTitle = this.dom.tracks[index].querySelector('.track-title');
    const title = trackTitle.textContent.trim();
    
    return { videoId, title };
  }

  _loadTrackInExistingPlayer(trackData, index) {
    const { videoId, title } = trackData;
    
    if (!this.state.isInUserPlaylist(videoId)) {
      this.playlistManager.addToPlaylist(videoId, title, false);
    }
    
    this.uiController.showPlayerControls();
    
    this.state.get('player').loadVideoById(videoId);
    this.playlistManager.highlightPlaylistTrack(videoId);
    this.playlistManager.highlightTrack(index);
  }

  _createNewPlayerWithTrack(trackData, index) {
    const { videoId, title } = trackData;
    
    this.uiController.setupLoadingState();
    
    if (!this.state.isInUserPlaylist(videoId)) {
      this.playlistManager.addToPlaylist(videoId, title, false);
    }
    
    const player = this.youtubeAPI.createPlayer('player', videoId, {
      'onReady': (event) => this.onPlayerReady(event, index, videoId),
      'onStateChange': (event) => this.onPlayerStateChange(event)
    });
    
    this.state.set('player', player);
  }

  _checkPlaybackState() {
    const player = this.state.get('player');
    const isPlaying = player.getPlayerState() === YT.PlayerState.PLAYING;
    
    this.uiController.updatePlayPauseButtons(isPlaying);
    
    if (isPlaying) {
      this.controlsManager.startProgressInterval();
    }
  }

  _updatePlayPauseButton(playerState) {
    if (playerState === YT.PlayerState.PLAYING) {
      this.uiController.updatePlayPauseButtons(true);
      this.controlsManager.startProgressInterval();
    } else if (playerState === YT.PlayerState.PAUSED || playerState === YT.PlayerState.ENDED) {
      this.uiController.updatePlayPauseButtons(false);
      clearInterval(this.state.get('progressInterval'));
    }
  }
}

export class PlayerManager {
  constructor(stateManager, domElements, playlistManager, controlsManager) {
    this.state = stateManager;
    this.dom = domElements;
    this.playlistManager = playlistManager;
    this.controlsManager = controlsManager;
    
    this._initializeServices();
    this._setupAPILoading();
  }

  _initializeServices() {
    this.youtubeAPI = new YouTubeAPIManager();
    this.uiController = new PlayerUIController(this.dom, this.state);
    this.navigationService = new TrackNavigationService(this.state, this.dom, this.playlistManager, this.uiController);
    this.stateController = new PlayerStateController(this.state, this.dom, this.playlistManager, this.controlsManager, this.uiController, this.youtubeAPI);
    
    // Set up circular dependency
    this.stateController.setNavigationService(this.navigationService);
  }

  _setupAPILoading() {
    this.youtubeAPI.loadYouTubeAPI();
    this.youtubeAPI.onAPIReady(() => this._onYouTubeAPIReady());
  }

  _onYouTubeAPIReady() {
    this.state.set('playerReady', true);
    
    const pendingIndex = this.state.get('pendingTrackIndex');
    if (pendingIndex !== null) {
      this.initializePlayerWithTrack(pendingIndex);
    }
  }

  // Public API methods (maintained for compatibility)
  initializePlayerWithTrack(index) {
    this.stateController.initializePlayerWithTrack(index);
  }

  togglePlayPause() {
    const player = this.state.get('player');
    if (!player) return;
    
    const userPlaylistLength = this.state.getUserPlaylistLength();
    if (userPlaylistLength === 0) {
      console.log('No tracks in playlist to play');
      return;
    }
    
    if (this.state.get('isPlaying')) {
      player.pauseVideo();
      return;
    }
    
    const currentVideoId = this.getCurrentVideoId();
    const isInPlaylist = currentVideoId && this.state.isInUserPlaylist(currentVideoId);
    
    if (!isInPlaylist && userPlaylistLength > 0) {
      this.navigationService.playFirstTrackFromPlaylist();
    } else {
      this.navigationService.resumeCurrentTrack();
    }
  }

  playNext() {
    this.navigationService.playNext();
  }

  playPrevious() {
    this.navigationService.playPrevious();
  }

  getCurrentVideoId() {
    const player = this.state.get('player');
    if (!player || !player.getVideoData) {
      return null;
    }
    const videoData = player.getVideoData();
    return videoData ? videoData.video_id : null;
  }

  isCurrentTrack(videoId) {
    const player = this.state.get('player');
    return player && 
           player.getVideoData && 
           player.getVideoData().video_id === videoId;
  }
}
