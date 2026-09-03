


export const YOUTUBE_API = {
  SEARCH_URL: 'https://www.googleapis.com/youtube/v3/search',
  PLAYLISTS_URL: 'https://www.googleapis.com/youtube/v3/playlists',
  PLAYLIST_ITEMS_URL: 'https://www.googleapis.com/youtube/v3/playlistItems',
  VIDEOS_URL: 'https://www.googleapis.com/youtube/v3/videos',
  RETRY_COUNT: 3,
  RETRY_DELAY_MS: 1000,
} as const;

export const YOUTUBE_CACHE = {
  LATEST_VIDEOS_KEY: 'youtube:latest_pool',
  SEARCH_PREFIX: 'youtube:search:',
  LATEST_TTL_SEC: 21600, 
  SEARCH_TTL_SEC: 3600,  
} as const;