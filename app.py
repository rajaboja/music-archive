from loguru import logger
from fasthtml.common import *
from starlette.staticfiles import StaticFiles
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
app, rt = fast_app(live=True)

# Mount static files middleware
app.mount("/static", StaticFiles(directory="static"), name="static")

@rt("/")
async def get(request):
    try:
        if not hasattr(app.state, 'playlist_manager'):
            playlist_manager = await initialize_services()
            app.state.playlist_manager = playlist_manager

        playlist_manager = request.app.state.playlist_manager
        playlist = await playlist_manager.load_playlist()

        tracks_list = []
        for track in playlist:
            video_url = f"https://youtu.be/{track['video_id']}"
            tracks_list.extend([
                A(track['title'], href=video_url),
                Br(),
                Br()
            ])

        content = Div(
            Div(
                *tracks_list
            ),
            cls="container" 
        )

        return Titled(
            "T M Krishna's Concerts", 
            content
        )

    except Exception as e:
        logger.exception(f"Unexpected error in GET handler: {e}")
        return Titled("Error", Article("An unexpected error occurred. Please try again later.", class_="container"))

if __name__ == "__main__":
    serve()
