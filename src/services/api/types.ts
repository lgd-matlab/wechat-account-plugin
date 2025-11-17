/**
 * WeChat Reading Platform API Types
 * Based on WeWe RSS server API (platform URL: weread.111965.xyz)
 */

// Login API
export interface CreateLoginUrlResponse {
	uuid: string;
	scanUrl: string;
}

export interface GetLoginResultResponse {
	message: string;
	vid?: number;
	token?: string;
	username?: string;
}

// Feed/MP Info API
export interface GetMpInfoRequest {
	url: string; // WeChat share link (https://mp.weixin.qq.com/s/...)
}

export interface MpInfo {
	id: string; // MP ID (e.g., MP_WXS_xxx)
	cover: string;
	name: string;
	intro: string;
	updateTime: number;
}

export type GetMpInfoResponse = MpInfo[];

// Articles API
export interface GetMpArticlesRequest {
	mpId: string;
	page?: number;
}

export interface MpArticle {
	id: string;
	title: string;
	picUrl: string;
	publishTime: number;
}

export type GetMpArticlesResponse = MpArticle[];

// Error types
export interface ApiError {
	code: string;
	message: string;
	details?: any;
}

// API Error codes
export enum ApiErrorCode {
	UNAUTHORIZED = 'WeReadError401', // Account expired
	TOO_MANY_REQUESTS = 'WeReadError429', // Rate limited (小黑屋)
	BAD_REQUEST = 'WeReadError400', // Invalid parameters
	INTERNAL_ERROR = 'WeReadError500',
	BAD_GATEWAY = 'WeReadError502',
	SERVICE_UNAVAILABLE = 'WeReadError503',
}
