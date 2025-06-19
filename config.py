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
    SECRET_KEY = os.getenv('SECRET_KEY', secrets.token_hex(16))

    GOOGLE_DRIVE_FILE_ID = os.getenv('GOOGLE_DRIVE_FILE_ID')

    MIN_DURATION_SECONDS = int(os.getenv('MIN_DURATION_SECONDS', 120))  # Default to 2 minutes
    