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
}

export const DEFAULT_SETTINGS: WeWeRssSettings = {
	databasePath: '.obsidian/plugins/wewe-rss/data.db',
	syncSchedule: '35 5,17 * * *', // 5:35 AM and 5:35 PM
	autoSync: true,
	syncInterval: 60, // 60 minutes
	updateDelay: 60, // 60 seconds
	maxArticlesPerFeed: 100,
	articleRetentionDays: 30, // Keep articles from last 30 days
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
};

// Account status enum
export enum AccountStatus {
	ACTIVE = 'active',
	DISABLED = 'disabled',
	EXPIRED = 'expired',
	BLACKLISTED = 'blacklisted', // 小黑屋
}

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
