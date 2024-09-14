import time
import asyncio
import logging
import json
import os
from datetime import datetime, timedelta
from youtube_api_serp import YouTubeAPISerpApi

logger = logging.getLogger(__name__)

class PlaylistManager:
    def __init__(self, cache_file, cache_duration):
        self.cache_file = cache_file
        self.cache_duration = cache_duration
        self.youtube_api = YouTubeAPISerpApi()

    async def initialize(self):
        await self.youtube_api.initialize()

    async def update_playlist(self):
        current_time = datetime.now()
        
        try:
            if os.path.exists(self.cache_file):
                with open(self.cache_file, 'r') as f:
                    cache_data = json.load(f)
                    last_update = datetime.fromisoformat(cache_data['timestamp'])
                    if current_time - last_update <= timedelta(days=1):
                        logger.info("Using cached playlist")
                        return cache_data['videos']
                    else:
                        # Get new videos since last update
                        new_videos = await self.youtube_api.get_latest_tmk_videos_since(last_update)
                        videos = self.merge_and_sort_videos(cache_data['videos'], new_videos)
                        logger.info(f"Added {len(new_videos)} new videos to the playlist")
            else:
                # If no cache exists, get all videos
                videos = await self.youtube_api.get_latest_tmk_videos()  # Remove the argument here
                logger.info(f"Created new playlist with {len(videos)} videos")
        except Exception as e:
            logger.error(f"Error reading or updating cache: {e}")
            videos = await self.youtube_api.get_latest_tmk_videos()  # Remove the argument here as well

        try:
            with open(self.cache_file, 'w') as f:
                json.dump({'timestamp': current_time.isoformat(), 'videos': videos}, f)
            logger.info("Playlist updated and cached")
        except Exception as e:
            logger.error(f"Error writing cache file: {e}")
        
        return videos

    def merge_and_sort_videos(self, old_videos, new_videos):
        # Merge new videos with old ones, removing duplicates
        video_dict = {video['video_id']: video for video in old_videos + new_videos}
        merged_videos = list(video_dict.values())
        # Sort videos by published time (newest first)
        return sorted(merged_videos, key=lambda x: x['published_date'], reverse=True)

    async def load_playlist(self):
        await self.initialize()
        videos = await self.update_playlist()
        logger.info(f"Loaded playlist with {len(videos)} videos")
        return videos

    async def close(self):
        await self.youtube_api.close()