from loguru import logger
from datetime import datetime, timedelta
from drive_storage import DriveStorage

class PlaylistManager:
    def __init__(self, file_id, local_path, cache_duration, min_duration_seconds):
        self.cache_duration = timedelta(seconds=cache_duration)
        self.storage = DriveStorage(file_id, local_path, min_duration_seconds)
        self.last_update = None
        self.cached_playlist = None

    async def initialize(self):
        await self.load_playlist()

    async def update_playlist(self):
        current_time = datetime.now()
        
        if self.cached_playlist and self.last_update and (current_time - self.last_update) <= self.cache_duration:
            return self.cached_playlist

        try:
            self.storage.download_sheet()
            filtered_videos = self.storage.load_playlist()
            
            self.last_update = current_time
            self.cached_playlist = filtered_videos
            return filtered_videos
        except Exception as e:
            logger.exception(f"Error updating playlist: {e}")
            if self.cached_playlist:
                return self.cached_playlist
            return []

    async def load_playlist(self):
        return await self.update_playlist()

    async def close(self):
        pass
