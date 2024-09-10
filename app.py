import json
from fasthtml.common import *
import logging
from playlist_manager import PlaylistManager
from config import Config
import asyncio

# Set up logging
logging.basicConfig(**Config.LOGGING_CONFIG)
logger = logging.getLogger(__name__)

# Create the FastHTML app with the secret key
app, rt = fast_app(secret_key=Config.SECRET_KEY)

class PlaylistView:
    def __init__(self, playlist_manager: PlaylistManager):
        self.playlist_manager = playlist_manager

    async def render(self):
        playlist = await self.playlist_manager.load_playlist()
        video_ids = ','.join([video['video_id'] for video in playlist])
        playlist_embed_url = f"https://www.youtube.com/embed/?playlist={video_ids}&loop=1&enablejsapi=1"
        
        player = Iframe(src=playlist_embed_url, 
                        width="100%", height="450", frameborder="0", 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture", 
                        allowfullscreen=True,
                        id="player")
        
        track_info = Div(id="track-info", cls="track-info")
        
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
        .track-info {
            margin-top: 20px;
            padding: 10px;
            background-color: #f9f9f9;
            border-radius: 5px;
            text-align: center;
        }
        """)
        
        script = Script("""
        var player;
        var playlist = """ + json.dumps(playlist) + """;

        function onYouTubeIframeAPIReady() {
            player = new YT.Player('player', {
                events: {
                    'onReady': onPlayerReady,
                    'onStateChange': onPlayerStateChange
                }
            });
        }

        function onPlayerReady(event) {
            updateTrackInfo();
        }

        function onPlayerStateChange(event) {
            if (event.data == YT.PlayerState.PLAYING) {
                updateTrackInfo();
            }
        }

        function updateTrackInfo() {
            var videoData = player.getVideoData();
            var currentVideo = playlist.find(video => video.video_id === videoData.video_id);
            var trackInfo = document.getElementById('track-info');
            if (currentVideo) {
                trackInfo.innerHTML = '<h3>' + currentVideo.title + '</h3>' +
                                      '<p>Duration: ' + currentVideo.duration + '</p>' +
                                      '<p>Published: ' + currentVideo.published_time + '</p>';
            } else {
                trackInfo.innerHTML = '<h3>' + videoData.title + '</h3>';
            }
        }
        """)
        
        youtube_api_script = Script(src="https://www.youtube.com/iframe_api")
        
        logger.info("Rendering playlist page with track info")
        return Titled("T M Krishna's Latest Concerts",
                      Div(
                          style,
                          youtube_api_script,
                          script,
                          Div(
                              Div(player, cls="player-wrapper"),
                              track_info,
                              cls="container"
                          )
                      ))

playlist_manager = PlaylistManager(Config.CACHE_FILE, Config.CACHE_DURATION)

async def initialize():
    await playlist_manager.initialize()

playlist_view = PlaylistView(playlist_manager)

@rt("/")
async def get():
    return await playlist_view.render()

if __name__ == "__main__":
    asyncio.run(initialize())
    serve()

# Cleanup
@app.on_event("shutdown")
async def shutdown_event():
    await playlist_manager.close()