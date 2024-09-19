import gdown
import pandas as pd
import os
import logging
import openpyxl
import re
from datetime import datetime

logger = logging.getLogger(__name__)

class DriveStorage:
    def __init__(self, file_id, local_path):
        self.file_id = file_id
        self.local_path = local_path
        self.df = None

    def download_sheet(self):
        url = f'https://drive.google.com/uc?id={self.file_id}'
        gdown.download(url, self.local_path, quiet=False)
        logger.info(f"Downloaded sheet to {self.local_path}")

    def load_playlist(self, min_duration_seconds=60):
        if self.df is None:
            self.df = pd.read_excel(self.local_path)
            logger.info(f"Loaded {len(self.df)} rows from {self.local_path}")

        # Convert duration to seconds
        self.df['duration_seconds'] = self.df['length'].apply(self.parse_duration)

        # Filter videos shorter than min_duration_seconds
        filtered_df = self.df[self.df['duration_seconds'] >= min_duration_seconds].copy()

        # Format the published date to keep only the date part as a string
        filtered_df['published_date'] = pd.to_datetime(filtered_df['published_date']).dt.strftime('%Y-%m-%d')

        logger.info(f"Filtered to {len(filtered_df)} videos (duration >= {min_duration_seconds} seconds)")

        # Convert DataFrame to list of dictionaries
        return filtered_df.to_dict('records')

    @staticmethod
    def parse_duration(duration):
        match = re.match(r'PT(\d+H)?(\d+M)?(\d+S)?', duration)
        if not match:
            return 0
        
        hours = int(match.group(1)[:-1]) if match.group(1) else 0
        minutes = int(match.group(2)[:-1]) if match.group(2) else 0
        seconds = int(match.group(3)[:-1]) if match.group(3) else 0
        
        return hours * 3600 + minutes * 60 + seconds