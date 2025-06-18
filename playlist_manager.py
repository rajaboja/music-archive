from loguru import logger
from drive_storage import DriveStorage

class PlaylistManager:
    def __init__(self, file_id, local_path, min_duration_seconds):
        self.storage = DriveStorage(file_id, local_path, min_duration_seconds)

    async def load_playlist(self):
        """Load playlist data from Google Drive"""
        try:
            self.storage.download_sheet()
            return self.storage.load_playlist()
        except Exception as e:
            logger.exception(f"Error loading playlist: {e}")
            return []
