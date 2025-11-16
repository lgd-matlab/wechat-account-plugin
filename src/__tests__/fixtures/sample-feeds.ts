/**
 * Sample feed fixtures for testing
 * Provides realistic feed/MP data for database operations
 */

export interface FeedFixture {
	id: number;
	feedId: string; // Changed to camelCase to match Feed interface
	title: string;
	description: string;
	accountId: number; // Changed to camelCase
	lastSyncAt: number | null; // Changed to camelCase
	createdAt: number; // Changed to camelCase
	updatedAt: number; // Changed to camelCase
}

export const sampleFeed1: FeedFixture = {
	id: 1,
	feedId: 'MP_WXS_test001',
	title: '技术博客',
	description: '分享前沿技术与开发经验',
	accountId: 1, // References sampleAccount1.id
	lastSyncAt: 1704067200000,
	createdAt: 1704000000000,
	updatedAt: 1704067200000,
};

export const sampleFeed2: FeedFixture = {
	id: 2,
	feedId: 'MP_WXS_test002',
	title: '每日资讯',
	description: '每日精选资讯推送',
	accountId: 1, // References sampleAccount1.id
	lastSyncAt: 1704153600000,
	createdAt: 1704000000000,
	updatedAt: 1704153600000,
};

export const sampleFeed3: FeedFixture = {
	id: 3,
	feedId: 'MP_WXS_test003',
	title: '产品设计',
	description: '产品设计理念与实践',
	accountId: 2, // References sampleAccount2.id
	lastSyncAt: null, // Never synced
	createdAt: 1704000000000,
	updatedAt: 1704000000000,
};

export const sampleFeedStale: FeedFixture = {
	id: 4,
	feedId: 'MP_WXS_stale',
	title: '过期订阅源',
	description: '很久没有更新的订阅源',
	accountId: 1, // References sampleAccount1.id
	lastSyncAt: 1672531200000, // 2023-01-01 (very old)
	createdAt: 1672531200000,
	updatedAt: 1672531200000,
};

export const sampleFeedActive: FeedFixture = {
	id: 5,
	feedId: 'MP_WXS_active',
	title: '活跃订阅源',
	description: '经常更新的订阅源',
	accountId: 1, // References sampleAccount1.id
	lastSyncAt: Date.now() - 3600000, // 1 hour ago
	createdAt: 1704000000000,
	updatedAt: Date.now(),
};

export const sampleFeedWithBlacklistedAccount: FeedFixture = {
	id: 6,
	feedId: 'MP_WXS_blacklisted',
	title: '被限制账号的订阅源',
	description: '关联账号被限制访问',
	accountId: 3, // References sampleAccountBlacklisted.id
	lastSyncAt: 1704067200000,
	createdAt: 1704000000000,
	updatedAt: 1704067200000,
};

// Collection of all sample feeds
export const allSampleFeeds: FeedFixture[] = [
	sampleFeed1,
	sampleFeed2,
	sampleFeed3,
	sampleFeedStale,
	sampleFeedActive,
	sampleFeedWithBlacklistedAccount,
];

// Helper function to create custom feed
export function createSampleFeed(overrides?: Partial<FeedFixture>): FeedFixture {
	const now = Date.now();
	return {
		id: Math.floor(Math.random() * 100000),
		feedId: `MP_WXS_${Date.now()}`,
		title: '测试订阅源',
		description: '这是一个测试订阅源',
		accountId: 1, // Default to sampleAccount1.id
		lastSyncAt: null,
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

// Feed groups for specific test scenarios
export const feedsByAccount = {
	1: [sampleFeed1, sampleFeed2, sampleFeedStale, sampleFeedActive],
	2: [sampleFeed3],
	3: [sampleFeedWithBlacklistedAccount],
};

export const staleFeedsOnly = [sampleFeedStale];

export const activeFeeds = [sampleFeed1, sampleFeed2, sampleFeedActive];

export const unsyncedFeeds = [sampleFeed3];
