from loguru import logger
from fasthtml.common import *
from playlist_manager import PlaylistManager
from config import Config
async def initialize_services():
    try:
        playlist_manager = PlaylistManager(
            Config.GOOGLE_DRIVE_FILE_ID, 
            Config.LOCAL_SPREADSHEET_PATH, 
            Config.CACHE_DURATION,
            Config.MIN_DURATION_SECONDS
        )
        await playlist_manager.initialize()
        return playlist_manager
    except Exception as e:
        logger.exception(f"Error initializing services: {e}")
        raise

# Create the FastHTML app
app, rt = fast_app()

@rt("/")
async def get(request):
    try:
        if not hasattr(app.state, 'playlist_manager'):
            playlist_manager = await initialize_services()
            app.state.playlist_manager = playlist_manager

        playlist_manager = request.app.state.playlist_manager
        playlist = await playlist_manager.load_playlist()

        # Create an ordered list of track titles
        track_list = Ol(*(
            Li(track['title'])
            for track in playlist
        ))

        return Titled(
            "T M Krishna's Concerts",
            Div(
                Style("""
                    body { font-family: Verdana, Arial; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; }
                    ol { margin: 20px 0; }
                    li { margin-bottom: 10px; }
                """),
                track_list
            )
        )

    except Exception as e:
        logger.exception(f"Unexpected error in GET handler: {e}")
        return Titled("Error", Div("An unexpected error occurred. Please try again later."))

if __name__ == "__main__":
    serve()
