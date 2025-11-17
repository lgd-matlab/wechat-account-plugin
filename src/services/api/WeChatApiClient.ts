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
	HealthCheckResponse,
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
	 * Check API health status
	 * Attempts to reach health endpoint before initiating login flow
	 */
	async checkHealth(): Promise<boolean> {
		try {
			logger.info('Checking API health...');

			// Try common health endpoint patterns
			const healthUrls = [
				`${this.baseUrl}/health`,
				`${this.baseUrl}/api/health`,
				`${this.baseUrl}/api/v2/health`
			];

			for (const url of healthUrls) {
				try {
					const response = await this.request<HealthCheckResponse>(
						{ url, method: 'GET' },
						5000 // 5 second timeout
					);

					if (response && (response.status === 'ok' || response.status === 'degraded')) {
						logger.info('API health check passed:', url);
						return true;
					}
				} catch (error) {
					// Try next endpoint
					continue;
				}
			}

			// If all health endpoints fail, try a simple ping to base URL
			try {
				await this.request<any>(
					{ url: this.baseUrl, method: 'HEAD' },
					3000
				);
				logger.info('Base URL reachable (no health endpoint found)');
				return true; // Server is up even if no health endpoint
			} catch (error) {
				logger.warn('API health check failed:', error);
				return false;
			}
		} catch (error) {
			logger.error('Health check error:', error);
			return false;
		}
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
	 * Long-polling request (120s timeout) with retry logic
	 */
	async getLoginResult(uuid: string): Promise<GetLoginResultResponse> {
		try {
			logger.debug('Checking login result for UUID:', uuid);

			const response = await this.request<GetLoginResultResponse>({
				url: `${this.baseUrl}/api/v2/login/platform/${uuid}`,
				method: 'GET',
			}, 120000, undefined, { maxRetries: 2, backoffMs: 2000 }); // Retry with exponential backoff

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
	 * Supports retry logic with exponential backoff for server errors
	 */
	private async request<T>(
		config: RequestUrlParam,
		timeout?: number,
		params?: Record<string, string>,
		retryOptions?: { maxRetries?: number; backoffMs?: number }
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

		const maxRetries = retryOptions?.maxRetries ?? 0;
		const backoffMs = retryOptions?.backoffMs ?? 1000;

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				logger.debug('API Request:', {
					url: config.url,
					method: config.method,
					attempt: attempt + 1,
					maxRetries: maxRetries + 1
				});

				const response: RequestUrlResponse = await requestUrl(config);

				if (response.status >= 200 && response.status < 300) {
					logger.debug('API Request Success:', {
						url: config.url,
						status: response.status
					});
					return response.json as T;
				} else {
					throw new Error(`HTTP ${response.status}: ${response.text}`);
				}
			} catch (error: any) {
				const isLastAttempt = attempt === maxRetries;
				const isRetryable = this.isRetryableError(error);

				logger.error('API Request Failed:', {
					url: config.url,
					method: config.method,
					attempt: attempt + 1,
					maxRetries: maxRetries + 1,
					error: error.message,
					isRetryable,
					isLastAttempt
				});

				if (!isLastAttempt && isRetryable) {
					const delayMs = backoffMs * Math.pow(2, attempt); // Exponential backoff
					logger.info(`Retrying in ${delayMs}ms...`);
					await this.sleep(delayMs);
					continue;
				}

				// Final attempt or non-retryable error
				throw error;
			}
		}

		// Should never reach here
		throw new Error('Request failed: max retries exceeded');
	}

	/**
	 * Check if error is retryable (5xx server errors)
	 */
	private isRetryableError(error: any): boolean {
		const errorMessage = error.message || error.toString();
		const statusMatch = errorMessage.match(/HTTP (\d+)/);

		if (statusMatch) {
			const status = parseInt(statusMatch[1], 10);
			// Retry on 500, 502, 503, 504 (server errors)
			return status >= 500 && status <= 504;
		}

		return false;
	}

	/**
	 * Sleep utility for retry delays
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Handle API errors and extract meaningful information
	 */
	private handleError(error: any, accountId?: string): ApiError {
		const errorMessage = error.message || error.toString();

		// Extract HTTP status code
		const statusMatch = errorMessage.match(/HTTP (\d+)/);
		const status = statusMatch ? statusMatch[1] : null;

		// Handle server errors (5xx) specifically
		if (status === '500') {
			return {
				code: ApiErrorCode.INTERNAL_ERROR,
				message: `Server error (HTTP 500). The WeChat Reading platform (${this.baseUrl}) is experiencing issues. Please try again later or check if the server is operational.`,
				details: error,
			};
		}

		if (status === '502') {
			return {
				code: ApiErrorCode.BAD_GATEWAY,
				message: `Bad gateway error (HTTP 502). The WeChat Reading platform may be temporarily unavailable. Please try again in a few minutes.`,
				details: error,
			};
		}

		if (status === '503') {
			return {
				code: ApiErrorCode.SERVICE_UNAVAILABLE,
				message: `Service unavailable (HTTP 503). The WeChat Reading platform is temporarily down for maintenance. Please try again later.`,
				details: error,
			};
		}

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
