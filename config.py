# Configuration settings

import os
import secrets
import logging


class Config:
    LOGGING_CONFIG = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'default': {
                'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            },
        },
        'handlers': {
            'file': {
                'level': 'INFO',
                'class': 'logging.FileHandler',
                'filename': 'app.log',
                'formatter': 'default',
            },
        },
        'loggers': {
            '': {
                'handlers': ['file'],
                'level': 'INFO',
                'propagate': True,
            },
            'watchfiles.main': {
                'level': 'WARNING',  # Change the level to WARNING to filter out INFO messages
                'handlers': ['file'],
                'propagate': False,
            },
        },
    }

    CACHE_DURATION = int(os.getenv('CACHE_DURATION', 3600*24*7))  # 1 hour
    CACHE_FILE = os.getenv('CACHE_FILE', '/tmp/tmk_playlist_cache.json')
    SECRET_KEY = os.getenv('SECRET_KEY', secrets.token_hex(16))