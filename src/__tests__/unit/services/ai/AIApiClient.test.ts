/**
 * Unit tests for AIApiClient base class
 * Tests retry logic, error handling, and backoff calculations
 */

import { AIApiClient } from '../../../../services/ai/AIApiClient';
import { AIProviderConfig } from '../../../../services/ai/types';
import { SummaryArticle } from '../../../../types';

// Concrete implementation for testing abstract class
class TestAIClient extends AIApiClient {
	async summarizeArticle(article: SummaryArticle): Promise<string> {
		if (!this.validateConfig()) {
			throw new Error('Invalid configuration');
		}
		const prompt = this.formatPrompt(article);
		const response = await this.makeRequest(
			`${this.config.endpoint}/test`,
			{ prompt },
			{ 'Authorization': `Bearer ${this.config.apiKey}` }
		);
		return this.parseResponse(response);
	}

	protected buildRequest(article: SummaryArticle): any {
		return { content: article.content };
	}

	protected parseResponse(response: any): string {
		return response.summary || response.text || '';
	}
}

// Mock requestUrl
jest.mock('obsidian', () => ({
	requestUrl: jest.fn(),
}));

describe('AIApiClient', () => {
	let client: TestAIClient;
	let config: AIProviderConfig;
	let mockArticle: SummaryArticle;

	beforeEach(() => {
		config = {
			apiKey: 'test-api-key',
			endpoint: 'https://api.test.com',
			model: 'test-model',
		};

		mockArticle = {
			id: 1,
			title: 'Test Article',
			content: 'This is test content for summarization.',
			url: 'https://example.com/article',
			publishedAt: Date.now(),
			feedName: 'Test Feed',
		};

		client = new TestAIClient(config);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('validateConfig', () => {
		it('should return true for valid configuration', () => {
			expect(client['validateConfig']()).toBe(true);
		});

		it('should return false if API key is missing', () => {
			client = new TestAIClient({ ...config, apiKey: '' });
			expect(client['validateConfig']()).toBe(false);
		});

		it('should return false if endpoint is missing', () => {
			client = new TestAIClient({ ...config, endpoint: '' });
			expect(client['validateConfig']()).toBe(false);
		});

		it('should return false if model is missing', () => {
			client = new TestAIClient({ ...config, model: '' });
			expect(client['validateConfig']()).toBe(false);
		});
	});

	describe('formatPrompt', () => {
		it('should format prompt with article details', () => {
			const prompt = client['formatPrompt'](mockArticle);

			expect(prompt).toContain('Test Article');
			expect(prompt).toContain('This is test content');
			expect(prompt).toContain('Summarize the following article');
		});

		it('should handle articles with long content', () => {
			// Create content with many words (more than truncation limit of 3000 words)
			const words = Array.from({ length: 5000 }, (_, i) => `word${i}`);
			const longContent = words.join(' ');
			const articleWithLongContent = { ...mockArticle, content: longContent };

			const prompt = client['formatPrompt'](articleWithLongContent);

			// Should truncate content to 3000 words
			expect(prompt).toContain('...');
			// Prompt should not contain all 5000 words
			expect(prompt).not.toContain('word4999');
		});
	});

	describe('truncateContent', () => {
		it('should not truncate short content', () => {
			const shortContent = 'Short content here';
			const truncated = client['truncateContent'](shortContent, 1000);

			expect(truncated).toBe(shortContent);
		});

		it('should truncate long content to maxWords', () => {
			// Create content with 2000 words
			const words = Array.from({ length: 2000 }, (_, i) => `word${i}`);
			const longContent = words.join(' ');
			const truncated = client['truncateContent'](longContent, 1000);

			// Should truncate to 1000 words + "..."
			const truncatedWords = truncated.replace('...', '').split(/\s+/);
			expect(truncatedWords.length).toBe(1000);
			expect(truncated).toContain('...');
		});

		it('should handle empty content', () => {
			const truncated = client['truncateContent']('', 1000);
			expect(truncated).toBe('');
		});

		it('should add ellipsis when truncating', () => {
			const content = Array.from({ length: 100 }, (_, i) => `word${i}`).join(' ');
			const truncated = client['truncateContent'](content, 50);

			expect(truncated.endsWith('...')).toBe(true);
		});
	});

	describe('calculateBackoff', () => {
		it('should calculate exponential backoff correctly', () => {
			expect(client['calculateBackoff'](1)).toBe(1000); // 2^0 * 1000
			expect(client['calculateBackoff'](2)).toBe(2000); // 2^1 * 1000
			expect(client['calculateBackoff'](3)).toBe(4000); // 2^2 * 1000
		});

		it('should cap backoff at maximum delay', () => {
			const longDelay = client['calculateBackoff'](10);
			expect(longDelay).toBeLessThanOrEqual(10000); // Max 10 seconds
		});
	});

	describe('handleHttpError', () => {
		it('should classify 429 as retryable', () => {
			const error = client['handleHttpError'](429, { error: 'Rate limit exceeded' });

			expect(error.retryable).toBe(true);
			expect(error.message).toContain('429');
		});

		it('should classify 500 as retryable', () => {
			const error = client['handleHttpError'](500, { error: 'Internal server error' });

			expect(error.retryable).toBe(true);
		});

		it('should classify 502 as retryable', () => {
			const error = client['handleHttpError'](502, { error: 'Bad gateway' });

			expect(error.retryable).toBe(true);
		});

		it('should classify 401 as non-retryable', () => {
			const error = client['handleHttpError'](401, { error: 'Unauthorized' });

			expect(error.retryable).toBe(false);
			expect(error.message).toContain('401');
		});

		it('should classify 403 as non-retryable', () => {
			const error = client['handleHttpError'](403, { error: 'Forbidden' });

			expect(error.retryable).toBe(false);
		});

		it('should classify 400 as non-retryable', () => {
			const error = client['handleHttpError'](400, { error: 'Bad request' });

			expect(error.retryable).toBe(false);
		});

		it('should extract error message from response body', () => {
			const error = client['handleHttpError'](400, {
				error: { message: 'Custom error message' },
			});

			expect(error.message).toContain('Custom error message');
		});
	});

	describe('makeRequest (retry logic)', () => {
		const { requestUrl } = require('obsidian');

		beforeEach(() => {
			// Reset mock before each test
			requestUrl.mockReset();
		});

		it('should succeed on first attempt', async () => {
			requestUrl.mockResolvedValue({
				status: 200,
				json: { summary: 'Test summary' },
			});

			const result = await client['makeRequest'](
				'https://api.test.com/endpoint',
				{ data: 'test' },
				{ 'Authorization': 'Bearer token' }
			);

			expect(result).toEqual({ summary: 'Test summary' });
			expect(requestUrl).toHaveBeenCalledTimes(1);
		});

		it('should retry on 429 error and succeed', async () => {
			// Fail twice, succeed on third attempt
			requestUrl
				.mockResolvedValueOnce({ status: 429, json: { error: 'Rate limit' } })
				.mockResolvedValueOnce({ status: 429, json: { error: 'Rate limit' } })
				.mockResolvedValueOnce({ status: 200, json: { summary: 'Success' } });

			// Speed up test by mocking sleep
			jest.spyOn(client as any, 'sleep').mockResolvedValue(undefined);

			const result = await client['makeRequest'](
				'https://api.test.com/endpoint',
				{ data: 'test' },
				{}
			);

			expect(result).toEqual({ summary: 'Success' });
			expect(requestUrl).toHaveBeenCalledTimes(3);
		});

		it('should retry on 500 error and succeed', async () => {
			requestUrl
				.mockResolvedValueOnce({ status: 500, json: { error: 'Server error' } })
				.mockResolvedValueOnce({ status: 200, json: { summary: 'Success' } });

			jest.spyOn(client as any, 'sleep').mockResolvedValue(undefined);

			const result = await client['makeRequest'](
				'https://api.test.com/endpoint',
				{ data: 'test' },
				{}
			);

			expect(result).toEqual({ summary: 'Success' });
			expect(requestUrl).toHaveBeenCalledTimes(2);
		});

		it('should fail after max retries on persistent 429 error', async () => {
			// Fail all 3 attempts
			requestUrl.mockResolvedValue({ status: 429, json: { error: 'Rate limit' } });

			jest.spyOn(client as any, 'sleep').mockResolvedValue(undefined);

			await expect(
				client['makeRequest']('https://api.test.com/endpoint', { data: 'test' }, {}, 3)
			).rejects.toThrow('Failed to make API request after 3 attempts');

			expect(requestUrl).toHaveBeenCalledTimes(3);
		});

		it('should not retry on 401 error', async () => {
			requestUrl.mockResolvedValue({ status: 401, json: { error: 'Unauthorized' } });

			await expect(
				client['makeRequest']('https://api.test.com/endpoint', { data: 'test' }, {})
			).rejects.toThrow();

			// Should fail immediately without retries
			expect(requestUrl).toHaveBeenCalledTimes(1);
		});

		it('should not retry on 403 error', async () => {
			requestUrl.mockResolvedValue({ status: 403, json: { error: 'Forbidden' } });

			await expect(
				client['makeRequest']('https://api.test.com/endpoint', { data: 'test' }, {})
			).rejects.toThrow();

			expect(requestUrl).toHaveBeenCalledTimes(1);
		});

		it('should handle network errors with retry', async () => {
			requestUrl
				.mockRejectedValueOnce(new Error('Network error'))
				.mockResolvedValueOnce({ status: 200, json: { summary: 'Success' } });

			jest.spyOn(client as any, 'sleep').mockResolvedValue(undefined);

			const result = await client['makeRequest'](
				'https://api.test.com/endpoint',
				{ data: 'test' },
				{}
			);

			expect(result).toEqual({ summary: 'Success' });
			expect(requestUrl).toHaveBeenCalledTimes(2);
		});

		it('should fail after max retries on persistent network errors', async () => {
			requestUrl.mockRejectedValue(new Error('Network error'));

			jest.spyOn(client as any, 'sleep').mockResolvedValue(undefined);

			await expect(
				client['makeRequest']('https://api.test.com/endpoint', { data: 'test' }, {}, 3)
			).rejects.toThrow(); // Will throw either "Network error" or wrapped error

			expect(requestUrl).toHaveBeenCalledTimes(3);
		});
	});

	describe('summarizeArticle', () => {
		const { requestUrl } = require('obsidian');

		beforeEach(() => {
			requestUrl.mockReset();
		});

		it('should summarize article successfully', async () => {
			requestUrl.mockResolvedValue({
				status: 200,
				json: { summary: 'This is a test summary of the article.' },
			});

			const summary = await client.summarizeArticle(mockArticle);

			expect(summary).toBe('This is a test summary of the article.');
			expect(requestUrl).toHaveBeenCalledWith(
				expect.objectContaining({
					url: 'https://api.test.com/test',
					method: 'POST',
					headers: expect.objectContaining({
						'Authorization': 'Bearer test-api-key',
						'Content-Type': 'application/json',
					}),
				})
			);
		});

		it('should throw error for invalid configuration', async () => {
			client = new TestAIClient({ apiKey: '', endpoint: '', model: '' });

			await expect(client.summarizeArticle(mockArticle)).rejects.toThrow(
				'Invalid configuration'
			);
		});

		it('should handle API errors gracefully', async () => {
			requestUrl.mockResolvedValue({
				status: 400,
				json: { error: 'Invalid request' },
			});

			await expect(client.summarizeArticle(mockArticle)).rejects.toThrow();
		});
	});
});
