import pandas as pd
import re
from loguru import logger
import asyncio
import urllib.request
import io
from pathlib import Path


class DriveStorage:
    def __init__(self, file_id, local_path, min_duration_seconds):
        self.file_id = file_id
        self.local_path = local_path
        self.min_duration_seconds = min_duration_seconds
        self.df = None
        

    async def download_sheet(self):
        url = f'https://docs.google.com/spreadsheets/d/{self.file_id}/export?format=xlsx'
        try:
            response = await asyncio.to_thread(urllib.request.urlopen, url)
            content = await asyncio.to_thread(response.read)
            
            self.df = pd.read_excel(io.BytesIO(content))
        except Exception as e:
            logger.exception(f"Error downloading sheet: {e}")
            raise

    async def load_playlist(self):
        if self.df is None:
            raise Exception("Sheet not downloaded. Call download_sheet() first.")
            
        initial_count = len(self.df)
        self.df = self.df.dropna(subset='length')
        logger.debug(f"Dropped {initial_count - len(self.df)} rows with empty length values")
        
        self.df = self.df[self.df['is_music_video'] == True].copy()
        logger.info(f"Filtered to keep only music videos. {len(self.df)} videos remaining")
        
        self.df['duration_seconds'] = self.df['length'].apply(self.parse_duration)
        filtered_df = self.df[self.df['duration_seconds'] > self.min_duration_seconds].copy()
        logger.info(f"Filtered {len(self.df) - len(filtered_df)} videos shorter than {self.min_duration_seconds} seconds")
        
        filtered_df['published_date'] = pd.to_datetime(filtered_df['published_date']).dt.strftime('%Y-%m-%d')

        return filtered_df.to_dict('records')

    @staticmethod
    def parse_duration(duration):
        match = re.match(r'PT(\d+H)?(\d+M)?(\d+S)?', duration)
        if not match:
            logger.warning(f"Invalid duration format: {duration}")
            return 0
        
        hours = int(match.group(1)[:-1]) if match.group(1) else 0
        minutes = int(match.group(2)[:-1]) if match.group(2) else 0
        seconds = int(match.group(3)[:-1]) if match.group(3) else 0
        
        total_seconds = hours * 3600 + minutes * 60 + seconds
        return total_seconds
