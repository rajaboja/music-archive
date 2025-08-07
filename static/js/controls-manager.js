// Controls management for the media player
import { CONFIG } from './config.js';

// Utility function for time formatting
function formatTime(seconds) {
  seconds = Math.floor(seconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  seconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export class ControlsManager {
  constructor(stateManager, domElements) {
    this.state = stateManager;
    this.dom = domElements;
    this.volumeTimer = null;
  }

  setupControls() {
    this.setupControlButtons();
    this.setupProgressBar();
    this.setupVolumeControls();
    this.setupVideoVisibilityToggle();
  }

  setupControlButtons() {
    this.dom.playPauseButton.addEventListener('click', () => {
      this.playerManager.togglePlayPause();
    });
    
    this.dom.prevTrackButton.addEventListener('click', () => {
      this.playerManager.playPrevious();
    });
    
    this.dom.nextTrackButton.addEventListener('click', () => {
      this.playerManager.playNext();
    });
    
    this.dom.loopButton.addEventListener('click', () => {
      this.toggleLoop();
    });
  }

  setupProgressBar() {
    this.dom.progressContainer.addEventListener('click', (e) => this.handleProgressClick(e));
    this.dom.progressContainer.addEventListener('mousemove', (e) => this.handleProgressHover(e));
    this.dom.progressContainer.addEventListener('mouseleave', () => this.handleProgressLeave());
    this.dom.progressContainer.addEventListener('keydown', (e) => this.handleProgressKeydown(e));
  }

  setupVolumeControls() {
    this.dom.volumeSlider.addEventListener('input', (e) => this.handleVolumeSliderInput(e));
    this.dom.volumeButton.addEventListener('click', () => this.toggleMute());
    
    this.setupVolumeSliderBehavior();
    this.setupVolumeRightClick();
  }

  setupVideoVisibilityToggle() {
    this.dom.playerControls.addEventListener('click', (e) => {
      const playerControlsInner = document.querySelector('.player-controls-inner');
      const isClickableElement = e.target.closest('.control-button, #volume-container, #progress-container');
      
      if ((e.target === this.dom.playerControls || e.target === playerControlsInner) || !isClickableElement) {
        this.toggleVideoVisibility();
      }
    });
  }

  // Progress bar event handlers
  handleProgressClick(e) {
    const rect = this.dom.progressContainer.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const duration = this.state.get('player').getDuration();
    this.state.get('player').seekTo(duration * percent, true);
  }

  handleProgressHover(e) {
    const rect = this.dom.progressContainer.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const duration = this.state.get('player').getDuration();
    const time = duration * percent;
    
    this.dom.progressContainer.title = `Seek to ${formatTime(time)}`;
  }

  handleProgressLeave() {
    this.dom.progressContainer.title = 'Click to seek';
  }

  handleProgressKeydown(e) {
    if (e.key === 'ArrowLeft') {
      this.seekBackward();
    } else if (e.key === 'ArrowRight') {
      this.seekForward();
    }
  }

  // Volume control helper methods
  setupVolumeSliderBehavior() {
    this.dom.volumeContainer.addEventListener('mouseenter', () => {
      clearTimeout(this.volumeTimer);
      this.showVolumeSlider();
    });
    
    this.dom.volumeContainer.addEventListener('mouseleave', () => {
      this.volumeTimer = setTimeout(() => {
        this.hideVolumeSlider();
      }, CONFIG.TIMINGS.volumeHideDelay);
    });
    
    this.dom.volumeSliderContainer.addEventListener('mouseenter', () => {
      clearTimeout(this.volumeTimer);
    });
    
    this.dom.volumeSliderContainer.addEventListener('mouseleave', () => {
      this.volumeTimer = setTimeout(() => {
        this.hideVolumeSlider();
      }, CONFIG.TIMINGS.volumeHideDelay);
    });
  }

  setupVolumeRightClick() {
    this.dom.volumeContainer.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (this.dom.volumeSliderContainer.classList.contains('show')) {
        this.hideVolumeSlider();
      } else {
        this.showVolumeSlider();
        clearTimeout(this.volumeTimer);
        this.volumeTimer = setTimeout(() => {
          this.hideVolumeSlider();
        }, 3000);
      }
    });
  }

  handleVolumeSliderInput(e) {
    const volume = parseInt(e.target.value);
    const player = this.state.get('player');
    
    player.setVolume(volume);
    this.updateVolumeButtonState(volume === 0);
  }

  // UI update helper methods
  updateVolumeButtonState(isMuted) {
    if (isMuted) {
      this.dom.volumeButton.classList.add('muted');
    } else {
      this.dom.volumeButton.classList.remove('muted');
    }
  }

  updateLoopButtonState(loopMode) {
    this.dom.loopButton.classList.remove('loop-single', 'loop-playlist');
    
    if (loopMode === CONFIG.LOOP_MODES.SINGLE) {
      this.dom.loopButton.classList.add('loop-single');
      this.dom.loopButton.title = 'Loop Single Track (L)';
    } else if (loopMode === CONFIG.LOOP_MODES.PLAYLIST) {
      this.dom.loopButton.classList.add('loop-playlist');
      this.dom.loopButton.title = 'Loop Playlist (L)';
    } else {
      this.dom.loopButton.title = 'No Loop (L)';
    }
  }

  // Main control methods
  toggleLoop() {
    const currentLoopMode = this.state.get('loopMode');
    let newLoopMode;
    
    if (currentLoopMode === CONFIG.LOOP_MODES.NONE) {
      newLoopMode = CONFIG.LOOP_MODES.SINGLE;
    } else if (currentLoopMode === CONFIG.LOOP_MODES.SINGLE) {
      newLoopMode = CONFIG.LOOP_MODES.PLAYLIST;
    } else {
      newLoopMode = CONFIG.LOOP_MODES.NONE;
    }
    
    this.state.set('loopMode', newLoopMode);
    this.updateLoopButtonState(newLoopMode);
  }

  toggleMute() {
    const player = this.state.get('player');
    if (!player) return;
    
    if (player.isMuted()) {
      player.unMute();
    } else {
      player.mute();
    }
    
    this.updateVolumeUI();
  }

  toggleVideoVisibility() {
    const isVisible = this.state.get('isVideoVisible');
    
    if (isVisible) {
      this.dom.playerContainer.style.opacity = '0';
      this.dom.playerContainer.style.pointerEvents = 'none';
    } else {
      this.dom.playerContainer.style.opacity = '1';
      this.dom.playerContainer.style.pointerEvents = 'auto';
    }
    this.state.set('isVideoVisible', !isVisible);
  }

  startProgressInterval() {
    clearInterval(this.state.get('progressInterval'));
    const interval = setInterval(() => this.updateProgressBar(), CONFIG.TIMINGS.progressUpdateInterval);
    this.state.set('progressInterval', interval);
  }

  updateProgressBar() {
    const player = this.state.get('player');
    if (!player) return;
    
    const currentTime = player.getCurrentTime() || 0;
    const duration = player.getDuration() || 0;
    
    if (!duration) return;
    
    const percent = (currentTime / duration) * 100;
    this.dom.progressBar.style.width = `${percent}%`;
    
    this.dom.progressContainer.setAttribute('aria-valuenow', Math.round(percent));
    this.dom.progressContainer.setAttribute('aria-valuemin', '0');
    this.dom.progressContainer.setAttribute('aria-valuemax', '100');
    
    this.dom.timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
  }

  formatTime(seconds) {
    return formatTime(seconds);
  }

  seekBackward() {
    const player = this.state.get('player');
    const currentTime = player.getCurrentTime();
    player.seekTo(Math.max(0, currentTime - 5), true);
  }

  seekForward() {
    const player = this.state.get('player');
    const currentTime = player.getCurrentTime();
    const duration = player.getDuration();
    player.seekTo(Math.min(duration, currentTime + 5), true);
  }

  volumeUp() {
    const player = this.state.get('player');
    const currentVolume = player.getVolume();
    const newVolume = Math.min(100, currentVolume + 5);
    
    player.setVolume(newVolume);
    this.updateVolumeUI();
  }

  volumeDown() {
    const player = this.state.get('player');
    const currentVolume = player.getVolume();
    const newVolume = Math.max(0, currentVolume - 5);
    
    player.setVolume(newVolume);
    this.updateVolumeUI();
  }

  updateVolumeUI() {
    const player = this.state.get('player');
    if (!player) return;
    
    const volume = player.getVolume();
    const isMuted = player.isMuted();
    
    this.dom.volumeSlider.value = volume;
    this.updateVolumeButtonState(isMuted);
  }

  showVolumeSlider() {
    this.dom.volumeSliderContainer.style.display = 'flex';
  }

  hideVolumeSlider() {
    this.dom.volumeSliderContainer.style.display = 'none';
  }

  setPlayerManager(playerManager) {
    this.playerManager = playerManager;
  }
}
