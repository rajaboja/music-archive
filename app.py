from fasthtml.common import *
import logging
from playlist_manager import load_playlist
from config import LOGGING_CONFIG, CACHE_DURATION

# Set up logging
logging.basicConfig(**LOGGING_CONFIG)
logger = logging.getLogger(__name__)

app, rt = fast_app()

@rt("/")
def get():
    playlist = load_playlist()
    
    # Create a comma-separated string of video IDs
    video_ids = ','.join([video['video_id'] for video in playlist])
    
    # Create the playlist embed URL
    playlist_embed_url = f"https://www.youtube.com/embed/?playlist={video_ids}&loop=1"
    
    player = Iframe(src=playlist_embed_url, 
                    width="100%", height="450", frameborder="0", 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture", 
                    allowfullscreen=True)
    
    style = Style("""
    body {
        font-family: Arial, sans-serif;
        background-color: #f0f0f0;
        margin: 0;
        padding: 20px;
    }
    .container {
        max-width: 800px;
        margin: 0 auto;
        background-color: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }
    h1 {
        color: #333;
        text-align: center;
        margin-bottom: 20px;
    }
    .player-wrapper {
        position: relative;
        padding-bottom: 56.25%; /* 16:9 aspect ratio */
        height: 0;
        overflow: hidden;
    }
    .player-wrapper iframe {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
    }
    @media (max-width: 600px) {
        .container {
            padding: 10px;
        }
    }
    """)
    
    logger.info("Rendering playlist page")
    return Titled("T M Krishna's Latest Concerts",
                  Div(
                      style,
                      Div(
                          Div(player, cls="player-wrapper"),
                          cls="container"
                      )
                  ))

serve()