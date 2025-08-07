// Utility functions for the media player

// Time formatting utility
export function formatTime(seconds) {
  seconds = Math.floor(seconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  seconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// Validates playlist operations and business rules
export class PlaylistValidator {
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
export class PlaylistItemRenderer {
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
    } else {
      button.innerHTML = this.icons.add;
      button.title = 'Add to Playlist';
    }
  }
}

// UI feedback utility for showing temporary messages
export function showFeedback(message, type = 'info', duration = 3000) {
  // Create a temporary feedback element
  const feedback = document.createElement('div');
  feedback.className = `feedback feedback-${type}`;
  feedback.textContent = message;
  feedback.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--pico-primary-500);
    color: white;
    padding: 1rem;
    border-radius: var(--pico-border-radius);
    z-index: 10000;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;
  
  document.body.appendChild(feedback);
  
  // Trigger animation
  setTimeout(() => {
    feedback.style.opacity = '1';
  }, 10);
  
  // Remove after duration
  setTimeout(() => {
    feedback.style.opacity = '0';
    setTimeout(() => {
      if (feedback.parentNode) {
        feedback.parentNode.removeChild(feedback);
      }
    }, 300);
  }, duration);
}
