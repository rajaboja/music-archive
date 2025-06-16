// DOM element references for the TMK player
export class DOMElements {
  constructor() {
    this.initializeElements();
  }

  initializeElements() {
    // Player elements
    this.playerContainer = document.getElementById('player-container');
    this.playerControls = document.getElementById('player-controls');
    this.player = document.getElementById('player');

    // Control buttons
    this.playPauseButton = document.getElementById('play-pause');
    this.prevTrackButton = document.getElementById('prev-track');
    this.nextTrackButton = document.getElementById('next-track');
    this.loopButton = document.getElementById('loop-button');
    this.playIcon = document.getElementById('play-icon');
    this.pauseIcon = document.getElementById('pause-icon');

    // Progress elements
    this.progressContainer = document.getElementById('progress-container');
    this.progressBar = document.getElementById('progress-bar');
    this.timeDisplay = document.getElementById('time-display');

    // Volume elements
    this.volumeButton = document.getElementById('volume-button');
    this.volumeSliderContainer = document.getElementById('volume-slider-container');
    this.volumeSlider = document.getElementById('volume-slider');
    this.volumeContainer = document.getElementById('volume-container');

    // Playlist elements
    this.playlistButton = document.getElementById('playlist-button');
    this.playlistPanel = document.getElementById('playlist-panel');
    this.customPlaylist = document.getElementById('custom-playlist');
    this.modalOverlay = document.getElementById('modal-overlay');

    // Tracks
    this.tracks = [...document.querySelectorAll('#playlist li')];
  }

  // Getter methods for easier access
  get allElements() {
    return {
      playerContainer: this.playerContainer,
      playerControls: this.playerControls,
      player: this.player,
      playPauseButton: this.playPauseButton,
      prevTrackButton: this.prevTrackButton,
      nextTrackButton: this.nextTrackButton,
      loopButton: this.loopButton,
      playIcon: this.playIcon,
      pauseIcon: this.pauseIcon,
      progressContainer: this.progressContainer,
      progressBar: this.progressBar,
      timeDisplay: this.timeDisplay,
      volumeButton: this.volumeButton,
      volumeSliderContainer: this.volumeSliderContainer,
      volumeSlider: this.volumeSlider,
      volumeContainer: this.volumeContainer,
      playlistButton: this.playlistButton,
      playlistPanel: this.playlistPanel,
      customPlaylist: this.customPlaylist,
      modalOverlay: this.modalOverlay,
      tracks: this.tracks
    };
  }
}
