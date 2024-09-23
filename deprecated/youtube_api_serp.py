import os
import aiohttp
import asyncio
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class YouTubeAPISerpApi:
    def __init__(self):
        self.api_key = os.getenv('SERPAPI_KEY')
        if not self.api_key:
            raise ValueError("SERPAPI_KEY not found in environment variables")
        self.base_url = "https://serpapi.com/search.json"
        self.session = None

    async def initialize(self):
        if self.session is None:
            self.session = aiohttp.ClientSession()
        logger.info("YouTubeAPISerpApi initialized")

    async def close(self):
        if self.session:
            await self.session.close()
        logger.info("YouTubeAPISerpApi session closed")

    async def get_latest_tmk_videos(self, limit=10):
        await self.initialize()
        params = {
            "engine": "youtube",
            "search_query": "T M Krishna",
            "api_key": self.api_key,
            "type": "video",
            # "async": "true",
            "sp": "CAI%253D"
        }

        all_videos = []
        page = 0

        while len(all_videos) < limit:
            params["page"] = page
            try:
                logger.info(f"Fetching YouTube search results page {page}")
                async with self.session.get(self.base_url, params=params) as response:
                    data = await response.json()
                params["sp"] = data.pop('serpapi_pagination', {}).pop('next_page_token', '')
                video_results = data.get('video_results', [])
                if not video_results:
                    logger.info("No more video results found")
                    break

                for video in video_results:
                    duration_text = video.get('length', '0:00')
                    minutes = int(duration_text.split(':')[0])
                    
                    if minutes > 0:
                        video_data = {key: value for key, value in video.items()}
                        video_data['video_id'] = video.get('link', '').split('=')[-1]
                        all_videos.append(video_data)
                        if len(all_videos) >= limit:
                            break

                page += 1

            except Exception as e:
                logger.error(f"An error occurred while fetching videos from SerpApi: {e}")
                break

        logger.info(f"Retrieved {len(all_videos)} videos with metadata using SerpApi")
        return all_videos[:limit]

    async def get_latest_tmk_videos_since(self, since_date):
        logger.info(f"Fetching videos since {since_date}")
        all_videos = await self.get_latest_tmk_videos()
        filtered_videos = [video for video in all_videos if self.is_video_newer_than(video['published_time'], since_date)]
        logger.info(f"Filtered {len(filtered_videos)} videos since {since_date}")
        return filtered_videos

    def is_video_newer_than(self, published_time, since_date):
        if not published_time:
            return False
        try:
            video_date = datetime.strptime(published_time, "%Y-%m-%d")
            return video_date > since_date
        except ValueError:
            logger.error(f"Unable to parse date: {published_time}")
            return False