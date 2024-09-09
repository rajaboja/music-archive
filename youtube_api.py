import requests
import json
import urllib.parse
import logging
import aiohttp
import asyncio
import re

logger = logging.getLogger(__name__)

def fetch_video_data(url):
    try:
        response = requests.get(url)
        response.raise_for_status()
        html_content = response.text
        
        # Extract the JSON data from the HTML
        start_marker = 'var ytInitialData = '
        end_marker = ';</script>'
        
        start_index = html_content.index(start_marker) + len(start_marker)
        end_index = html_content.index(end_marker, start_index)
        
        json_str = html_content[start_index:end_index]
        data = json.loads(json_str)
        
        logger.info("Successfully fetched and parsed video data")
        return data
    except requests.RequestException as e:
        logger.error(f"Error fetching video data: {e}")
    except (ValueError, KeyError) as e:
        logger.error(f"Error parsing video data: {e}")
    return None

async def is_video_embeddable(video_id):
    url = f"https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v={video_id}&format=json"
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(url) as response:
                if response.status == 200:
                    return True
                else:
                    logger.warning(f"Video {video_id} is not embeddable")
                    return False
        except Exception as e:
            logger.error(f"Error checking embeddability for video {video_id}: {e}")
            return False

def is_likely_music(title):
    music_keywords = [
        'concert', 'performance', 'live', 'carnatic', 'raga', 'album',
        'song', 'music', 'classical', 'recital', 'jugalbandi', 'fusion'
    ]
    title_lower = title.lower()
    return any(keyword in title_lower for keyword in music_keywords)

async def get_latest_tmk_videos(limit=30):
    query = "T M Krishna"
    encoded_query = urllib.parse.quote(query)
    url = f"https://www.youtube.com/results?search_query={encoded_query}&sp=CAI%253D"
    
    data = fetch_video_data(url)
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
                    if duration_seconds >= 60 and await is_video_embeddable(video_id):
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