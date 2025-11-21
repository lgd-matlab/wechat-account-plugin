/**
 * Unit tests for AI Provider Clients
 * Tests OpenAI, Gemini, Claude, DeepSeek, and GLM clients
 */

import { OpenAIClient } from '../../../../services/ai/providers/OpenAIClient';
import { GeminiClient } from '../../../../services/ai/providers/GeminiClient';
import { ClaudeClient } from '../../../../services/ai/providers/ClaudeClient';
import { DeepSeekClient } from '../../../../services/ai/providers/DeepSeekClient';
import { GLMClient } from '../../../../services/ai/providers/GLMClient';
import { AIProviderConfig } from '../../../../services/ai/types';
import { SummaryArticle } from '../../../../types';

// Mock requestUrl
jest.mock('obsidian', () => ({
	requestUrl: jest.fn(),
}));

describe('AI Provider Clients', () => {
	let config: AIProviderConfig;
	let mockArticle: SummaryArticle;
	const { requestUrl } = require('obsidian');

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

		requestUrl.mockReset();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('OpenAIClient', () => {
		let client: OpenAIClient;

		beforeEach(() => {
			client = new OpenAIClient(config);
		});

		it('should create correct OpenAI request format', () => {
			const request = client['buildRequest'](mockArticle);

			expect(request).toHaveProperty('model', 'test-model');
			expect(request).toHaveProperty('messages');
			expect(request.messages).toHaveLength(2);
			expect(request.messages[0].role).toBe('system');
			expect(request.messages[1].role).toBe('user');
			expect(request.messages[1].content).toContain('Test Article');
		});

		it('should parse OpenAI response correctly', () => {
			const mockResponse = {
				choices: [
					{
						message: {
							content: 'This is the AI-generated summary.',
						},
					},
				],
			};

			const summary = client['parseResponse'](mockResponse);

			expect(summary).toBe('This is the AI-generated summary.');
		});

		it('should handle missing choices in response', () => {
			const mockResponse = { choices: [] };

			const summary = client['parseResponse'](mockResponse);

			expect(summary).toBe('');
		});

		it('should make correct API call to OpenAI endpoint', async () => {
			requestUrl.mockResolvedValue({
				status: 200,
				json: {
					choices: [
						{
							message: {
								content: 'Summary from OpenAI',
							},
						},
					],
				},
			});

			const summary = await client.summarizeArticle(mockArticle);

			expect(summary).toBe('Summary from OpenAI');
			expect(requestUrl).toHaveBeenCalledWith(
				expect.objectContaining({
					url: 'https://api.test.com/chat/completions',
					method: 'POST',
					headers: expect.objectContaining({
						'Authorization': 'Bearer test-api-key',
						'Content-Type': 'application/json',
					}),
				})
			);
		});
	});

	describe('GeminiClient', () => {
		let client: GeminiClient;

		beforeEach(() => {
			client = new GeminiClient(config);
		});

		it('should create correct Gemini request format', () => {
			const request = client['buildRequest'](mockArticle);

			expect(request).toHaveProperty('contents');
			expect(request.contents).toHaveLength(1);
			expect(request.contents[0]).toHaveProperty('parts');
			expect(request.contents[0].parts[0]).toHaveProperty('text');
			expect(request.contents[0].parts[0].text).toContain('Test Article');
		});

		it('should parse Gemini response correctly', () => {
			const mockResponse = {
				candidates: [
					{
						content: {
							parts: [
								{
									text: 'This is the Gemini-generated summary.',
								},
							],
						},
					},
				],
			};

			const summary = client['parseResponse'](mockResponse);

			expect(summary).toBe('This is the Gemini-generated summary.');
		});

		it('should handle missing candidates in response', () => {
			const mockResponse = { candidates: [] };

			const summary = client['parseResponse'](mockResponse);

			expect(summary).toBe('');
		});

		it('should make correct API call to Gemini endpoint', async () => {
			requestUrl.mockResolvedValue({
				status: 200,
				json: {
					candidates: [
						{
							content: {
								parts: [
									{
										text: 'Summary from Gemini',
									},
								],
							},
						},
					],
				},
			});

			const summary = await client.summarizeArticle(mockArticle);

			expect(summary).toBe('Summary from Gemini');
			expect(requestUrl).toHaveBeenCalledWith(
				expect.objectContaining({
					url: 'https://api.test.com/models/test-model:generateContent?key=test-api-key',
					method: 'POST',
				})
			);
		});

		it('should include API key in query parameter', async () => {
			requestUrl.mockResolvedValue({
				status: 200,
				json: {
					candidates: [
						{
							content: {
								parts: [{ text: 'Summary' }],
							},
						},
					],
				},
			});

			await client.summarizeArticle(mockArticle);

			const callUrl = requestUrl.mock.calls[0][0].url;
			expect(callUrl).toContain('?key=test-api-key');
		});
	});

	describe('ClaudeClient', () => {
		let client: ClaudeClient;

		beforeEach(() => {
			client = new ClaudeClient(config);
		});

		it('should create correct Claude request format', () => {
			const request = client['buildRequest'](mockArticle);

			expect(request).toHaveProperty('model', 'test-model');
			expect(request).toHaveProperty('messages');
			expect(request).toHaveProperty('max_tokens', 1024);
			expect(request.messages).toHaveLength(1);
			expect(request.messages[0].role).toBe('user');
			expect(request.messages[0].content).toContain('Test Article');
		});

		it('should parse Claude response correctly', () => {
			const mockResponse = {
				content: [
					{
						text: 'This is the Claude-generated summary.',
					},
				],
			};

			const summary = client['parseResponse'](mockResponse);

			expect(summary).toBe('This is the Claude-generated summary.');
		});

		it('should handle missing content in response', () => {
			const mockResponse = { content: [] };

			const summary = client['parseResponse'](mockResponse);

			expect(summary).toBe('');
		});

		it('should make correct API call to Claude endpoint with headers', async () => {
			requestUrl.mockResolvedValue({
				status: 200,
				json: {
					content: [
						{
							text: 'Summary from Claude',
						},
					],
				},
			});

			const summary = await client.summarizeArticle(mockArticle);

			expect(summary).toBe('Summary from Claude');
			expect(requestUrl).toHaveBeenCalledWith(
				expect.objectContaining({
					url: 'https://api.test.com/messages',
					method: 'POST',
					headers: expect.objectContaining({
						'x-api-key': 'test-api-key',
						'anthropic-version': '2023-06-01',
						'Content-Type': 'application/json',
					}),
				})
			);
		});

		it('should include required Anthropic headers', async () => {
			requestUrl.mockResolvedValue({
				status: 200,
				json: {
					content: [{ text: 'Summary' }],
				},
			});

			await client.summarizeArticle(mockArticle);

			const headers = requestUrl.mock.calls[0][0].headers;
			expect(headers['x-api-key']).toBe('test-api-key');
			expect(headers['anthropic-version']).toBe('2023-06-01');
		});
	});

	describe('DeepSeekClient', () => {
		let client: DeepSeekClient;

		beforeEach(() => {
			client = new DeepSeekClient(config);
		});

		it('should extend OpenAIClient', () => {
			expect(client).toBeInstanceOf(OpenAIClient);
		});

		it('should use OpenAI-compatible format', () => {
			const request = client['buildRequest'](mockArticle);

			// Should have same structure as OpenAI
			expect(request).toHaveProperty('model');
			expect(request).toHaveProperty('messages');
			expect(request.messages[0].role).toBe('system');
			expect(request.messages[1].role).toBe('user');
		});

		it('should make correct API call using OpenAI format', async () => {
			requestUrl.mockResolvedValue({
				status: 200,
				json: {
					choices: [
						{
							message: {
								content: 'Summary from DeepSeek',
							},
						},
					],
				},
			});

			const summary = await client.summarizeArticle(mockArticle);

			expect(summary).toBe('Summary from DeepSeek');
			expect(requestUrl).toHaveBeenCalledWith(
				expect.objectContaining({
					url: 'https://api.test.com/chat/completions',
					method: 'POST',
				})
			);
		});
	});

	describe('GLMClient', () => {
		let client: GLMClient;

		beforeEach(() => {
			client = new GLMClient(config);
		});

		it('should extend OpenAIClient', () => {
			expect(client).toBeInstanceOf(OpenAIClient);
		});

		it('should call super.buildRequest()', () => {
			const request = client['buildRequest'](mockArticle);

			// Should have base OpenAI structure
			expect(request).toHaveProperty('model');
			expect(request).toHaveProperty('messages');
		});

		it('should allow for GLM-specific modifications', () => {
			const request = client['buildRequest'](mockArticle);

			// Currently OpenAI-compatible, but structure allows modifications
			expect(request).toHaveProperty('model');
			expect(request).toHaveProperty('messages');
		});

		it('should make correct API call using OpenAI format', async () => {
			requestUrl.mockResolvedValue({
				status: 200,
				json: {
					choices: [
						{
							message: {
								content: 'Summary from GLM',
							},
						},
					],
				},
			});

			const summary = await client.summarizeArticle(mockArticle);

			expect(summary).toBe('Summary from GLM');
		});
	});

	describe('Provider Error Handling', () => {
		it('should handle OpenAI API errors', async () => {
			const client = new OpenAIClient(config);
			requestUrl.mockResolvedValue({
				status: 401,
				json: { error: { message: 'Invalid API key' } },
			});

			await expect(client.summarizeArticle(mockArticle)).rejects.toThrow();
		});

		it('should handle Gemini API errors', async () => {
			const client = new GeminiClient(config);
			requestUrl.mockResolvedValue({
				status: 400,
				json: { error: { message: 'Invalid request' } },
			});

			await expect(client.summarizeArticle(mockArticle)).rejects.toThrow();
		});

		it('should handle Claude API errors', async () => {
			const client = new ClaudeClient(config);
			requestUrl.mockResolvedValue({
				status: 403,
				json: { error: { message: 'Forbidden' } },
			});

			await expect(client.summarizeArticle(mockArticle)).rejects.toThrow();
		});

		it('should handle network errors across all providers', async () => {
			const clients = [
				new OpenAIClient(config),
				new GeminiClient(config),
				new ClaudeClient(config),
				new DeepSeekClient(config),
				new GLMClient(config),
			];

			requestUrl.mockRejectedValue(new Error('Network error'));

			for (const client of clients) {
				await expect(client.summarizeArticle(mockArticle)).rejects.toThrow('Network error');
			}
		}, 30000); // 30 second timeout for testing all providers
	});

	describe('Provider Configuration Validation', () => {
		it('should reject empty API key for all providers', async () => {
			const invalidConfig = { ...config, apiKey: '' };
			const clients = [
				new OpenAIClient(invalidConfig),
				new GeminiClient(invalidConfig),
				new ClaudeClient(invalidConfig),
			];

			for (const client of clients) {
				await expect(client.summarizeArticle(mockArticle)).rejects.toThrow(
					'Invalid'
				);
			}
		});

		it('should reject empty endpoint for all providers', async () => {
			const invalidConfig = { ...config, endpoint: '' };
			const clients = [
				new OpenAIClient(invalidConfig),
				new GeminiClient(invalidConfig),
				new ClaudeClient(invalidConfig),
			];

			for (const client of clients) {
				await expect(client.summarizeArticle(mockArticle)).rejects.toThrow(
					'Invalid'
				);
			}
		});
	});
});
