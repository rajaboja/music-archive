import gdown
import pandas as pd
import os
import logging
import openpyxl

logger = logging.getLogger(__name__)

class DriveStorage:
    def __init__(self, file_id, local_path):
        self.file_id = file_id
        self.local_path = local_path

    def download_sheet(self):
        try:
            url = f'https://drive.google.com/uc?id={self.file_id}'
            gdown.download(url, self.local_path, quiet=False)
            logger.info(f"Downloaded spreadsheet from Google Drive: {self.local_path}")
        except Exception as e:
            logger.error(f"Error downloading spreadsheet from Google Drive: {e}")
            raise

    def load_playlist(self):
        try:
            # Read the Excel file
            df = pd.read_excel(self.local_path, engine='openpyxl')
            playlist = df.to_dict('records')
            logger.info(f"Loaded {len(playlist)} videos from spreadsheet")
            return playlist
        except Exception as e:
            logger.error(f"Error loading playlist from spreadsheet: {e}")
            raise

    def save_playlist(self, playlist):
        try:
            df = pd.DataFrame(playlist)
            df.to_excel(self.local_path, index=False, engine='openpyxl')
            logger.info(f"Saved {len(playlist)} videos to local spreadsheet")
        except Exception as e:
            logger.error(f"Error saving playlist to local spreadsheet: {e}")
            raise