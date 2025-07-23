// Controls management for the TMK player
import { CONFIG } from './config.js';

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
    // Play/Pause button
    this.dom.playPauseButton.addEventListener('click', () => {
      this.playerManager.togglePlayPause();
    });
    
    // Previous track button
    this.dom.prevTrackButton.addEventListener('click', () => {
      this.playerManager.playPrevious();
    });
    
    // Next track button
    this.dom.nextTrackButton.addEventListener('click', () => {
      this.playerManager.playNext();
    });
    
    // Loop button
    this.dom.loopButton.addEventListener('click', () => {
      this.toggleLoop();
    });
  }

  setupProgressBar() {
    // Progress bar click
    this.dom.progressContainer.addEventListener('click', (e) => {
      const rect = this.dom.progressContainer.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const duration = this.state.get('player').getDuration();
      this.state.get('player').seekTo(duration * percent, true);
    });
    
    // Progress bar hover preview
    this.dom.progressContainer.addEventListener('mousemove', (e) => {
      const rect = this.dom.progressContainer.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const duration = this.state.get('player').getDuration();
      const time = duration * percent;
      
      // Update title with hover time
      this.dom.progressContainer.title = `Seek to ${this.formatTime(time)}`;
    });
    
    this.dom.progressContainer.addEventListener('mouseleave', () => {
      this.dom.progressContainer.title = 'Click to seek';
    });
    
    // Progress bar keyboard navigation
    this.dom.progressContainer.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        this.seekBackward();
      } else if (e.key === 'ArrowRight') {
        this.seekForward();
      }
    });
  }

  setupVolumeControls() {
    // Volume slider
    this.dom.volumeSlider.addEventListener('input', (e) => {
      const volume = parseInt(e.target.value);
      const player = this.state.get('player');
      
      player.setVolume(volume);
      
      // Update mute button state based on volume
      if (volume === 0) {
        this.dom.volumeButton.classList.add('muted');
      } else {
        this.dom.volumeButton.classList.remove('muted');
      }
    });
    
    // Volume button click to toggle mute/unmute
    this.dom.volumeButton.addEventListener('click', () => this.toggleMute());
    
    // Enhanced volume slider behavior with smooth animations
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
    
    // Show volume on right-click for easier access
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

  setupVideoVisibilityToggle() {
    // Add click handler to player controls to toggle video visibility
    this.dom.playerControls.addEventListener('click', (e) => {
      // Only toggle when clicking directly on the controls background or inner container
      // or when clicking in empty space between controls (not on buttons)
      const playerControlsInner = document.querySelector('.player-controls-inner');
      const isClickableElement = e.target.closest('.control-button, #volume-container, #progress-container');
      
      if ((e.target === this.dom.playerControls || e.target === playerControlsInner) || !isClickableElement) {
        this.toggleVideoVisibility();
      }
    });
  }

  toggleLoop() {
    const currentLoopMode = this.state.get('loopMode');
    
    // Cycle through loop modes: none -> single -> playlist -> none
    if (currentLoopMode === CONFIG.LOOP_MODES.NONE) {
      this.state.set('loopMode', CONFIG.LOOP_MODES.SINGLE);
      this.dom.loopButton.classList.add('loop-single');
      this.dom.loopButton.classList.remove('loop-playlist');
      this.dom.loopButton.title = 'Loop Single Track (L)';
    } else if (currentLoopMode === CONFIG.LOOP_MODES.SINGLE) {
      this.state.set('loopMode', CONFIG.LOOP_MODES.PLAYLIST);
      this.dom.loopButton.classList.remove('loop-single');
      this.dom.loopButton.classList.add('loop-playlist');
      this.dom.loopButton.title = 'Loop Playlist (L)';
    } else {
      this.state.set('loopMode', CONFIG.LOOP_MODES.NONE);
      this.dom.loopButton.classList.remove('loop-single');
      this.dom.loopButton.classList.remove('loop-playlist');
      this.dom.loopButton.title = 'No Loop (L)';
    }
  }

  toggleMute() {
    const player = this.state.get('player');
    if (!player) return;
    
    if (player.isMuted()) {
      player.unMute();
    } else {
      player.mute();
    }
    
    // Update UI to reflect current state
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
    if (player && typeof player.getCurrentTime === 'function' && typeof player.getDuration === 'function') {
      const currentTime = player.getCurrentTime() || 0;
      const duration = player.getDuration() || 0;
      
      if (duration > 0) {
        // Update progress bar
        const percent = (currentTime / duration) * 100;
        this.dom.progressBar.style.width = `${percent}%`;
        
        // Update progress bar aria attributes
        this.dom.progressContainer.setAttribute('aria-valuenow', Math.round(percent));
        this.dom.progressContainer.setAttribute('aria-valuemin', '0');
        this.dom.progressContainer.setAttribute('aria-valuemax', '100');
        
        // Update time display
        this.dom.timeDisplay.textContent = `${this.formatTime(currentTime)} / ${this.formatTime(duration)}`;
      }
    }
  }

  formatTime(seconds) {
    seconds = Math.floor(seconds);
    const minutes = Math.floor(seconds / 60);
    seconds = seconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
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
    
    // Update slider to show actual volume (even when muted)
    this.dom.volumeSlider.value = volume;
    
    // Update mute button state
    if (isMuted) {
      this.dom.volumeButton.classList.add('muted');
    } else {
      this.dom.volumeButton.classList.remove('muted');
    }
  }

  showVolumeSlider() {
    this.dom.volumeSliderContainer.style.display = 'flex';
  }

  hideVolumeSlider() {
    this.dom.volumeSliderContainer.style.display = 'none';
  }

  // Set references to other managers
  setPlayerManager(playerManager) {
    this.playerManager = playerManager;
  }
}
