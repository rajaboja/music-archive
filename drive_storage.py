import gdown
import pandas as pd
import os
import openpyxl
import re
from datetime import datetime
from loguru import logger
import io

class DriveStorage:
    def __init__(self, file_id, local_path):
        self.file_id = file_id
        self.local_path = local_path
        self.df = None
        logger.info(f"DriveStorage initialized with file_id: {file_id}, local_path: {local_path}")
        
        # Ensure the directory exists

    def download_sheet(self):
        url = f'https://drive.google.com/uc?id={self.file_id}'
        logger.info(f"Attempting to download sheet from URL: {url}")
        try:
            output = gdown.download(url, self.local_path, quiet=False)
            if output is None:
                raise Exception("Failed to download the file")
            self.df = pd.read_excel(self.local_path)
            logger.info(f"Downloaded and loaded sheet into memory")
        except Exception as e:
            logger.exception(f"Error downloading sheet: {e}")
            raise

    def load_playlist(self, min_duration_seconds=60):
        logger.info(f"Loading playlist with min_duration_seconds: {min_duration_seconds}")
        if self.df is None:
            raise Exception("Sheet not downloaded. Call download_sheet() first.")

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
            logger.warning(f"Invalid duration format: {duration}")
            return 0
        
        hours = int(match.group(1)[:-1]) if match.group(1) else 0
        minutes = int(match.group(2)[:-1]) if match.group(2) else 0
        seconds = int(match.group(3)[:-1]) if match.group(3) else 0
        
        total_seconds = hours * 3600 + minutes * 60 + seconds
        return total_seconds