import { AIProviderConfig } from './types';
import { AIApiClient } from './AIApiClient';
import { OpenAIClient } from './providers/OpenAIClient';
import { GeminiClient } from './providers/GeminiClient';
import { ClaudeClient } from './providers/ClaudeClient';
import { DeepSeekClient } from './providers/DeepSeekClient';
import { GLMClient } from './providers/GLMClient';

/**
 * Factory for creating AI provider clients
 */
export class AIClientFactory {
	/**
	 * Create an AI client for the specified provider
	 * @param provider Provider name
	 * @param config Provider configuration
	 * @returns AIApiClient instance
	 */
	static createClient(
		provider: string,
		config: AIProviderConfig
	): AIApiClient {
		switch (provider.toLowerCase()) {
			case 'openai':
				return new OpenAIClient(config);

			case 'gemini':
				return new GeminiClient(config);

			case 'claude':
				return new ClaudeClient(config);

			case 'deepseek':
				return new DeepSeekClient(config);

			case 'glm':
				return new GLMClient(config);

			case 'generic':
				// Generic uses OpenAI-compatible format
				return new OpenAIClient(config);

			default:
				throw new Error(`Unknown AI provider: ${provider}`);
		}
	}

	/**
	 * Get list of supported providers
	 * @returns Array of provider names
	 */
	static getSupportedProviders(): string[] {
		return ['openai', 'gemini', 'claude', 'deepseek', 'glm', 'generic'];
	}

	/**
	 * Check if provider is supported
	 * @param provider Provider name
	 * @returns True if supported
	 */
	static isSupported(provider: string): boolean {
		return this.getSupportedProviders().includes(provider.toLowerCase());
	}
}
