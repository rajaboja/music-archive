from loguru import logger
from datetime import datetime, timedelta
from drive_storage import DriveStorage

class PlaylistManager:
    def __init__(self, file_id, local_path, cache_duration, min_duration_seconds):
        self.storage = DriveStorage(file_id, local_path, min_duration_seconds)
        self.cached_playlist = None

    async def initialize(self):
        await self.load_playlist()

    async def update_playlist(self):
        if self.cached_playlist is not None:
            return self.cached_playlist

        try:
            self.storage.download_sheet()
            self.cached_playlist = self.storage.load_playlist()
            return self.cached_playlist
        except Exception as e:
            logger.exception(f"Error updating playlist: {e}")
            return []

    async def load_playlist(self):
        return await self.update_playlist()

    async def close(self):
        pass
