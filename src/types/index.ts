// Plugin settings interface
export interface WeWeRssSettings {
	// Database
	databasePath: string;

	// Sync settings
	syncSchedule: string; // Cron expression
	autoSync: boolean;
	syncInterval: number; // Sync interval in minutes
	updateDelay: number; // Delay between feed updates (seconds)
	maxArticlesPerFeed: number;
	articleRetentionDays: number; // Only keep articles from last N days
	lastCleanupRetentionDays: number; // Last used value for manual cleanup
	syncDaysFilter: number; // Only sync articles from last N days (1-365)

	// Note creation
	noteFolder: string;
	noteLocation: string; // Alias for noteFolder
	noteTemplate: string;
	addTags: boolean; // Whether to add tags to notes

	// Title filtering
	titleIncludePatterns: string[]; // Regex patterns
	titleExcludePatterns: string[]; // Regex patterns

	// API settings
	platformUrl: string;
	maxRequestsPerMinute: number;

	// Content settings
	feedMode: 'summary' | 'fulltext';
	enableCleanHtml: boolean;

	// Database backup settings
	autoBackupEnabled: boolean;
	backupRetentionDays: number;
	backupBeforeSync: boolean;

	// AI Summarization settings
	summarizationEnabled: boolean;
	summarizationProvider: 'openai' | 'gemini' | 'claude' | 'deepseek' | 'glm' | 'generic';
	summarizationApiKey: string;
	summarizationApiEndpoint: string;
	summarizationModel: string;
	summarizationFolder: string;
	summarizationScheduleTime: string; // "HH:MM" format (24-hour)
	summarizationAutoRun: boolean;
	summarizationLastRun: number; // Unix timestamp
	summarizationRequestDelaySeconds: number; // Delay between article summarization requests (seconds)
}

export const DEFAULT_SETTINGS: WeWeRssSettings = {
	databasePath: '.obsidian/plugins/wewe-rss/data.db',
	syncSchedule: '35 5,17 * * *', // 5:35 AM and 5:35 PM
	autoSync: true,
	syncInterval: 60, // 60 minutes
	updateDelay: 60, // 60 seconds
	maxArticlesPerFeed: 100,
	articleRetentionDays: 30, // Keep articles from last 30 days
	lastCleanupRetentionDays: 30, // Default cleanup retention
	syncDaysFilter: 5, // Only sync articles from last 5 days
	noteFolder: 'WeWe RSS',
	noteLocation: 'WeWe RSS',
	noteTemplate: `---
title: {{title}}
url: {{url}}
published: {{publishedAt}}
feed: {{feedName}}
tags: [wewe-rss, {{feedName}}]
---

# {{title}}

> Published: {{publishedAt}}
> Source: [{{feedName}}]({{url}})

{{content}}
`,
	addTags: true,
	titleIncludePatterns: [],
	titleExcludePatterns: [],
	platformUrl: 'https://weread.111965.xyz',
	maxRequestsPerMinute: 60,
	feedMode: 'summary',
	enableCleanHtml: false,
	autoBackupEnabled: true,
	backupRetentionDays: 7,
	backupBeforeSync: true,
	summarizationEnabled: false,
	summarizationProvider: 'openai',
	summarizationApiKey: '',
	summarizationApiEndpoint: 'https://api.openai.com/v1',
	summarizationModel: 'gpt-3.5-turbo',
	summarizationFolder: 'Daily Summaries',
	summarizationScheduleTime: '01:00',
	summarizationAutoRun: false,
	summarizationLastRun: 0,
	summarizationRequestDelaySeconds: 10, // 10 seconds default (safe for free tier APIs)
};

// Account status enum
export enum AccountStatus {
	ACTIVE = 'active',
	DISABLED = 'disabled',
	EXPIRED = 'expired',
	BLACKLISTED = 'blacklisted', // 小黑屋
}

// Custom error for account re-authentication needed
export class AccountReauthError extends Error {
	constructor(message?: string) {
		super(message || 'Account requires re-authentication');
		this.name = 'AccountReauthError';
		Object.setPrototypeOf(this, AccountReauthError.prototype);
	}
}

// Error messages constants
export const ERROR_MESSAGES = {
	ACCOUNT_NEEDS_REAUTH: 'Your account credentials are outdated and need to be refreshed. Please remove this account and add it again by scanning the QR code in Settings > WeWe RSS > Accounts.',
	ACCOUNT_NOT_FOUND: 'Please add a WeChat account before subscribing to feeds. Go to Settings > WeWe RSS > Add Account.',
	FEED_ALREADY_EXISTS: 'You are already subscribed to this public account.',
	FEED_NOT_FOUND: 'Feed not found.',
	NO_MP_INFO: 'Failed to get public account information from the share link. Please check the URL.',
} as const;

// Account interface
export interface Account {
	id: number;
	name: string;
	cookie: string;
	status: AccountStatus;
	blacklistedUntil?: number; // Timestamp
	createdAt: number;
	updatedAt: number;
}

// Feed interface
export interface Feed {
	id: number;
	feedId: string; // WeChat public account ID (e.g., MP_WXS_123)
	title: string;
	description: string;
	accountId: number;
	lastSyncAt?: number;
	createdAt: number;
	updatedAt: number;
}

// Article interface
export interface Article {
	id: number;
	feedId: number;
	title: string;
	content: string;
	contentHtml: string;
	url: string;
	publishedAt: number;
	synced: boolean; // Whether note has been created
	noteId?: string; // Path to created note
	createdAt: number;
}

// Database table schemas
export interface DBTables {
	accounts: Account;
	feeds: Feed;
	articles: Article;
	settings: {
		key: string;
		value: string;
	};
}

// Database backup types
export enum BackupReason {
	MANUAL = 'manual',
	AUTO = 'auto',
	PRE_INITIALIZATION = 'pre-initialization',
	PRE_MIGRATION = 'pre-migration',
	PRE_SYNC = 'pre-sync',
}

export interface BackupInfo {
	path: string;
	timestamp: number;
	size: number;
	reason: BackupReason;
}

// Database health check types
export interface HealthCheckResult {
	isHealthy: boolean;
	errors: string[];
	warnings: string[];
}

export interface HealthReport {
	timestamp: number;
	integrity: HealthCheckResult;
	schema: HealthCheckResult;
	recommendations: string[];
}

// AI Summarization types
export interface SummaryArticle {
	id: number;
	title: string;
	content: string;
	url: string;
	publishedAt: number;
	feedName: string;
	noteId?: string;
}

export interface ArticleSummary {
	articleId: number;
	title: string;
	summary: string;
	metadata: {
		publishedAt: string;
		feedName: string;
		noteLink: string;
	};
}

export interface DailySummaryResult {
	date: string;
	summaries: ArticleSummary[];
	totalArticles: number;
	filePath: string;
}
