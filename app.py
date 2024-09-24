from loguru import logger
from fasthtml.common import *
from playlist_manager import PlaylistManager
from config import Config
from views.playlist_view import PlaylistView
from services.youtube_service import YouTubeService
from starlette.staticfiles import StaticFiles
import asyncio

async def initialize_services():
    try:
        logger.info("Initializing services")
        playlist_manager = PlaylistManager(Config.GOOGLE_DRIVE_FILE_ID, Config.LOCAL_SPREADSHEET_PATH, Config.CACHE_DURATION)
        youtube_service = YouTubeService()
        await playlist_manager.initialize()
        await youtube_service.initialize()
        logger.info("Services initialized successfully")
        return playlist_manager, youtube_service
    except Exception as e:
        logger.exception(f"Error initializing services: {e}")
        raise

async def background_update(playlist_manager):
    while True:
        try:
            await playlist_manager.update_playlist()
        except Exception as e:
            logger.error(f"Background update failed: {e}")
        await asyncio.sleep(Config.CACHE_DURATION)

# Create the FastHTML app with the secret key
app, rt = fast_app(secret_key=Config.SECRET_KEY)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.on_event("startup")
async def startup_event():
    logger.info("Starting up the application")
    playlist_manager, youtube_service = await initialize_services()
    app.state.playlist_manager = playlist_manager
    app.state.youtube_service = youtube_service
    asyncio.create_task(background_update(playlist_manager))
    logger.info("Services initialized and background task started")

@rt("/")
async def get(request):
    logger.info("Handling GET request")
    try:
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