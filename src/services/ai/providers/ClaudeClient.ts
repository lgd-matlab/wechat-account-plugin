import { SummaryArticle } from '../../../types';
import { AIApiClient } from '../AIApiClient';

/**
 * Anthropic Claude API client
 */
export class ClaudeClient extends AIApiClient {
	/**
	 * Summarize article using Claude API
	 */
	async summarizeArticle(article: SummaryArticle): Promise<string> {
		if (!this.validateConfig()) {
			throw new Error('Invalid Claude configuration');
		}

		const request = this.buildRequest(article);
		const response = await this.makeRequest(
			`${this.config.endpoint}/messages`,
			request,
			{
				'x-api-key': this.config.apiKey,
				'anthropic-version': '2023-06-01'
			}
		);

		return this.parseResponse(response);
	}

	/**
	 * Build Claude API request
	 */
	protected buildRequest(article: SummaryArticle): any {
		const prompt = this.formatPrompt(article);

		return {
			model: this.config.model,
			max_tokens: 300,
			messages: [
				{
					role: 'user',
					content: prompt
				}
			]
		};
	}

	/**
	 * Parse Claude API response
	 */
	protected parseResponse(response: any): string {
		if (!response.content || response.content.length === 0) {
			throw new Error('No response from Claude API');
		}

		const summary = response.content[0].text.trim();

		if (!summary) {
			throw new Error('Empty summary from Claude API');
		}

		return summary;
	}
}
