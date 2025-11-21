import { requestUrl } from 'obsidian';
import { SummaryArticle } from '../../types';
import { AIProviderConfig, AIApiError, formatSummaryPrompt } from './types';
import { Logger } from '../../utils/logger';

/**
 * Abstract base class for AI API clients
 * Provides common functionality for all AI providers
 */
export abstract class AIApiClient {
	protected config: AIProviderConfig;
	protected logger: Logger;

	constructor(config: AIProviderConfig) {
		this.config = config;
		this.logger = new Logger('AIApiClient');
	}

	/**
	 * Summarize an article using the AI provider
	 * @param article Article to summarize
	 * @returns Summary text
	 */
	abstract summarizeArticle(article: SummaryArticle): Promise<string>;

	/**
	 * Build provider-specific API request
	 * @param article Article to summarize
	 * @returns Request body
	 */
	protected abstract buildRequest(article: SummaryArticle): any;

	/**
	 * Parse provider-specific API response
	 * @param response API response
	 * @returns Summary text
	 */
	protected abstract parseResponse(response: any): string;

	/**
	 * Validate configuration
	 * @returns True if config is valid
	 */
	validateConfig(): boolean {
		if (!this.config.apiKey || this.config.apiKey.trim() === '') {
			this.logger.error('API key is missing');
			return false;
		}
		if (!this.config.endpoint || this.config.endpoint.trim() === '') {
			this.logger.error('API endpoint is missing');
			return false;
		}
		if (!this.config.model || this.config.model.trim() === '') {
			this.logger.error('Model name is missing');
			return false;
		}
		return true;
	}

	/**
	 * Format article for summarization prompt
	 * @param article Article to format
	 * @returns Formatted prompt
	 */
	protected formatPrompt(article: SummaryArticle): string {
		const publishedDate = new Date(article.publishedAt).toLocaleString();
		// Truncate content to avoid token limits (max ~3000 words)
		const truncatedContent = this.truncateContent(article.content, 3000);

		return formatSummaryPrompt(
			article.title,
			publishedDate,
			truncatedContent
		);
	}

	/**
	 * Truncate content to word limit
	 * @param content Content to truncate
	 * @param maxWords Maximum words
	 * @returns Truncated content
	 */
	protected truncateContent(content: string, maxWords: number): string {
		const words = content.split(/\s+/);
		if (words.length <= maxWords) {
			return content;
		}
		return words.slice(0, maxWords).join(' ') + '...';
	}

	/**
	 * Make HTTP request with retry logic
	 * @param url Request URL
	 * @param body Request body
	 * @param headers Additional headers
	 * @param maxRetries Maximum retry attempts
	 * @returns Response data
	 */
	protected async makeRequest(
		url: string,
		body: any,
		headers: Record<string, string> = {},
		maxRetries: number = 3
	): Promise<any> {
		let lastError: Error | null = null;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				this.logger.debug(`API request attempt ${attempt}/${maxRetries}`, { url });

				const response = await requestUrl({
					url,
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						...headers
					},
					body: JSON.stringify(body),
					throw: false
				});

				// Check for HTTP errors
				if (response.status >= 400) {
					const error = this.handleHttpError(response.status, response.json);

					// Don't retry non-retryable errors
					if (!error.retryable) {
						throw new Error(error.message);
					}

					// Retry on retryable errors if not last attempt
					if (attempt < maxRetries) {
						const isRateLimit = response.status === 429;
						const delay = this.calculateBackoff(attempt, isRateLimit);
						this.logger.warn(
							`Request failed with retryable error, retrying in ${delay}ms`,
							{ error: error.message, attempt, isRateLimit }
						);
						await this.sleep(delay);
						continue;
					}

					// Last attempt for retryable error
					throw new Error(error.message);
				}

				this.logger.debug('API request successful', { status: response.status });
				return response.json;

			} catch (error) {
				lastError = error as Error;

				// Check if this is a non-retryable HTTP error
				if (error.message && (
					error.message.includes('401') ||
					error.message.includes('403') ||
					error.message.includes('400')
				)) {
					// Non-retryable error - fail immediately
					throw error;
				}

				this.logger.error(`API request failed (attempt ${attempt}/${maxRetries})`, error);

				// Don't retry on last attempt
				if (attempt >= maxRetries) {
					break;
				}

				// Exponential backoff for network errors
				const delay = this.calculateBackoff(attempt);
				this.logger.debug(`Retrying in ${delay}ms...`);
				await this.sleep(delay);
			}
		}

		throw new Error(
			`Failed to make API request after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
		);
	}

	/**
	 * Handle HTTP error responses
	 * @param status HTTP status code
	 * @param responseBody Response body
	 * @returns AIApiError
	 */
	protected handleHttpError(status: number, responseBody: any): AIApiError {
		// Extract error message from response
		let message = 'Unknown error';
		if (responseBody) {
			if (responseBody.error) {
				message = typeof responseBody.error === 'string'
					? responseBody.error
					: responseBody.error.message || message;
			} else if (responseBody.message) {
				message = responseBody.message;
			}
		}

		// Determine if error is retryable
		const retryable = [408, 429, 500, 502, 503, 504].includes(status);

		return {
			code: status.toString(),
			message: `HTTP ${status}: ${message}`,
			retryable
		};
	}

	/**
	 * Calculate exponential backoff delay
	 * @param attempt Attempt number (1-indexed)
	 * @param isRateLimit Whether this is a rate limit error (429)
	 * @returns Delay in milliseconds
	 */
	protected calculateBackoff(attempt: number, isRateLimit: boolean = false): number {
		if (isRateLimit) {
			// Aggressive backoff for rate limits: 5s, 15s, 30s
			// Free tier APIs often have 1 req/10s or 1 req/min limits
			const delays = [5000, 15000, 30000];
			return delays[attempt - 1] || 30000;
		}
		// Regular exponential backoff for other errors: 1s, 2s, 4s
		return Math.min(1000 * Math.pow(2, attempt - 1), 4000);
	}

	/**
	 * Sleep for specified milliseconds
	 * @param ms Milliseconds to sleep
	 */
	protected sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}
