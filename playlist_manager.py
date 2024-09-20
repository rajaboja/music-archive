from loguru import logger
from datetime import datetime, timedelta
from drive_storage import DriveStorage

class PlaylistManager:
    def __init__(self, file_id, local_path, cache_duration):
        self.cache_duration = timedelta(seconds=cache_duration)
        self.storage = DriveStorage(file_id, local_path)
        self.last_update = None
        self.cached_playlist = None
        logger.info(f"PlaylistManager initialized with file_id: {file_id}, local_path: {local_path}, cache_duration: {cache_duration}")

    async def initialize(self):
        logger.info("Initializing PlaylistManager")
        await self.load_playlist()

    async def update_playlist(self):
        current_time = datetime.now()
        
        if self.cached_playlist and self.last_update and (current_time - self.last_update) <= self.cache_duration:
            logger.info("Using cached playlist")
            return self.cached_playlist

        try:
            logger.info("Attempting to download sheet")
            self.storage.download_sheet()
            logger.info("Sheet downloaded successfully")
            
            logger.info("Loading playlist from storage")
            filtered_videos = self.storage.load_playlist()
            
            self.last_update = current_time
            self.cached_playlist = filtered_videos
            logger.info(f"Updated playlist with {len(filtered_videos)} videos")
            return filtered_videos
        except Exception as e:
            logger.exception(f"Error updating playlist: {e}")
            if self.cached_playlist:
                logger.info("Returning cached playlist due to error")
                return self.cached_playlist
            logger.warning("No cached playlist available")
            return []

    async def load_playlist(self):
        logger.info("Loading playlist")
        return await self.update_playlist()

    async def close(self):
        logger.info("Closing PlaylistManager")        # No need to close anything since we're not using an API client
        pass
