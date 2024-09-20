var player;
var playlist;

function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) { updateTrackInfo(); }

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.PLAYING) {
        updateTrackInfo();
    }
}

function formatDuration(duration) {
    var match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    var hours = (parseInt(match[1]) || 0);
    var minutes = (parseInt(match[2]) || 0);
    var seconds = (parseInt(match[3]) || 0);
    
    var result = "";
    if (hours > 0) { result += hours + "h "; }
    if (minutes > 0 || hours > 0) { result += minutes + "m "; }
    result += seconds + "s";
    
    return result.trim();
}

function updateTrackInfo() {
    var videoData = player.getVideoData();
    var currentVideo = playlist.find(video => video.video_id === videoData.video_id);
    var trackInfo = document.getElementById('track-info');
    if (currentVideo) {
        trackInfo.innerHTML = '<h3>' + currentVideo.title + '</h3>' +
                              '<p>Duration: ' + formatDuration(currentVideo.length) + '</p>' +
                              '<p>Published: ' + currentVideo.published_date + '</p>' +
                              (currentVideo.description ? '<p>Description: ' + currentVideo.description + '</p>' : '');
    } else {
        trackInfo.innerHTML = '<h3>' + videoData.title + '</h3>';
    }
}

function initPlaylist(playlistData) {
    playlist = playlistData;
}