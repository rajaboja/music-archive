import time
import asyncio
import logging
import json
import os
from youtube_api import YouTubeAPI

logger = logging.getLogger(__name__)

class PlaylistManager:
    def __init__(self, cache_file, cache_duration):
        self.cache_file = cache_file
        self.cache_duration = cache_duration
        self.youtube_api = YouTubeAPI()

    async def update_playlist(self):
        current_time = time.time()
        
        try:
            if os.path.exists(self.cache_file):
                with open(self.cache_file, 'r') as f:
                    cache_data = json.load(f)
                    if current_time - cache_data['timestamp'] <= self.cache_duration:
                        logger.info("Using cached playlist")
                        return cache_data['videos']
        except Exception as e:
            logger.error(f"Error reading cache file: {e}")
        
        videos = await self.youtube_api.get_latest_tmk_videos(30)
        
        try:
            with open(self.cache_file, 'w') as f:
                json.dump({'timestamp': current_time, 'videos': videos}, f)
            logger.info("Playlist updated and cached")
        except Exception as e:
            logger.error(f"Error writing cache file: {e}")
        
        return videos

    async def load_playlist(self):
        videos = await self.update_playlist()
        logger.info(f"Loaded playlist with {len(videos)} videos")
        return videos

    async def close(self):
        await self.youtube_api.close()