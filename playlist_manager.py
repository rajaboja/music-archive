import json
import os
import time
import asyncio
import logging
from youtube_api import get_latest_tmk_videos
from config import PLAYLIST_FILE, CACHE_DURATION

logger = logging.getLogger(__name__)

# Cache the video data
cached_videos = None
last_fetch_time = 0

def update_playlist():
    global cached_videos, last_fetch_time
    current_time = time.time()
    
    if cached_videos is None or (current_time - last_fetch_time) > CACHE_DURATION:
        cached_videos = asyncio.run(get_latest_tmk_videos(30))
        last_fetch_time = current_time
        
        try:
            # Save the playlist to a file
            with open(PLAYLIST_FILE, 'w') as f:
                json.dump(cached_videos, f)
            logger.info("Playlist updated and saved to file")
        except IOError as e:
            logger.error(f"Error saving playlist to file: {e}")

def load_playlist():
    if os.path.exists(PLAYLIST_FILE):
        try:
            with open(PLAYLIST_FILE, 'r') as f:
                playlist = json.load(f)
            logger.info(f"Loaded playlist with {len(playlist)} videos")
            return playlist
        except IOError as e:
            logger.error(f"Error reading playlist file: {e}")
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing playlist JSON: {e}")
    else:
        logger.warning("Playlist file not found")
    return []