function parseComponents(isoDuration) {
    if (!isoDuration) return null;
    
    const matches = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!matches) return null;
    
    return {
        hours: parseInt(matches[1] || 0),
        minutes: parseInt(matches[2] || 0),
        seconds: parseInt(matches[3] || 0)
    };
}

function formatDuration(isoDuration) {
    const components = parseComponents(isoDuration);
    if (!components) return '';
    
    const { hours, minutes, seconds } = components;
    
    if (hours > 0) {
        return `'${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
        return `'${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

function parseISO8601Duration(duration) {
    const components = parseComponents(duration);
    if (!components) return 0;
    
    const { hours, minutes, seconds } = components;
    return hours * 3600 + minutes * 60 + seconds;
}

function matchesPattern(video) {
    const titleIndex = getColumnIndex('TITLE');
    const descriptionIndex = getColumnIndex('DESCRIPTION');
    const searchText = `${video[titleIndex] || ''}\n${video[descriptionIndex] || ''}`;
    const pattern = getConfig('PATTERNS.TM_KRISHNA');
    return pattern.test(searchText);
}

function truncateDescription(description) {
    if (!description) return '';
    
    const maxLength = getConfig('PROCESSING.MAX_DESCRIPTION_LENGTH');
    
    if (description.length <= maxLength) {
        return description;
    }
    
    const truncated = description.substring(0, maxLength);

    return truncated.trim() + '...';
}
