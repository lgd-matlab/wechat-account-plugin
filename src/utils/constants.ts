/**
 * Application constants
 */

// Database
export const DB_VERSION = 1;
export const DB_NAME = 'wewe-rss.db';

// API endpoints
export const WECHAT_LOGIN_ENDPOINT = '/api/login';
export const WECHAT_FEED_SEARCH_ENDPOINT = '/api/feed/search';
export const WECHAT_ARTICLES_ENDPOINT = '/api/articles';

// Rate limiting
export const DEFAULT_RATE_LIMIT = 60; // requests per minute
export const DEFAULT_UPDATE_DELAY = 60; // seconds between feed updates

// Blacklist (小黑屋)
export const BLACKLIST_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Feed formats
export const FEED_FORMATS = ['rss', 'atom', 'json'] as const;

// View types
export const VIEW_TYPE_WEWE_RSS = 'wewe-rss-view';
