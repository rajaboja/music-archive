import time
import asyncio
import logging
from datetime import datetime, timedelta
from drive_storage import DriveStorage

logger = logging.getLogger(__name__)

class PlaylistManager:
    def __init__(self, file_id, local_path, cache_duration):
        self.cache_duration = timedelta(seconds=cache_duration)
        self.storage = DriveStorage(file_id, local_path)
        self.last_update = None
        self.videos = []

    async def initialize(self):
        await self.load_from_storage()

    async def load_from_storage(self):
        try:
            self.videos = self.storage.load_playlist()
            if self.videos:
                self.last_update = datetime.now()
            logger.info(f"Loaded {len(self.videos)} videos from storage")
        except Exception as e:
            logger.error(f"Error loading from storage: {e}")
            self.last_update = None
            self.videos = []

    async def update_playlist(self):
        current_time = datetime.now()
        
        if self.last_update and (current_time - self.last_update) <= self.cache_duration:
            logger.info("Using cached playlist")
            return self.videos

        try:
            self.storage.download_sheet()  # Only download if cache is expired
            self.videos = self.storage.load_playlist()
            self.last_update = current_time
            logger.info(f"Updated playlist with {len(self.videos)} videos")
        except Exception as e:
            logger.error(f"Error updating playlist: {e}")

        return self.videos

    async def load_playlist(self):
        return await self.update_playlist()

    async def close(self):
        # No need to close anything since we're not using an API client
        pass