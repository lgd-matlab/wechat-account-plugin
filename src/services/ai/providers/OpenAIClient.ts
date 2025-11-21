import { SummaryArticle } from '../../../types';
import { AIApiClient } from '../AIApiClient';

/**
 * OpenAI API client
 * Also compatible with DeepSeek and other OpenAI-compatible APIs
 */
export class OpenAIClient extends AIApiClient {
	/**
	 * Summarize article using OpenAI API
	 */
	async summarizeArticle(article: SummaryArticle): Promise<string> {
		if (!this.validateConfig()) {
			throw new Error('Invalid OpenAI configuration');
		}

		const request = this.buildRequest(article);
		const response = await this.makeRequest(
			`${this.config.endpoint}/chat/completions`,
			request,
			{
				'Authorization': `Bearer ${this.config.apiKey}`
			}
		);

		return this.parseResponse(response);
	}

	/**
	 * Build OpenAI API request
	 */
	protected buildRequest(article: SummaryArticle): any {
		const prompt = this.formatPrompt(article);

		return {
			model: this.config.model,
			messages: [
				{
					role: 'system',
					content: 'You are a helpful assistant that summarizes articles concisely and accurately.'
				},
				{
					role: 'user',
					content: prompt
				}
			],
			temperature: 0.7,
			max_tokens: 300
		};
	}

	/**
	 * Parse OpenAI API response
	 */
	protected parseResponse(response: any): string {
		if (!response.choices || response.choices.length === 0) {
			throw new Error('No response from OpenAI API');
		}

		const summary = response.choices[0].message.content.trim();

		if (!summary) {
			throw new Error('Empty summary from OpenAI API');
		}

		return summary;
	}
}
