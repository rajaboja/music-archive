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

// UI feedback utility for showing temporary messages
export function showFeedback(message, type = 'info', duration = 3000) {
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
  
  setTimeout(() => {
    feedback.style.opacity = '1';
  }, 10);
  
  setTimeout(() => {
    feedback.style.opacity = '0';
    setTimeout(() => {
      if (feedback.parentNode) {
        feedback.parentNode.removeChild(feedback);
      }
    }, 300);
  }, duration);
}
