// WeWe RSS API types

// WeChat Reading API request/response types
export interface WeReadLoginResponse {
	success: boolean;
	qrCodeUrl: string;
	loginToken: string;
}

export interface WeReadLoginStatusResponse {
	success: boolean;
	loggedIn: boolean;
	cookie?: string;
	userName?: string;
}

export interface WeReadFeedSearchResponse {
	success: boolean;
	feed?: {
		feedId: string;
		title: string;
		description: string;
		avatar: string;
	};
	error?: string;
}

export interface WeReadArticle {
	id: string;
	title: string;
	url: string;
	publishedAt: number;
	content: string;
	contentHtml: string;
	excerpt: string;
	author: string;
}

export interface WeReadArticlesResponse {
	success: boolean;
	articles: WeReadArticle[];
	hasMore: boolean;
	error?: string;
}

// Feed generation types
export interface FeedOptions {
	title?: string;
	titleInclude?: string[]; // Regex patterns
	titleExclude?: string[]; // Regex patterns
	limit?: number;
}

export enum FeedFormat {
	RSS = 'rss',
	ATOM = 'atom',
	JSON = 'json',
}

// OPML export type
export interface OpmlFeed {
	title: string;
	xmlUrl: string;
	htmlUrl: string;
	description: string;
}
