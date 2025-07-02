/**
 * Configuration Management Module
 * Centralizes all configuration settings for the YouTube video processing system
 */

const AppConfig = {
  PROCESSING: {
    VIDEOS_PER_REQUEST: 50,
    MIN_DURATION_SECONDS: 120,
    MAX_DESCRIPTION_LENGTH: 500,
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 1000
  },

  API: {
    GEMINI: {
      MODEL: 'gemini-2.0-flash-lite',
      VERSION: 'v1beta',
      MAX_OUTPUT_TOKENS: 8192,
      RESPONSE_MIME_TYPE: 'application/json'
    },
    YOUTUBE: {
      MAX_RESULTS: 50,
      SEARCH_QUERY: 'T M Krishna'
    }
  },

  SHEETS: {
    HEADERS: {
      SOURCE: ['video_id', 'title', 'length', 'published_date', 'description', 'category_id', 'category_name'],
      PROCESSED: ['video_id', 'title', 'length', 'published_date', 'description', 'category_id', 'category_name', 'is_music_video'],
      CLEAN: ['video_id', 'title', 'length', 'published_date', 'description', 'category_id', 'category_name']
    },
    COLUMNS: {
      VIDEO_ID: 0,
      TITLE: 1,
      LENGTH: 2,
      PUBLISHED_DATE: 3,
      DESCRIPTION: 4,
      CATEGORY_ID: 5,
      CATEGORY_NAME: 6,
      IS_MUSIC_VIDEO: 7
    }
  },

  PATTERNS: {
    TM_KRISHNA: /t\.?\s*m\.?\s*krishna/i
  },

  PLAYLIST: {
    NAME: "T.M. Krishna Music Performances",
    DESCRIPTION: "A curated playlist of T.M. Krishna's music performances. Updated daily.",
    PRIVACY_STATUS: 'private',
    SYNC_HOUR: 4
  },

  TRIGGERS: {
    PROCESSING_HOUR: 2,
    INTERVAL_DAYS: 1,
    CLEAN_SYNC_ENABLED: true
  },

  CACHE: {
    CATEGORIES_KEY: 'VIDEO_CATEGORIES',
    CATEGORIES_TTL: 21600
  },

  ENV: {
    SOURCE_SPREADSHEET_ID: null,
    PROCESSED_SPREADSHEET_ID: null,
    CLEAN_SPREADSHEET_ID: null,
    GOOGLE_API_KEY: null,
    PLAYLIST_ID: null
  }
};

class ConfigManager {
  constructor() {
    this.config = AppConfig;
    this.isLoaded = false;
  }

  load() {
    if (this.isLoaded) {
      return;
    }

    const properties = PropertiesService.getScriptProperties();
    
    this.config.ENV.SOURCE_SPREADSHEET_ID = properties.getProperty('SOURCE_SPREADSHEET_ID');
    this.config.ENV.PROCESSED_SPREADSHEET_ID = properties.getProperty('PROCESSED_SPREADSHEET_ID');
    this.config.ENV.CLEAN_SPREADSHEET_ID = properties.getProperty('CLEAN_SPREADSHEET_ID');
    this.config.ENV.GOOGLE_API_KEY = properties.getProperty('GOOGLE_API_KEY');
    this.config.ENV.PLAYLIST_ID = properties.getProperty('PLAYLIST_ID');

    this.validate();
    
    this.isLoaded = true;
    Logger.log('Configuration loaded successfully');
  }

  validate() {
    const required = [
      { key: 'SOURCE_SPREADSHEET_ID', value: this.config.ENV.SOURCE_SPREADSHEET_ID },
      { key: 'PROCESSED_SPREADSHEET_ID', value: this.config.ENV.PROCESSED_SPREADSHEET_ID },
      { key: 'GOOGLE_API_KEY', value: this.config.ENV.GOOGLE_API_KEY }
    ];

    const missing = required.filter(item => !item.value).map(item => item.key);
    
    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }

  }

  get(path) {
    if (!this.isLoaded) {
      this.load();
    }

    const keys = path.split('.');
    let value = this.config;
    
    for (const key of keys) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[key];
    }
    
    return value;
  }

  getAll() {
    if (!this.isLoaded) {
      this.load();
    }
    return this.config;
  }

  getColumnIndex(columnName) {
    const index = this.config.SHEETS.COLUMNS[columnName];
    if (index === undefined) {
      throw new Error(`Unknown column name: ${columnName}`);
    }
    return index;
  }

  getGeminiApiUrl() {
    const apiKey = this.get('ENV.GOOGLE_API_KEY');
    const version = this.get('API.GEMINI.VERSION');
    const model = this.get('API.GEMINI.MODEL');
    
    return `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`;
  }

  getSheetHeaders(sheetType) {
    const headers = this.config.SHEETS.HEADERS[sheetType];
    if (!headers) {
      throw new Error(`Unknown sheet type: ${sheetType}`);
    }
    return [...headers];
  }

  set(path, value) {
    const keys = path.split('.');
    let obj = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in obj)) {
        obj[keys[i]] = {};
      }
      obj = obj[keys[i]];
    }
    
    obj[keys[keys.length - 1]] = value;
  }
}

const Config = new ConfigManager();

function initializeConfig() {
  Config.load();
}

function getConfig(path) {
  return Config.get(path);
}

function getColumnIndex(columnName) {
  return Config.getColumnIndex(columnName);
}
