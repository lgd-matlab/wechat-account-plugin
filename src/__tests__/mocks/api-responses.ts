/**
 * Mock WeChat API responses for testing
 * Provides realistic response data for all API endpoints
 */

import {
	CreateLoginUrlResponse,
	GetLoginResultResponse,
	GetMpInfoResponse,
	GetMpArticlesResponse,
	MpInfo,
	MpArticle,
	ApiError,
	ApiErrorCode,
} from '../../services/api/types';

// ============================================================================
// 1. QR Code Login Flow Responses
// ============================================================================

export const mockCreateLoginUrlResponse: CreateLoginUrlResponse = {
	uuid: 'test-uuid-12345',
	scanUrl: 'https://weread.qq.com/qr/test-uuid-12345',
};

export const mockLoginPendingResponse: GetLoginResultResponse = {
	message: 'Login pending, please scan QR code',
};

export const mockLoginSuccessResponse: GetLoginResultResponse = {
	message: 'Login successful',
	vid: 12345678,
	token: 'test-token-abcdef123456',
	username: 'test_user',
};

export const mockLoginExpiredResponse: GetLoginResultResponse = {
	message: 'QR code expired',
};

// ============================================================================
// 2. Account Authentication Responses
// ============================================================================

export const mockValidAuthResponse: GetLoginResultResponse = {
	message: 'Authentication valid',
	vid: 12345678,
	token: 'valid-auth-token-xyz',
	username: 'authenticated_user',
};

export const mockExpiredAuthResponse: GetLoginResultResponse = {
	message: 'Authentication expired',
};

// ============================================================================
// 3. Feed Metadata Responses (MP Info)
// ============================================================================

export const mockMpInfo1: MpInfo = {
	id: 'MP_WXS_test001',
	cover: 'https://example.com/cover1.jpg',
	name: '测试公众号1',
	intro: '这是一个测试公众号的简介',
	updateTime: 1704067200000, // 2024-01-01 00:00:00
};

export const mockMpInfo2: MpInfo = {
	id: 'MP_WXS_test002',
	cover: 'https://example.com/cover2.jpg',
	name: 'Tech Blog 技术博客',
	intro: '分享前沿技术与开发经验',
	updateTime: 1704153600000, // 2024-01-02 00:00:00
};

export const mockMpInfo3: MpInfo = {
	id: 'MP_WXS_test003',
	cover: 'https://example.com/cover3.jpg',
	name: 'Daily News 每日资讯',
	intro: '每日精选资讯推送',
	updateTime: 1704240000000, // 2024-01-03 00:00:00
};

export const mockGetMpInfoResponse: GetMpInfoResponse = [mockMpInfo1];

export const mockGetMpInfoResponseMultiple: GetMpInfoResponse = [
	mockMpInfo1,
	mockMpInfo2,
	mockMpInfo3,
];

export const mockGetMpInfoResponseEmpty: GetMpInfoResponse = [];

// ============================================================================
// 4. Article List Responses (with pagination)
// ============================================================================

export const mockArticle1: MpArticle = {
	id: 'article-001',
	title: '如何使用 TypeScript 构建现代化应用',
	picUrl: 'https://example.com/article1.jpg',
	publishTime: 1704067200000,
};

export const mockArticle2: MpArticle = {
	id: 'article-002',
	title: 'Obsidian 插件开发入门指南',
	picUrl: 'https://example.com/article2.jpg',
	publishTime: 1704153600000,
};

export const mockArticle3: MpArticle = {
	id: 'article-003',
	title: '前端性能优化最佳实践',
	picUrl: 'https://example.com/article3.jpg',
	publishTime: 1704240000000,
};

export const mockArticle4: MpArticle = {
	id: 'article-004',
	title: 'SQLite 数据库在浏览器中的应用',
	picUrl: 'https://example.com/article4.jpg',
	publishTime: 1704326400000,
};

export const mockArticle5: MpArticle = {
	id: 'article-005',
	title: 'RSS 订阅系统设计与实现',
	picUrl: 'https://example.com/article5.jpg',
	publishTime: 1704412800000,
};

// Page 1: 5 articles
export const mockGetMpArticlesResponsePage1: GetMpArticlesResponse = [
	mockArticle1,
	mockArticle2,
	mockArticle3,
	mockArticle4,
	mockArticle5,
];

// Page 2: 5 more articles
export const mockGetMpArticlesResponsePage2: GetMpArticlesResponse = [
	{
		id: 'article-006',
		title: 'Jest 单元测试完全指南',
		picUrl: 'https://example.com/article6.jpg',
		publishTime: 1704499200000,
	},
	{
		id: 'article-007',
		title: 'Markdown 编辑器设计思路',
		picUrl: 'https://example.com/article7.jpg',
		publishTime: 1704585600000,
	},
	{
		id: 'article-008',
		title: 'Web 开发中的安全最佳实践',
		picUrl: 'https://example.com/article8.jpg',
		publishTime: 1704672000000,
	},
	{
		id: 'article-009',
		title: 'API 设计原则与实践',
		picUrl: 'https://example.com/article9.jpg',
		publishTime: 1704758400000,
	},
	{
		id: 'article-010',
		title: '异步编程模式详解',
		picUrl: 'https://example.com/article10.jpg',
		publishTime: 1704844800000,
	},
];

// Empty page (no more articles)
export const mockGetMpArticlesResponseEmpty: GetMpArticlesResponse = [];

// Single article response
export const mockGetMpArticlesResponseSingle: GetMpArticlesResponse = [mockArticle1];

// ============================================================================
// 5. Error Responses (401, 429, 400, 500)
// ============================================================================

export const mockError401Unauthorized: ApiError = {
	code: ApiErrorCode.UNAUTHORIZED,
	message: 'Account (test-account-id) authentication expired',
	details: new Error('HTTP 401: WeReadError401'),
};

export const mockError429TooManyRequests: ApiError = {
	code: ApiErrorCode.TOO_MANY_REQUESTS,
	message: 'Account (test-account-id) rate limited (小黑屋)',
	details: new Error('HTTP 429: WeReadError429'),
};

export const mockError400BadRequest: ApiError = {
	code: ApiErrorCode.BAD_REQUEST,
	message: 'Invalid request parameters',
	details: new Error('HTTP 400: WeReadError400'),
};

export const mockError500InternalError: ApiError = {
	code: ApiErrorCode.INTERNAL_ERROR,
	message: 'Internal server error',
	details: new Error('HTTP 500: Internal Server Error'),
};

export const mockErrorNetworkFailure: ApiError = {
	code: ApiErrorCode.INTERNAL_ERROR,
	message: 'Network request failed',
	details: new Error('Network error: Failed to fetch'),
};

// ============================================================================
// 6. Request URLs (for matching in tests)
// ============================================================================

export const mockRequestUrls = {
	createLoginUrl: 'https://weread.111965.xyz/api/v2/login/platform',
	getLoginResult: (uuid: string) => `https://weread.111965.xyz/api/v2/login/platform/${uuid}`,
	getMpInfo: 'https://weread.111965.xyz/api/v2/platform/wxs2mp',
	getMpArticles: (mpId: string, page: number) =>
		`https://weread.111965.xyz/api/v2/platform/mps/${mpId}/articles?page=${page}`,
};

// ============================================================================
// 7. Complete Request/Response Scenarios
// ============================================================================

/**
 * Scenario: Successful login flow
 */
export const loginFlowScenario = {
	step1_createUrl: mockCreateLoginUrlResponse,
	step2_pending: mockLoginPendingResponse,
	step3_success: mockLoginSuccessResponse,
};

/**
 * Scenario: Feed subscription flow
 */
export const feedSubscriptionScenario = {
	mpInfo: mockGetMpInfoResponse,
	articlesPage1: mockGetMpArticlesResponsePage1,
	articlesPage2: mockGetMpArticlesResponsePage2,
	articlesEmpty: mockGetMpArticlesResponseEmpty,
};

/**
 * Scenario: Account rotation (one account blacklisted)
 */
export const accountRotationScenario = {
	account1Blacklisted: mockError429TooManyRequests,
	account2Success: mockGetMpArticlesResponsePage1,
};

/**
 * Scenario: Authentication expiration
 */
export const authExpirationScenario = {
	unauthorizedError: mockError401Unauthorized,
	reAuthSuccess: mockValidAuthResponse,
};

// ============================================================================
// 8. Helper Functions for Creating Dynamic Mock Data
// ============================================================================

/**
 * Generate mock article with custom data
 */
export function createMockArticle(overrides?: Partial<MpArticle>): MpArticle {
	return {
		id: `article-${Date.now()}`,
		title: '测试文章标题',
		picUrl: 'https://example.com/default.jpg',
		publishTime: Date.now(),
		...overrides,
	};
}

/**
 * Generate mock MP info with custom data
 */
export function createMockMpInfo(overrides?: Partial<MpInfo>): MpInfo {
	return {
		id: `MP_WXS_${Date.now()}`,
		cover: 'https://example.com/default-cover.jpg',
		name: '测试公众号',
		intro: '这是一个测试公众号',
		updateTime: Date.now(),
		...overrides,
	};
}

/**
 * Generate paginated article list
 */
export function createMockArticleList(count: number, startId: number = 1): GetMpArticlesResponse {
	return Array.from({ length: count }, (_, i) =>
		createMockArticle({
			id: `article-${String(startId + i).padStart(3, '0')}`,
			title: `测试文章 ${startId + i}`,
			publishTime: Date.now() - i * 86400000, // One day apart
		})
	);
}

/**
 * Create mock error with custom code
 */
export function createMockError(
	code: ApiErrorCode,
	message: string,
	accountId?: string
): ApiError {
	return {
		code,
		message: accountId ? `Account (${accountId}) ${message}` : message,
		details: new Error(`${code}: ${message}`),
	};
}
