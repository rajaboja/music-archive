import pandas as pd
from loguru import logger
import asyncio
from pathlib import Path


class DriveStorage:
    def __init__(self, file_id):
        self.file_id = file_id
        self.df = None
        

    async def download_sheet(self):
        url = f'https://docs.google.com/spreadsheets/d/{self.file_id}/export?format=csv'
        try:
            self.df = await asyncio.to_thread(pd.read_csv, url)
        except Exception as e:
            logger.exception(f"Error downloading sheet: {e}")
            raise

    async def load_playlist(self):
        """Load playlist data from clean spreadsheet (already filtered for music videos and duration)"""
        try:
            # Download sheet if not already done
            if self.df is None:
                await self.download_sheet()
                
            self.df['published_date'] = pd.to_datetime(self.df['published_date']).dt.strftime('%Y-%m-%d')
            
            logger.info(f"Loaded {len(self.df)} music videos from clean spreadsheet")
            return self.df.to_dict('records')
            
        except Exception as e:
            logger.exception(f"Error loading playlist: {e}")
            return []
