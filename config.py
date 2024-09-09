# Configuration settings

import logging


LOGGING_CONFIG = {
    'level': logging.INFO,
    'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    'filename': 'app.log',
    'filemode': 'a'
}

CACHE_DURATION = 3600  # 1 hour
PLAYLIST_FILE = 'tmk_playlist.json'