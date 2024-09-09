import time
import asyncio
import logging
import json
import os
from youtube_api import get_latest_tmk_videos
from config import CACHE_DURATION

logger = logging.getLogger(__name__)

# Use /tmp directory for caching
CACHE_FILE = '/tmp/tmk_playlist_cache.json'

def update_playlist():
    current_time = time.time()
    
    try:
        if os.path.exists(CACHE_FILE):
            with open(CACHE_FILE, 'r') as f:
                cache_data = json.load(f)
                if current_time - cache_data['timestamp'] <= CACHE_DURATION:
                    logger.info("Using cached playlist")
                    return cache_data['videos']
    except Exception as e:
        logger.error(f"Error reading cache file: {e}")
    
    videos = asyncio.run(get_latest_tmk_videos(30))
    
    try:
        with open(CACHE_FILE, 'w') as f:
            json.dump({'timestamp': current_time, 'videos': videos}, f)
        logger.info("Playlist updated and cached")
    except Exception as e:
        logger.error(f"Error writing cache file: {e}")
    
    return videos

def load_playlist():
    videos = update_playlist()
    logger.info(f"Loaded playlist with {len(videos)} videos")
    return videos