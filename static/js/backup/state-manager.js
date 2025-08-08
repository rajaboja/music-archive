// State management for the media player
import { CONFIG } from './config.js';

export class StateManager {
  constructor() {
    this.state = this.getDefaultState();
  }

  // Default state factory method
  getDefaultState() {
    return {
      player: null,
      currentIndex: 0,
      playerReady: false,
      isPlaying: false,
      loopMode: CONFIG.LOOP_MODES.NONE,
      pendingTrackIndex: null,
      playerInitialized: false,
      progressInterval: null,
      isVideoVisible: true,
      userPlaylist: []
    };
  }

  // Get state value
  get(key) {
    return this.state[key];
  }

  // Set state value
  set(key, value) {
    this.state[key] = value;
  }

  // Update multiple state values
  update(updates) {
    Object.assign(this.state, updates);
  }

  // Get entire state
  getState() {
    return { ...this.state };
  }

  // Reset state to defaults
  reset() {
    this.state = this.getDefaultState();
  }

  // Playlist management
  addToUserPlaylist(track) {
    if (!this.state.userPlaylist.some(t => t.videoId === track.videoId)) {
      this.state.userPlaylist.push(track);
      return true;
    }
    return false;
  }

  removeFromUserPlaylist(videoId) {
    const index = this.state.userPlaylist.findIndex(track => track.videoId === videoId);
    if (index !== -1) {
      this.state.userPlaylist.splice(index, 1);
      return index;
    }
    return -1;
  }

  isInUserPlaylist(videoId) {
    return this.state.userPlaylist.some(track => track.videoId === videoId);
  }

  getUserPlaylistTrack(index) {
    return this.state.userPlaylist[index];
  }

  getUserPlaylistLength() {
    return this.state.userPlaylist.length;
  }

  findUserPlaylistIndex(videoId) {
    return this.state.userPlaylist.findIndex(track => track.videoId === videoId);
  }
}
