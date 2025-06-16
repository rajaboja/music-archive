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
    if (this.state.get('playerInitialized')) {
      // If player is already initialized, load the track via playlist
      const videoId = this.dom.tracks[index].getAttribute('data-video');
      const trackTitle = this.dom.tracks[index].querySelector('.track-title');
      const title = trackTitle.textContent.trim();
      
      // Add to playlist if not already there
      if (!this.state.isInUserPlaylist(videoId)) {
        this.playlistManager.addToPlaylist(videoId, title, false);
      }
      
      this.state.get('player').loadVideoById(videoId);
      this.playlistManager.highlightPlaylistTrack(videoId);
      this.playlistManager.highlightTrack(index);
      return;
    }
    
    // Show loading state
    this.dom.playerContainer.classList.add('pip');
    this.dom.playerContainer.classList.add('loading');
    this.dom.playerControls.classList.add('active');
    
    // Ensure video is visible when player initializes
    this.dom.playerContainer.style.opacity = '1';
    this.dom.playerContainer.style.pointerEvents = 'auto';
    this.state.set('isVideoVisible', true);
    
    // Get data for the track
    const videoId = this.dom.tracks[index].getAttribute('data-video');
    const trackTitle = this.dom.tracks[index].querySelector('.track-title');
    const title = trackTitle.textContent.trim();
    
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
      const loopMode = this.state.get('loopMode');
      
      if (loopMode === CONFIG.LOOP_MODES.SINGLE) {
        // If looping a single track, replay the current track
        const player = this.state.get('player');
        player.seekTo(0);
        player.playVideo();
      } else if (loopMode === CONFIG.LOOP_MODES.PLAYLIST) {
        // Only play from the custom playlist
        if (this.state.getUserPlaylistLength() > 0) {
          // Play next track from custom playlist
          this.playNext();
        } else {
          // If playlist is empty, don't play anything
          this.state.set('isPlaying', false);
          this.dom.playIcon.style.display = 'block';
          this.dom.pauseIcon.style.display = 'none';
        }
      } else {
        // Don't automatically play next track
        this.state.set('isPlaying', false);
        this.dom.playIcon.style.display = 'block';
        this.dom.pauseIcon.style.display = 'none';
      }
    }
    
    // Update play/pause button
    if (event.data === YT.PlayerState.PLAYING) {
      this.state.set('isPlaying', true);
      this.dom.playIcon.style.display = 'none';
      this.dom.pauseIcon.style.display = 'block';
      this.controlsManager.startProgressInterval();
    } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
      this.state.set('isPlaying', false);
      this.dom.playIcon.style.display = 'block';
      this.dom.pauseIcon.style.display = 'none';
      clearInterval(this.state.get('progressInterval'));
    }
  }

  togglePlayPause() {
    const player = this.state.get('player');
    if (!player) return;
    
    if (this.state.get('isPlaying')) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  }

  playNext() {
    const player = this.state.get('player');
    const userPlaylistLength = this.state.getUserPlaylistLength();
    
    // Only play from the playlist - never from Recent Additions
    if (userPlaylistLength > 0) {
      const currentVideoId = player.getVideoData().video_id;
      const currentPlaylistIndex = this.state.findUserPlaylistIndex(currentVideoId);
      
      if (currentPlaylistIndex !== -1) {
        const nextIndex = (currentPlaylistIndex + 1) % userPlaylistLength;
        const nextTrack = this.state.getUserPlaylistTrack(nextIndex);
        
        player.loadVideoById(nextTrack.videoId);
        this.playlistManager.highlightPlaylistTrack(nextTrack.videoId);
        
        // Also highlight in main playlist if it exists there
        const mainPlaylistIndex = this.dom.tracks.findIndex(track => 
          track.getAttribute('data-video') === nextTrack.videoId
        );
        if (mainPlaylistIndex !== -1) {
          this.state.set('currentIndex', mainPlaylistIndex);
          this.playlistManager.highlightTrack(mainPlaylistIndex);
        } else {
          // If not in main playlist, clear highlighting
          this.dom.tracks.forEach(track => track.classList.remove('playing'));
        }
      }
    }
  }

  playPrevious() {
    const player = this.state.get('player');
    const userPlaylistLength = this.state.getUserPlaylistLength();
    
    // Only play from the playlist - never from Recent Additions
    if (userPlaylistLength > 0) {
      const currentVideoId = player.getVideoData().video_id;
      const currentPlaylistIndex = this.state.findUserPlaylistIndex(currentVideoId);
      
      if (currentPlaylistIndex !== -1) {
        const prevIndex = currentPlaylistIndex === 0 ? 
          userPlaylistLength - 1 : currentPlaylistIndex - 1;
        const prevTrack = this.state.getUserPlaylistTrack(prevIndex);
        
        player.loadVideoById(prevTrack.videoId);
        this.playlistManager.highlightPlaylistTrack(prevTrack.videoId);
        
        // Also highlight in main playlist if it exists there
        const mainPlaylistIndex = this.dom.tracks.findIndex(track => 
          track.getAttribute('data-video') === prevTrack.videoId
        );
        if (mainPlaylistIndex !== -1) {
          this.state.set('currentIndex', mainPlaylistIndex);
          this.playlistManager.highlightTrack(mainPlaylistIndex);
        } else {
          // If not in main playlist, clear highlighting
          this.dom.tracks.forEach(track => track.classList.remove('playing'));
        }
      }
    }
  }

  getCurrentVideoId() {
    const player = this.state.get('player');
    return player && player.getVideoData ? player.getVideoData().video_id : null;
  }

  isCurrentTrack(videoId) {
    const player = this.state.get('player');
    return player && 
           player.getVideoData && 
           player.getVideoData().video_id === videoId;
  }
}
