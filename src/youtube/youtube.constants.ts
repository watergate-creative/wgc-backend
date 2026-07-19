// youtube.constants.ts
// export const YOUTUBE_API = {
//   SEARCH_URL: 'https://www.googleapis.com/youtube/v3/search',
//   VIDEOS_URL: 'https://www.googleapis.com/youtube/v3/videos',
//   RETRY_COUNT: 3,
//   RETRY_DELAY_MS: 2000,
//   MAX_RESULTS: 50,
// };

// export const YOUTUBE_CACHE = {
//   LATEST_VIDEOS_KEY: 'youtube:latest_videos',
//   SEARCH_PREFIX: 'youtube:search:',
//   LATEST_TTL_SEC: 86400, // 24 hours
//   SEARCH_TTL_SEC: 3600,   // 1 hour
// };


export const YOUTUBE_API = {
  // YouTube Data API v3 Endpoints
  SEARCH_URL: 'https://www.googleapis.com/youtube/v3/search',
  PLAYLISTS_URL: 'https://www.googleapis.com/youtube/v3/playlists',
  PLAYLIST_ITEMS_URL: 'https://www.googleapis.com/youtube/v3/playlistItems',
  VIDEOS_URL: 'https://www.googleapis.com/youtube/v3/videos',

  // Network Resilience
  RETRY_COUNT: 3,
  RETRY_DELAY_MS: 1000,
} as const;

export const YOUTUBE_CACHE = {
  // Global Cache Keys
  LATEST_VIDEOS_KEY: 'youtube:latest_pool',
  SEARCH_INDEX_KEY: 'youtube:search_index',
  
  // Dynamic Search Prefix (appended with query, category, skip, and limit)
  SEARCH_PREFIX: 'youtube:search:',

  // Time-To-Live (TTL) in Seconds
  // 21600 seconds = 6 hours (aligns perfectly with your EVERY_6_HOURS cron job)
  LATEST_TTL_SEC: 21600, 
  // 3600 seconds = 1 hour (shorter TTL for dynamic user searches to save memory)
  SEARCH_TTL_SEC: 3600,  
} as const;