import { requestUrl, RequestUrlParam, RequestUrlResponse } from 'obsidian';
import { logger } from '../../utils/logger';
import {
	CreateLoginUrlResponse,
	GetLoginResultResponse,
	GetMpInfoRequest,
	GetMpInfoResponse,
	GetMpArticlesRequest,
	GetMpArticlesResponse,
	ApiError,
	ApiErrorCode,
} from './types';

/**
 * WeChatApiClient - Handles communication with WeChat Reading platform API
 *
 * Uses Obsidian's requestUrl for HTTP requests (CORS-friendly)
 */
export class WeChatApiClient {
	private baseUrl: string;
	private timeout: number = 15000; // 15 seconds

	constructor(platformUrl: string) {
		this.baseUrl = platformUrl;
	}

	/**
	 * Create login URL and QR code for WeChat Reading login
	 */
	async createLoginUrl(): Promise<CreateLoginUrlResponse> {
		try {
			logger.info('Creating login URL...');

			const response = await this.request<CreateLoginUrlResponse>({
				url: `${this.baseUrl}/api/v2/login/platform`,
				method: 'GET',
			});

			logger.info('Login URL created:', response.uuid);
			return response;
		} catch (error) {
			logger.error('Failed to create login URL:', error);
			throw this.handleError(error);
		}
	}

	/**
	 * Check login result by UUID
	 * Long-polling request (120s timeout)
	 */
	async getLoginResult(uuid: string): Promise<GetLoginResultResponse> {
		try {
			logger.debug('Checking login result for UUID:', uuid);

			const response = await this.request<GetLoginResultResponse>({
				url: `${this.baseUrl}/api/v2/login/platform/${uuid}`,
				method: 'GET',
			}, 120000); // 120 second timeout for long-polling

			if (response.token && response.vid) {
				logger.info('Login successful:', response.username);
			} else {
				logger.debug('Login pending:', response.message);
			}

			return response;
		} catch (error) {
			logger.error('Failed to get login result:', error);
			throw this.handleError(error);
		}
	}

	/**
	 * Get MP (public account) info from WeChat share link
	 */
	async getMpInfo(wxsLink: string): Promise<GetMpInfoResponse> {
		try {
			logger.info('Getting MP info from link:', wxsLink);

			const response = await this.request<GetMpInfoResponse>({
				url: `${this.baseUrl}/api/v2/platform/wxs2mp`,
				method: 'POST',
				body: JSON.stringify({ url: wxsLink.trim() }),
				headers: {
					'Content-Type': 'application/json',
				},
			});

			logger.info('MP info retrieved:', response.length > 0 ? response[0].name : 'none');
			return response;
		} catch (error) {
			logger.error('Failed to get MP info:', error);
			throw this.handleError(error);
		}
	}

	/**
	 * Get MP (public account) info with authentication
	 */
	async getMpInfoWithAuth(
		wxsLink: string,
		accountId: string,
		token: string
	): Promise<GetMpInfoResponse> {
		try {
			logger.info('Getting MP info with auth:', wxsLink);

			const response = await this.request<GetMpInfoResponse>({
				url: `${this.baseUrl}/api/v2/platform/wxs2mp`,
				method: 'POST',
				body: JSON.stringify({ url: wxsLink.trim() }),
				headers: {
					'Content-Type': 'application/json',
					'xid': accountId,
					'Authorization': `Bearer ${token}`,
				},
			});

			return response;
		} catch (error) {
			logger.error('Failed to get MP info with auth:', error);
			throw this.handleError(error, accountId);
		}
	}

	/**
	 * Get articles from a public account
	 */
	async getMpArticles(
		mpId: string,
		accountId: string,
		token: string,
		page: number = 1
	): Promise<GetMpArticlesResponse> {
		try {
			logger.debug(`Getting articles for MP: ${mpId}, page: ${page}`);

			const response = await this.request<GetMpArticlesResponse>({
				url: `${this.baseUrl}/api/v2/platform/mps/${mpId}/articles`,
				method: 'GET',
				headers: {
					'xid': accountId,
					'Authorization': `Bearer ${token}`,
				},
				contentType: 'application/json',
			}, undefined, { page: page.toString() });

			logger.info(`Retrieved ${response.length} articles for ${mpId}, page ${page}`);
			return response;
		} catch (error) {
			logger.error(`Failed to get articles for ${mpId}:`, error);
			throw this.handleError(error, accountId);
		}
	}

	/**
	 * Generic request wrapper using Obsidian's requestUrl
	 */
	private async request<T>(
		config: RequestUrlParam,
		timeout?: number,
		params?: Record<string, string>
	): Promise<T> {
		// Add query parameters if provided
		if (params) {
			const searchParams = new URLSearchParams(params);
			config.url = `${config.url}?${searchParams.toString()}`;
		}

		// Set default headers
		if (!config.headers) {
			config.headers = {};
		}

		try {
			const response: RequestUrlResponse = await requestUrl(config);

			if (response.status >= 200 && response.status < 300) {
				return response.json as T;
			} else {
				throw new Error(`HTTP ${response.status}: ${response.text}`);
			}
		} catch (error: any) {
			// Re-throw for error handling
			throw error;
		}
	}

	/**
	 * Handle API errors and extract meaningful information
	 */
	private handleError(error: any, accountId?: string): ApiError {
		const errorMessage = error.message || error.toString();

		// Check for specific API error codes
		if (errorMessage.includes(ApiErrorCode.UNAUTHORIZED)) {
			return {
				code: ApiErrorCode.UNAUTHORIZED,
				message: `Account (${accountId}) authentication expired`,
				details: error,
			};
		}

		if (errorMessage.includes(ApiErrorCode.TOO_MANY_REQUESTS)) {
			return {
				code: ApiErrorCode.TOO_MANY_REQUESTS,
				message: `Account (${accountId}) rate limited (小黑屋)`,
				details: error,
			};
		}

		if (errorMessage.includes(ApiErrorCode.BAD_REQUEST)) {
			return {
				code: ApiErrorCode.BAD_REQUEST,
				message: 'Invalid request parameters',
				details: error,
			};
		}

		// Generic error
		return {
			code: ApiErrorCode.INTERNAL_ERROR,
			message: errorMessage,
			details: error,
		};
	}

	/**
	 * Update platform URL
	 */
	setPlatformUrl(url: string): void {
		this.baseUrl = url;
		logger.info('Platform URL updated:', url);
	}

	/**
	 * Get current platform URL
	 */
	getPlatformUrl(): string {
		return this.baseUrl;
	}
}
