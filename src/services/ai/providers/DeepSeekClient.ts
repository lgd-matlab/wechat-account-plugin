import { OpenAIClient } from './OpenAIClient';

/**
 * DeepSeek API client
 * Uses OpenAI-compatible API format with special handling for reasoning models
 */
export class DeepSeekClient extends OpenAIClient {
	/**
	 * Parse DeepSeek API response
	 * Handles both regular chat and reasoning models (deepseek-reasoner)
	 *
	 * DeepSeek's reasoning models return TWO content fields:
	 * - reasoning_content: The thinking/CoT process (can be up to 32K tokens)
	 * - content: The final answer
	 */
	protected parseResponse(response: any): string {
		if (!response.choices || response.choices.length === 0) {
			throw new Error('No response from DeepSeek API');
		}

		const message = response.choices[0].message;

		// Try to get content first (final answer)
		let summary = message.content?.trim() || '';

		// If content is empty, try reasoning_content (for deepseek-reasoner model)
		if (!summary && message.reasoning_content) {
			summary = message.reasoning_content.trim();
		}

		// If both are empty, throw error
		if (!summary) {
			throw new Error('Empty summary from DeepSeek API (both content and reasoning_content are empty)');
		}

		return summary;
	}
}
