import json
from loguru import logger
from fasthtml.common import *
from services.youtube_service import YouTubeService
from playlist_manager import PlaylistManager

class PlaylistView:
    def __init__(self, playlist_manager: PlaylistManager, youtube_service: YouTubeService):
        self.playlist_manager = playlist_manager
        self.youtube_service = youtube_service

    async def render(self):
        try:
            playlist = await self.playlist_manager.load_playlist()
            if not playlist:
                return Titled("Error", Div("Unable to load playlist. Please try again later."))

            video_ids = ','.join([video['video_id'] for video in playlist])
            playlist_embed_url = self.youtube_service.get_playlist_embed_url(video_ids)

            return Titled("T M Krishna's Latest Concerts",
                          Div(
                              Link(rel="stylesheet", href="/static/css/playlist.css"),
                              Script(src="https://www.youtube.com/iframe_api"),
                              Script(src="/static/js/playlist.js"),
                              Script(f"initPlaylist({json.dumps(playlist)});"),
                              Div(
                                  Div(self._create_player(playlist_embed_url), cls="player-wrapper"),
                                  Div(id="track-info", cls="track-info"),
                                  cls="container"
                              )
                          ))

        except Exception as e:
            logger.exception(f"An error occurred while rendering the playlist: {e}")
            return Titled("Error", Div("An unexpected error occurred. Please try again later."))

    def _create_player(self, playlist_embed_url):
        return Iframe(src=playlist_embed_url, 
                      width="100%", height="450", frameborder="0", 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture", 
                      allowfullscreen=True,
                      id="player")