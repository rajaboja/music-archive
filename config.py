# Configuration settings

import os
import secrets
from loguru import logger
import sys

# Loguru configuration
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# Remove file logging and use sys.stderr instead
logger.remove()
logger.add(sys.stderr, level=LOG_LEVEL)

class Config:
    CACHE_DURATION = int(os.getenv('CACHE_DURATION', 3600*24))  # 1 day
    SECRET_KEY = os.getenv('SECRET_KEY', secrets.token_hex(16))

    GOOGLE_DRIVE_FILE_ID = os.getenv('GOOGLE_DRIVE_FILE_ID')
    # Use /tmp for Lambda, or fall back to current directory for local development
    LOCAL_SPREADSHEET_PATH = os.getenv('LOCAL_SPREADSHEET_PATH', os.path.join('/tmp', 'spreadsheet.xlsx'))

    MIN_DURATION_SECONDS = int(os.getenv('MIN_DURATION_SECONDS', 120))  # Default to 2 minutes

    # Add logging for configuration
    logger.info(f"CACHE_DURATION: {CACHE_DURATION}")
    logger.info(f"GOOGLE_DRIVE_FILE_ID: {GOOGLE_DRIVE_FILE_ID}")
    logger.info(f"LOCAL_SPREADSHEET_PATH: {LOCAL_SPREADSHEET_PATH}")
    logger.info(f"MIN_DURATION_SECONDS: {MIN_DURATION_SECONDS}")