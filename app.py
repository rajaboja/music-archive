import logging
from fasthtml.common import *
from playlist_manager import PlaylistManager
from config import Config
from views.playlist_view import PlaylistView
from services.youtube_service import YouTubeService
from fastapi.staticfiles import StaticFiles

# Set up logging
logging.config.dictConfig(Config.LOGGING_CONFIG)
logger = logging.getLogger(__name__)

# Create the FastHTML app with the secret key
app, rt = fast_app(secret_key=Config.SECRET_KEY)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

async def initialize_services():
    playlist_manager = PlaylistManager(Config.GOOGLE_DRIVE_FILE_ID, Config.LOCAL_SPREADSHEET_PATH, Config.CACHE_DURATION)
    youtube_service = YouTubeService()
    await playlist_manager.initialize()
    await youtube_service.initialize()
    return playlist_manager, youtube_service

@rt("/")
async def get(request):
    playlist_manager, youtube_service = request.app.state.services
    playlist_view = PlaylistView(playlist_manager, youtube_service)
    return await playlist_view.render()

@app.on_event("startup")
async def startup_event():
    app.state.services = await initialize_services()

@app.on_event("shutdown")
async def shutdown_event():
    playlist_manager, youtube_service = app.state.services
    await playlist_manager.close()
    await youtube_service.close()

if __name__ == "__main__":
    serve()