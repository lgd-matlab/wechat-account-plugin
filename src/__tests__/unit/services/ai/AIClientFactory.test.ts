/**
 * Unit tests for AIClientFactory
 * Tests provider selection and client instantiation
 */

import { AIClientFactory } from '../../../../services/ai/AIClientFactory';
import { OpenAIClient } from '../../../../services/ai/providers/OpenAIClient';
import { GeminiClient } from '../../../../services/ai/providers/GeminiClient';
import { ClaudeClient } from '../../../../services/ai/providers/ClaudeClient';
import { DeepSeekClient } from '../../../../services/ai/providers/DeepSeekClient';
import { GLMClient } from '../../../../services/ai/providers/GLMClient';
import { AIProviderConfig } from '../../../../services/ai/types';

describe('AIClientFactory', () => {
	let config: AIProviderConfig;

	beforeEach(() => {
		config = {
			apiKey: 'test-api-key',
			endpoint: 'https://api.test.com',
			model: 'test-model',
		};
	});

	describe('createClient', () => {
		it('should create OpenAI client for "openai" provider', () => {
			const client = AIClientFactory.createClient('openai', config);

			expect(client).toBeInstanceOf(OpenAIClient);
		});

		it('should create Gemini client for "gemini" provider', () => {
			const client = AIClientFactory.createClient('gemini', config);

			expect(client).toBeInstanceOf(GeminiClient);
		});

		it('should create Claude client for "claude" provider', () => {
			const client = AIClientFactory.createClient('claude', config);

			expect(client).toBeInstanceOf(ClaudeClient);
		});

		it('should create DeepSeek client for "deepseek" provider', () => {
			const client = AIClientFactory.createClient('deepseek', config);

			expect(client).toBeInstanceOf(DeepSeekClient);
			expect(client).toBeInstanceOf(OpenAIClient); // DeepSeek extends OpenAI
		});

		it('should create GLM client for "glm" provider', () => {
			const client = AIClientFactory.createClient('glm', config);

			expect(client).toBeInstanceOf(GLMClient);
			expect(client).toBeInstanceOf(OpenAIClient); // GLM extends OpenAI
		});

		it('should create OpenAI client for "generic" provider', () => {
			const client = AIClientFactory.createClient('generic', config);

			expect(client).toBeInstanceOf(OpenAIClient);
		});

		it('should be case-insensitive for provider names', () => {
			const clientLower = AIClientFactory.createClient('openai', config);
			const clientUpper = AIClientFactory.createClient('OPENAI', config);
			const clientMixed = AIClientFactory.createClient('OpenAI', config);

			expect(clientLower).toBeInstanceOf(OpenAIClient);
			expect(clientUpper).toBeInstanceOf(OpenAIClient);
			expect(clientMixed).toBeInstanceOf(OpenAIClient);
		});

		it('should throw error for unknown provider', () => {
			expect(() => {
				AIClientFactory.createClient('unknown-provider', config);
			}).toThrow('Unknown AI provider: unknown-provider');
		});

		it('should throw error for empty provider name', () => {
			expect(() => {
				AIClientFactory.createClient('', config);
			}).toThrow('Unknown AI provider');
		});

		it('should throw error for null provider', () => {
			expect(() => {
				AIClientFactory.createClient(null as any, config);
			}).toThrow();
		});

		it('should throw error for undefined provider', () => {
			expect(() => {
				AIClientFactory.createClient(undefined as any, config);
			}).toThrow();
		});
	});

	describe('Client Configuration', () => {
		it('should pass configuration to created client', () => {
			const customConfig: AIProviderConfig = {
				apiKey: 'custom-key',
				endpoint: 'https://custom.endpoint.com',
				model: 'custom-model',
			};

			const client = AIClientFactory.createClient('openai', customConfig);

			expect(client['config']).toEqual(customConfig);
		});

		it('should create clients with different configurations', () => {
			const config1: AIProviderConfig = {
				apiKey: 'key1',
				endpoint: 'https://endpoint1.com',
				model: 'model1',
			};

			const config2: AIProviderConfig = {
				apiKey: 'key2',
				endpoint: 'https://endpoint2.com',
				model: 'model2',
			};

			const client1 = AIClientFactory.createClient('openai', config1);
			const client2 = AIClientFactory.createClient('openai', config2);

			expect(client1['config']).toEqual(config1);
			expect(client2['config']).toEqual(config2);
			expect(client1['config']).not.toEqual(client2['config']);
		});
	});

	describe('Provider Support', () => {
		it('should support all 6 documented providers', () => {
			const providers = ['openai', 'gemini', 'claude', 'deepseek', 'glm', 'generic'];

			providers.forEach(provider => {
				expect(() => {
					AIClientFactory.createClient(provider, config);
				}).not.toThrow();
			});
		});

		it('should create distinct client instances for different providers', () => {
			const openaiClient = AIClientFactory.createClient('openai', config);
			const geminiClient = AIClientFactory.createClient('gemini', config);
			const claudeClient = AIClientFactory.createClient('claude', config);

			expect(openaiClient.constructor.name).toBe('OpenAIClient');
			expect(geminiClient.constructor.name).toBe('GeminiClient');
			expect(claudeClient.constructor.name).toBe('ClaudeClient');
		});
	});

	describe('Error Messages', () => {
		it('should include provider name in error message', () => {
			try {
				AIClientFactory.createClient('invalid-provider', config);
				fail('Should have thrown an error');
			} catch (error: any) {
				expect(error.message).toContain('invalid-provider');
			}
		});

		it('should provide clear error for typos in provider names', () => {
			const typos = ['opnai', 'gemnii', 'claud', 'depseek', 'glmm'];

			typos.forEach(typo => {
				try {
					AIClientFactory.createClient(typo, config);
					fail(`Should have thrown an error for ${typo}`);
				} catch (error: any) {
					expect(error.message).toContain(typo);
					expect(error.message).toContain('Unknown AI provider');
				}
			});
		});
	});

	describe('Factory Pattern Benefits', () => {
		it('should centralize client creation logic', () => {
			// Factory should be the single source of truth for provider mapping
			const client1 = AIClientFactory.createClient('openai', config);
			const client2 = AIClientFactory.createClient('openai', config);

			// Both should be OpenAI clients
			expect(client1.constructor.name).toBe(client2.constructor.name);
		});

		it('should enable easy addition of new providers', () => {
			// All current providers should work
			const providers = ['openai', 'gemini', 'claude', 'deepseek', 'glm', 'generic'];
			const clients = providers.map(p => AIClientFactory.createClient(p, config));

			expect(clients).toHaveLength(6);
			clients.forEach(client => {
				expect(client).toBeDefined();
			});
		});
	});
});
