import requests
import json
import urllib.parse
import logging
import aiohttp
import asyncio
import re
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class YouTubeAPI:
    def __init__(self):
        self.session = None

    async def initialize(self):
        if self.session is None:
            self.session = aiohttp.ClientSession()

    async def fetch_video_data(self, url):
        await self.initialize()
        try:
            async with self.session.get(url) as response:
                response.raise_for_status()
                html_content = await response.text()
            
            # Extract the JSON data from the HTML
            start_marker = 'var ytInitialData = '
            end_marker = ';</script>'
            
            start_index = html_content.index(start_marker) + len(start_marker)
            end_index = html_content.index(end_marker, start_index)
            
            json_str = html_content[start_index:end_index]
            data = json.loads(json_str)
            
            logger.info("Successfully fetched and parsed video data")
            return data
        except aiohttp.ClientError as e:
            logger.error(f"Error fetching video data: {e}")
        except (ValueError, KeyError) as e:
            logger.error(f"Error parsing video data: {e}")
        return None

    async def is_video_embeddable(self, video_id):
        await self.initialize()
        url = f"https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v={video_id}&format=json"
        try:
            async with self.session.get(url) as response:
                if response.status == 200:
                    return True
                else:
                    logger.warning(f"Video {video_id} is not embeddable")
                    return False
        except Exception as e:
            logger.error(f"Error checking embeddability for video {video_id}: {e}")
            return False

    async def get_latest_tmk_videos(self, limit=30):
        await self.initialize()
        query = "T M Krishna"
        encoded_query = urllib.parse.quote(query)
        url = f"https://www.youtube.com/results?search_query={encoded_query}&sp=CAI%253D"
        
        data = await self.fetch_video_data(url)
        videos = []
        
        if data:
            try:
                video_data = data['contents']['twoColumnSearchResultsRenderer']['primaryContents']['sectionListRenderer']['contents'][0]['itemSectionRenderer']['contents']
                
                for item in video_data:
                    if 'videoRenderer' in item:
                        video = item['videoRenderer']
                        video_id = video['videoId']
                        title = video['title']['runs'][0]['text']
                        
                        # Extract video duration
                        duration_text = video.get('lengthText', {}).get('simpleText', '0:00')
                        duration_parts = duration_text.split(':')
                        duration_seconds = sum(int(x) * 60 ** i for i, x in enumerate(reversed(duration_parts)))
                        
                        # Check if video is at least 1 minute long and embeddable
                        if duration_seconds >= 60 and await self.is_video_embeddable(video_id):
                            published_time = video.get('publishedTimeText', {}).get('simpleText', 'Unknown')
                            videos.append({
                                'title': title,
                                'video_id': video_id,
                                'published_time': published_time,
                                'duration': duration_text
                            })
                            if len(videos) >= limit:
                                break
                logger.info(f"Retrieved {len(videos)} embeddable videos longer than 1 minute")
            except KeyError as e:
                logger.error(f"Error parsing video data: {e}")
        else:
            logger.warning("No video data retrieved")
        
        return videos

    async def get_latest_tmk_videos_since(self, since_date):
        await self.initialize()
        query = "T M Krishna"
        encoded_query = urllib.parse.quote(query)
        url = f"https://www.youtube.com/results?search_query={encoded_query}&sp=CAI%253D"
        
        data = await self.fetch_video_data(url)
        videos = []
        
        if data:
            try:
                video_data = data['contents']['twoColumnSearchResultsRenderer']['primaryContents']['sectionListRenderer']['contents'][0]['itemSectionRenderer']['contents']
                
                for item in video_data:
                    if 'videoRenderer' in item:
                        video = item['videoRenderer']
                        published_time = video.get('publishedTimeText', {}).get('simpleText', 'Unknown')
                        
                        # Parse the published time and compare with since_date
                        if self.is_video_newer_than(published_time, since_date):
                            video_id = video['videoId']
                            title = video['title']['runs'][0]['text']
                            duration_text = video.get('lengthText', {}).get('simpleText', '0:00')
                            duration_parts = duration_text.split(':')
                            duration_seconds = sum(int(x) * 60 ** i for i, x in enumerate(reversed(duration_parts)))
                            
                            if duration_seconds >= 60 and await self.is_video_embeddable(video_id):
                                videos.append({
                                    'title': title,
                                    'video_id': video_id,
                                    'published_time': published_time,
                                    'duration': duration_text
                                })
                        else:
                            # If we've reached videos older than since_date, we can stop
                            break
                
                logger.info(f"Retrieved {len(videos)} new embeddable videos since {since_date}")
            except KeyError as e:
                logger.error(f"Error parsing video data: {e}")
        else:
            logger.warning("No video data retrieved")
        
        return videos

    def is_video_newer_than(self, published_time, since_date):
        # Convert YouTube's relative time to a datetime object
        if 'minute' in published_time or 'hour' in published_time:
            return True
        elif 'day' in published_time:
            days = int(published_time.split()[0])
            return datetime.now() - timedelta(days=days) > since_date
        elif 'week' in published_time:
            weeks = int(published_time.split()[0])
            return datetime.now() - timedelta(weeks=weeks) > since_date
        elif 'month' in published_time:
            months = int(published_time.split()[0])
            return datetime.now() - timedelta(days=months*30) > since_date
        elif 'year' in published_time:
            years = int(published_time.split()[0])
            return datetime.now() - timedelta(days=years*365) > since_date
        return False

    async def close(self):
        if self.session:
            await self.session.close()