import logging
from fasthtml.common import *
from playlist_manager import PlaylistManager
from config import Config
from views.playlist_view import PlaylistView
from services.youtube_service import YouTubeService
from starlette.staticfiles import StaticFiles
from contextlib import asynccontextmanager

# Set up logging
logging.config.dictConfig(Config.LOGGING_CONFIG)
logger = logging.getLogger(__name__)

async def initialize_services():
    playlist_manager = PlaylistManager(Config.GOOGLE_DRIVE_FILE_ID, Config.LOCAL_SPREADSHEET_PATH, Config.CACHE_DURATION)
    youtube_service = YouTubeService()
    await playlist_manager.initialize()
    await youtube_service.initialize()
    return playlist_manager, youtube_service

@asynccontextmanager
async def lifespan(app):
    # Initialize services
    playlist_manager, youtube_service = await initialize_services()
    app.state.playlist_manager = playlist_manager
    app.state.youtube_service = youtube_service
    yield
    # Clean up services
    await playlist_manager.close()
    await youtube_service.close()

# Create the FastHTML app with the secret key and lifespan
app, rt = fast_app(secret_key=Config.SECRET_KEY, lifespan=lifespan)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

@rt("/")
async def get(request):
    playlist_manager = request.app.state.playlist_manager
    youtube_service = request.app.state.youtube_service
    playlist_view = PlaylistView(playlist_manager, youtube_service)
    return await playlist_view.render()

if __name__ == "__main__":
    serve()