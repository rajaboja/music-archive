import os
from urllib.parse import urlencode

class YouTubeService:
    BASE_PLAYLIST_EMBED_URL = os.getenv(
        "YOUTUBE_PLAYLIST_EMBED_URL", "https://www.youtube.com/embed/videoseries"
    )

    async def initialize(self):
        """Perform any asynchronous initialization if needed."""
        pass

    async def close(self):
        """Close any connections or perform cleanup."""
        pass

    def get_playlist_embed_url(self, video_ids):
        """
        Generates an optimized YouTube playlist embed URL.

        Args:
            video_ids (str): Comma-separated string of YouTube video IDs.

        Returns:
            str: A fully constructed and encoded YouTube embed URL.
        """
        if not video_ids:
            raise ValueError("video_ids must be provided and cannot be empty.")

        params = {
            'playlist': video_ids,
            'loop': '1',
            'enablejsapi': '1',
            'rel': '0',
            'controls': '1',
            'showinfo': '0',
        }

        query_string = urlencode(params)
        embed_url = f"{self.BASE_PLAYLIST_EMBED_URL}?{query_string}"
        return embed_url