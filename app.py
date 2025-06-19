from loguru import logger
from fasthtml.common import *
from starlette.staticfiles import StaticFiles
from playlist_manager import PlaylistManager
from config import Config

# Create the FastHTML app
app, rt = fast_app(secret_key=Config.SECRET_KEY)

# Mount static files middleware
app.mount("/static", StaticFiles(directory="static"), name="static")

@rt("/")
async def get(request):
    try:
        playlist_manager = PlaylistManager(
            Config.GOOGLE_DRIVE_FILE_ID, 
            Config.MIN_DURATION_SECONDS
        )
        
        # Get real playlist data - first 5 tracks for "Recent Additions"
        tracks = await playlist_manager.load_playlist()
        recent_tracks = tracks[:5] if tracks else []

        # Build recent tracks HTML exactly like tmk-refactored
        playlist_items = []
        for track in recent_tracks:
            video_id = track['video_id']
            title = track['title']
            
            playlist_items.append(
                Li(
                    Div(
                        Div(
                            NotStr('''<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z"/>
                            </svg>'''),
                            cls="play-icon",
                            **{"aria-hidden": "true"}
                        ),
                        Span(title, cls="track-title"),
                        cls="track-info"
                    ),
                    Div(
                        Button(
                            NotStr('''<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M14 10H2v2h12v-2zm0-4H2v2h12V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM2 16h8v-2H2v2z"/>
                            </svg>'''),
                            cls="add-to-playlist",
                            title="Add to Playlist",
                            **{"aria-label": f"Add {title} to playlist"}
                        ),
                        cls="track-controls"
                    ),
                    **{"data-video": video_id, "role": "listitem"}
                )
            )

        # Return the exact HTML structure as tmk-refactored
        return Html(
            Head(
                Meta(charset="UTF-8"),
                Meta(name="viewport", content="width=device-width, initial-scale=1.0"),
                Title("TMK Fan Archive Playlist"),
                # PicoCSS
                Link(rel="stylesheet", href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"),
                # Custom Styles - use the copied styles.css
                Link(rel="stylesheet", href="/static/css/styles.css")
            ),
            Body(
                # Hero Banner
                Div(cls="hero-banner", role="banner"),
                
                # Main Content
                Main(
                    Header(
                        P(
                            "All of TMK's music from YouTube. Find everything ",
                            A("here", href="#"),
                            ".",
                            cls="subtitle"
                        )
                    ),
                    
                    # Player Container
                    Div(
                        Div(id="player"),
                        Div("Loading...", cls="loading-indicator", **{"aria-live": "polite"}),
                        id="player-container",
                        role="region",
                        **{"aria-label": "Video Player"}
                    ),
                    
                    Div(
                        # Playlist Section
                        Section(
                            H2("Recent Additions"),
                            Ul(*playlist_items, cls="playlist", id="playlist", role="list"),
                            cls="playlist-section"
                        ),
                        cls="main-content"
                    ),
                    cls="container"
                ),
                
                # Modal Overlay
                Div(cls="modal-overlay", id="modal-overlay"),
                
                # Playlist Panel
                Div(
                    H3("Up Next", id="playlist-title"),
                    Div(
                        Ul(cls="playlist", id="custom-playlist", role="list"),
                        id="custom-playlist-container"
                    ),
                    id="playlist-panel",
                    role="dialog",
                    **{"aria-labelledby": "playlist-title", "aria-modal": "true"}
                ),
                
                # Player Controls - exact structure from tmk-refactored
                Div(
                    Div(
                        # Progress Group (Mobile: spans full width)
                        Div(
                            Div(
                                Div(id="progress-bar"),
                                id="progress-container",
                                role="progressbar",
                                **{"aria-label": "Playback progress", "tabindex": "0"}
                            ),
                            Div("0:00 / 0:00", id="time-display", **{"aria-live": "polite"}),
                            cls="progress-group"
                        ),
                        
                        # Left Controls
                        Div(
                            Button(
                                NotStr('''<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                                </svg>'''),
                                id="prev-track",
                                cls="control-button",
                                title="Previous Track (P)",
                                **{"aria-label": "Previous track"}
                            ),
                            
                            Button(
                                NotStr('''<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M8 5v14l11-7z" id="play-icon"/>
                                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" id="pause-icon" style="display: none;"/>
                                </svg>'''),
                                id="play-pause",
                                cls="control-button",
                                title="Play/Pause (Space)",
                                **{"aria-label": "Play or pause"}
                            ),
                            
                            Button(
                                NotStr('''<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                                </svg>'''),
                                id="next-track",
                                cls="control-button",
                                title="Next Track (N)",
                                **{"aria-label": "Next track"}
                            ),
                            
                            Button(
                                NotStr('''<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
                                </svg>'''),
                                id="loop-button",
                                cls="control-button",
                                title="Loop Track (L)",
                                **{"aria-label": "Toggle loop mode"}
                            ),
                            cls="controls-group"
                        ),
                        
                        # Right Controls
                        Div(
                            Div(
                                Button(
                                    NotStr('''<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                                    </svg>'''),
                                    id="volume-button",
                                    cls="control-button",
                                    title="Toggle Mute",
                                    **{"aria-label": "Mute or unmute"}
                                ),
                                Div(
                                    Input(
                                        type="range",
                                        id="volume-slider",
                                        min="0",
                                        max="100",
                                        value="100",
                                        **{"aria-label": "Volume"}
                                    ),
                                    id="volume-slider-container",
                                    role="slider",
                                    **{"aria-label": "Volume control"}
                                ),
                                id="volume-container"
                            ),
                            
                            Button(
                                NotStr('''<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
                                </svg>'''),
                                id="playlist-button",
                                cls="control-button",
                                title="Show Playlist",
                                **{"aria-label": "Show or hide playlist"}
                            ),
                            cls="controls-group"
                        ),
                        cls="player-controls-inner"
                    ),
                    id="player-controls",
                    role="region",
                    **{"aria-label": "Media Controls"}
                ),
                
                # JavaScript Modules - use app.js like tmk-refactored
                Script(type="module", src="/static/js/app.js")
            ),
            lang="en",
            **{"data-theme": "light"}
        )

    except Exception as e:
        logger.exception(f"Unexpected error in GET handler: {e}")
        return Titled("Error", Article("An unexpected error occurred. Please try again later.", cls="container"))

if __name__ == "__main__":
    serve()
