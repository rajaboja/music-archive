# Configuration settings

import os
import secrets
import logging


class Config:
    LOGGING_CONFIG = {
        'level': logging.INFO,
        'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        'filename': 'app.log',
        'filemode': 'a'
    }

    CACHE_DURATION = int(os.getenv('CACHE_DURATION', 3600))  # 1 hour
    CACHE_FILE = os.getenv('CACHE_FILE', '/tmp/tmk_playlist_cache.json')
    SECRET_KEY = os.getenv('SECRET_KEY', secrets.token_hex(16))