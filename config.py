# Configuration settings

import os
import secrets
import logging
import sys
import tempfile


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
            'console': {
                'level': 'INFO',
                'class': 'logging.StreamHandler',
                'formatter': 'default',
                'stream': sys.stdout,
            },
        },
        'loggers': {
            '': {
                'handlers': ['console'],
                'level': 'INFO',
                'propagate': True,
            },
            'watchfiles.main': {
                'level': 'WARNING',
                'handlers': ['console'],
                'propagate': False,
            },
        },
    }

    CACHE_DURATION = int(os.getenv('CACHE_DURATION', 3600*24))  # 1 day
    SECRET_KEY = os.getenv('SECRET_KEY', secrets.token_hex(16))

    GOOGLE_DRIVE_FILE_ID = os.getenv('GOOGLE_DRIVE_FILE_ID')
    LOCAL_SPREADSHEET_PATH = tempfile.gettempdir() + '/spreadsheet.xlsx'