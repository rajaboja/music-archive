from loguru import logger
from fasthtml.common import *
from starlette.staticfiles import StaticFiles
from drive_storage import DriveStorage
from config import Config
from components.track_components import render_track_list
from components.layouts import main_layout

# Create the FastHTML app
app, rt = fast_app(secret_key=Config.SECRET_KEY)

# Mount static files middleware
app.mount("/static", StaticFiles(directory="static"), name="static")

@rt("/")
async def get(request):
    try:
        storage = DriveStorage(Config.GOOGLE_DRIVE_FILE_ID)
        
        # Get real playlist data - first 5 tracks for "Recent Additions"
        tracks = await storage.load_playlist()
        recent_tracks = tracks[:5] if tracks else []

        # Build recent tracks HTML using extracted component
        playlist_items = render_track_list(recent_tracks)

        # Create main content for the page
        content = Div(
            Section(
                H2("Recent Additions"),
                Ul(*playlist_items, cls="playlist", id="playlist", role="list"),
                cls="playlist-section"
            ),
            cls="main-content"
        )

        # Return page using layout
        return main_layout(content)

    except Exception as e:
        logger.exception(f"Unexpected error in GET handler: {e}")
        return Titled("Error", Article("An unexpected error occurred. Please try again later.", cls="container"))

if __name__ == "__main__":
    serve()
