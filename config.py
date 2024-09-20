# Configuration settings

import os
import secrets
import tempfile
from loguru import logger

# Loguru configuration
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FILE = os.getenv("LOG_FILE", "app.log")

logger.add(LOG_FILE, rotation="10 MB", level=LOG_LEVEL)

class Config:
    CACHE_DURATION = int(os.getenv('CACHE_DURATION', 3600*24))  # 1 day
    SECRET_KEY = os.getenv('SECRET_KEY', secrets.token_hex(16))

    GOOGLE_DRIVE_FILE_ID = os.getenv('GOOGLE_DRIVE_FILE_ID')
    LOCAL_SPREADSHEET_PATH = tempfile.gettempdir() + '/spreadsheet.xlsx'