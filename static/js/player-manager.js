// YouTube player management for the TMK player
import { CONFIG } from './config.js';

export class PlayerManager {
  constructor(stateManager, domElements, playlistManager, controlsManager) {
    this.state = stateManager;
    this.dom = domElements;
    this.playlistManager = playlistManager;
    this.controlsManager = controlsManager;
    
    this.loadYouTubeAPI();
  }

  loadYouTubeAPI() {
    // Load YouTube API asynchronously
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    // Set up global callback
    window.onYouTubeIframeAPIReady = () => this.onYouTubeIframeAPIReady();
  }

  onYouTubeIframeAPIReady() {
    this.state.set('playerReady', true);
    
    // If there was a pending track click while API was loading, handle it now
    const pendingIndex = this.state.get('pendingTrackIndex');
    if (pendingIndex !== null) {
      this.initializePlayerWithTrack(pendingIndex);
    }
  }

  initializePlayerWithTrack(index) {
    const trackData = this._getTrackData(index);
    
    if (this.state.get('playerInitialized')) {
      this._loadTrackInExistingPlayer(trackData, index);
    } else {
      this._createNewPlayerWithTrack(trackData, index);
    }
  }

  _getTrackData(index) {
    const videoId = this.dom.tracks[index].getAttribute('data-video');
    const trackTitle = this.dom.tracks[index].querySelector('.track-title');
    const title = trackTitle.textContent.trim();
    
    return { videoId, title };
  }

  _loadTrackInExistingPlayer(trackData, index) {
    const { videoId, title } = trackData;
    
    // Add to playlist if not already there
    if (!this.state.isInUserPlaylist(videoId)) {
      this.playlistManager.addToPlaylist(videoId, title, false);
    }
    
    this._ensureVideoVisible();
    this.dom.playerControls.classList.add('active');
    
    this.state.get('player').loadVideoById(videoId);
    this.playlistManager.highlightPlaylistTrack(videoId);
    this.playlistManager.highlightTrack(index);
  }

  _createNewPlayerWithTrack(trackData, index) {
    const { videoId, title } = trackData;
    
    // Set up UI for loading state
    this._setupLoadingState();
    
    // Add to playlist if not already there
    if (!this.state.isInUserPlaylist(videoId)) {
      this.playlistManager.addToPlaylist(videoId, title, false);
    }
    
    const player = new YT.Player('player', {
      ...CONFIG.PLAYER,
      videoId: videoId,
      events: {
        'onReady': (event) => this.onPlayerReady(event, index, videoId),
        'onStateChange': (event) => this.onPlayerStateChange(event)
      }
    });
    
    this.state.set('player', player);
  }

  _setupLoadingState() {
    this.dom.playerContainer.classList.add('pip');
    this.dom.playerContainer.classList.add('loading');
    this.dom.playerControls.classList.add('active');
    
    // Ensure video is visible when player initializes
    this.dom.playerContainer.style.opacity = '1';
    this.dom.playerContainer.style.pointerEvents = 'auto';
    this.state.set('isVideoVisible', true);
  }

  onPlayerReady(event, index, videoId) {
    this.state.set('playerInitialized', true);
    this.dom.playerContainer.classList.remove('loading');
    this.controlsManager.setupControls();
    
    // Explicitly try to play the video
    event.target.playVideo();
    
    // Set a timeout to check if video is actually playing
    setTimeout(() => {
      const player = this.state.get('player');
      if (player.getPlayerState() !== YT.PlayerState.PLAYING) {
        // If not playing, update UI to show play button
        this.state.set('isPlaying', false);
        this.dom.playIcon.style.display = 'block';
        this.dom.pauseIcon.style.display = 'none';
      } else {
        this.state.set('isPlaying', true);
        this.dom.playIcon.style.display = 'none';
        this.dom.pauseIcon.style.display = 'block';
        this.controlsManager.startProgressInterval();
      }
    }, CONFIG.TIMINGS.playAttemptDelay);
    
    this.playlistManager.highlightTrack(index);
    this.playlistManager.highlightPlaylistTrack(videoId);
    this.state.set('currentIndex', index);
  }

  onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
      this.handleTrackEnded();
    }
    
    // Update play/pause button state
    this.updatePlayPauseButton(event.data);
  }

  handleTrackEnded() {
    const loopMode = this.state.get('loopMode');
    
    // Single track loop - replay current track
    if (loopMode === CONFIG.LOOP_MODES.SINGLE) {
      const player = this.state.get('player');
      player.seekTo(0);
      player.playVideo();
      return;
    }
    
    // Check if we have a playlist to work with
    if (this.state.getUserPlaylistLength() === 0) {
      this.stopPlayback();
      return;
    }
    
    // Find current track in playlist
    const currentVideoId = this.state.get('player').getVideoData().video_id;
    const currentIndex = this.state.findUserPlaylistIndex(currentVideoId);
    
    if (currentIndex === -1) {
      this.stopPlayback();
      return;
    }
    
    // Check if we're at the last track
    const isLastTrack = currentIndex === this.state.getUserPlaylistLength() - 1;
    
    if (isLastTrack && loopMode === CONFIG.LOOP_MODES.NONE) {
      // At end of playlist with no loop - stop
      this.stopPlayback();
    } else {
      // Play next track (will loop back to start if needed)
      this.playNext();
    }
  }

  updatePlayPauseButton(playerState) {
    if (playerState === YT.PlayerState.PLAYING) {
      this.state.set('isPlaying', true);
      this.dom.playIcon.style.display = 'none';
      this.dom.pauseIcon.style.display = 'block';
      this.controlsManager.startProgressInterval();
    } else if (playerState === YT.PlayerState.PAUSED || playerState === YT.PlayerState.ENDED) {
      this.state.set('isPlaying', false);
      this.dom.playIcon.style.display = 'block';
      this.dom.pauseIcon.style.display = 'none';
      clearInterval(this.state.get('progressInterval'));
    }
  }

  stopPlayback() {
    this.state.set('isPlaying', false);
    this.dom.playIcon.style.display = 'block';
    this.dom.pauseIcon.style.display = 'none';
  }

  _ensureVideoVisible() {
    this.dom.playerContainer.style.display = 'block';
    this.dom.playerContainer.classList.add('pip');
    this.dom.playerContainer.style.opacity = '1';
    this.dom.playerContainer.style.pointerEvents = 'auto';
    this.state.set('isVideoVisible', true);
  }

  _playFirstTrackFromPlaylist() {
    const firstTrack = this.state.getUserPlaylistTrack(0);
    const player = this.state.get('player');
    
    this._ensureVideoVisible();
    player.loadVideoById(firstTrack.videoId);
    this.playlistManager.highlightPlaylistTrack(firstTrack.videoId);
  }

  _resumeCurrentTrack() {
    const player = this.state.get('player');
    
    this._ensureVideoVisible();
    player.playVideo();
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
    
    // Handle play scenarios
    const currentVideoId = this.getCurrentVideoId();
    const isInPlaylist = currentVideoId && this.state.isInUserPlaylist(currentVideoId);
    
    if (!isInPlaylist && userPlaylistLength > 0) {
      this._playFirstTrackFromPlaylist();
    } else {
      this._resumeCurrentTrack();
    }
  }

  _playTrackAtOffset(offset) {
    const player = this.state.get('player');
    const userPlaylistLength = this.state.getUserPlaylistLength();
    
    if (userPlaylistLength === 0) return;
    
    const currentVideoId = player.getVideoData().video_id;
    const currentPlaylistIndex = this.state.findUserPlaylistIndex(currentVideoId);
    
    if (currentPlaylistIndex === -1) return;
    
    // Calculate target index with wrapping
    let targetIndex = currentPlaylistIndex + offset;
    if (targetIndex < 0) {
      targetIndex = userPlaylistLength - 1;
    } else if (targetIndex >= userPlaylistLength) {
      targetIndex = 0;
    }
    
    const targetTrack = this.state.getUserPlaylistTrack(targetIndex);
    
    // Load and highlight the target track
    player.loadVideoById(targetTrack.videoId);
    this.playlistManager.highlightPlaylistTrack(targetTrack.videoId);
    
    // Update main playlist highlighting if track exists there
    const mainPlaylistIndex = this.dom.tracks.findIndex(track => 
      track.getAttribute('data-video') === targetTrack.videoId
    );
    
    if (mainPlaylistIndex !== -1) {
      this.state.set('currentIndex', mainPlaylistIndex);
      this.playlistManager.highlightTrack(mainPlaylistIndex);
    } else {
      // Clear main playlist highlighting if track not found
      this.dom.tracks.forEach(track => track.classList.remove('playing'));
    }
  }

  playNext() {
    this._playTrackAtOffset(1);
  }

  playPrevious() {
    this._playTrackAtOffset(-1);
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
