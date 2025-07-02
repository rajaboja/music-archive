import pandas as pd
from loguru import logger
import asyncio
import urllib.request
import io
from pathlib import Path


class DriveStorage:
    def __init__(self, file_id):
        self.file_id = file_id
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
        """Load playlist data from clean spreadsheet (already filtered for music videos and duration)"""
        try:
            # Download sheet if not already done
            if self.df is None:
                await self.download_sheet()
                
            # Clean spreadsheet already contains only music videos filtered by duration
            # Just need to format the published_date
            self.df['published_date'] = pd.to_datetime(self.df['published_date']).dt.strftime('%Y-%m-%d')
            
            logger.info(f"Loaded {len(self.df)} music videos from clean spreadsheet")
            return self.df.to_dict('records')
            
        except Exception as e:
            logger.exception(f"Error loading playlist: {e}")
            return []
