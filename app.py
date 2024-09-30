from loguru import logger
from fasthtml.common import *
from playlist_manager import PlaylistManager
from config import Config
from views.playlist_view import PlaylistView
from services.youtube_service import YouTubeService
from starlette.staticfiles import StaticFiles

async def initialize_services():
    try:
        logger.info("Initializing services")
        playlist_manager = PlaylistManager(
            Config.GOOGLE_DRIVE_FILE_ID, 
            Config.LOCAL_SPREADSHEET_PATH, 
            Config.CACHE_DURATION,
            Config.MIN_DURATION_SECONDS
        )
        youtube_service = YouTubeService()
        await playlist_manager.initialize()
        await youtube_service.initialize()
        logger.info("Services initialized successfully")
        return playlist_manager, youtube_service
    except Exception as e:
        logger.exception(f"Error initializing services: {e}")
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
            logger.info("Initializing services for the first time")
            playlist_manager, youtube_service = await initialize_services()
            app.state.playlist_manager = playlist_manager
            app.state.youtube_service = youtube_service
            logger.info("Services initialized and attached to app.state")
        else:
            logger.info("Using existing services from app.state")

        playlist_manager = request.app.state.playlist_manager
        youtube_service = request.app.state.youtube_service
        playlist_view = PlaylistView(playlist_manager, youtube_service)
        return await playlist_view.render()
    except Exception as e:
        logger.exception(f"Unexpected error in GET handler: {e}")
        return Titled("Error", Div("An unexpected error occurred. Please try again later."))

if __name__ == "__main__":
    logger.info("Starting the application")
    serve()