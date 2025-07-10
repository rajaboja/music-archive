from fasthtml.common import *


def render_track_item(track):
    video_id = track['video_id']
    title = track['title']
    
    return Li(
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


def render_track_list(tracks):
    return [render_track_item(track) for track in tracks]
