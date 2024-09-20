import logging
from fasthtml.common import *
from playlist_manager import PlaylistManager
from config import Config
from views.playlist_view import PlaylistView
from services.youtube_service import YouTubeService
from starlette.staticfiles import StaticFiles

# Set up logging
logging.config.dictConfig(Config.LOGGING_CONFIG)
logger = logging.getLogger(__name__)

async def initialize_services():
    try:
        playlist_manager = PlaylistManager(Config.GOOGLE_DRIVE_FILE_ID, Config.LOCAL_SPREADSHEET_PATH, Config.CACHE_DURATION)
        youtube_service = YouTubeService()
        await playlist_manager.initialize()
        await youtube_service.initialize()
        logger.info("Services initialized successfully")
        return playlist_manager, youtube_service
    except Exception as e:
        logger.error(f"Error initializing services: {e}")
        raise

# Create the FastHTML app with the secret key
app, rt = fast_app(secret_key=Config.SECRET_KEY)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

@rt("/")
async def get(request):
    logger.info("Handling GET request")
    try:
        if not hasattr(app.state, 'playlist_manager') or not hasattr(app.state, 'youtube_service'):
            playlist_manager, youtube_service = await initialize_services()
            app.state.playlist_manager = playlist_manager
            app.state.youtube_service = youtube_service
            logger.info("Services initialized and attached to app.state")

        playlist_manager = request.app.state.playlist_manager
        youtube_service = request.app.state.youtube_service
        playlist_view = PlaylistView(playlist_manager, youtube_service)
        return await playlist_view.render()
    except AttributeError as e:
        logger.error(f"AttributeError in GET handler: {e}")
        return Titled("Error", Div("An error occurred while loading the playlist. Please try again later."))
    except Exception as e:
        logger.error(f"Unexpected error in GET handler: {e}")
        return Titled("Error", Div("An unexpected error occurred. Please try again later."))

if __name__ == "__main__":
    serve()