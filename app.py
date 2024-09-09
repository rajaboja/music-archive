from fasthtml.common import *
import logging
from youtube_api import get_latest_tmk_videos
from playlist_manager import update_playlist, load_playlist
from config import LOGGING_CONFIG, CACHE_DURATION

# Set up logging
logging.basicConfig(**LOGGING_CONFIG)
logger = logging.getLogger(__name__)

app, rt = fast_app()

@rt("/")
def get():
    update_playlist()
    playlist = load_playlist()
    
    # Create a comma-separated string of video IDs
    video_ids = ','.join([video['video_id'] for video in playlist])
    
    # Create the playlist embed URL
    playlist_embed_url = f"https://www.youtube.com/embed/?playlist={video_ids}&loop=1"
    
    player = Iframe(src=playlist_embed_url, 
                    width="800", height="450", frameborder="0", 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture", 
                    allowfullscreen=True)
    
    style = Style("""
    body {
        font-family: Arial, sans-serif;
        background-color: #f0f0f0;
        margin: 0;
        padding: 20px;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
    }
    .container {
        max-width: 800px;
        background-color: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }
    h1 {
        color: #333;
        text-align: center;
    }
    """)
    
    logger.info("Rendering main page with playlist")
    return Titled("T M Krishna's Latest Music",
                  Div(
                      style,
                      Div(
                          H1("T M Krishna's Latest Music"),
                          player,
                          cls="container"
                      )
                  ))

serve()