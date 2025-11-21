import { SummaryArticle } from '../../../types';
import { AIApiClient } from '../AIApiClient';

/**
 * Google Gemini API client
 */
export class GeminiClient extends AIApiClient {
	/**
	 * Summarize article using Gemini API
	 */
	async summarizeArticle(article: SummaryArticle): Promise<string> {
		if (!this.validateConfig()) {
			throw new Error('Invalid Gemini configuration');
		}

		const request = this.buildRequest(article);
		const url = `${this.config.endpoint}/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;

		const response = await this.makeRequest(url, request, {});

		return this.parseResponse(response);
	}

	/**
	 * Build Gemini API request
	 */
	protected buildRequest(article: SummaryArticle): any {
		const prompt = this.formatPrompt(article);

		return {
			contents: [
				{
					parts: [
						{
							text: prompt
						}
					]
				}
			],
			generationConfig: {
				temperature: 0.7,
				maxOutputTokens: 300
			}
		};
	}

	/**
	 * Parse Gemini API response
	 */
	protected parseResponse(response: any): string {
		if (!response.candidates || response.candidates.length === 0) {
			throw new Error('No response from Gemini API');
		}

		const candidate = response.candidates[0];
		if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
			throw new Error('Invalid response structure from Gemini API');
		}

		const summary = candidate.content.parts[0].text.trim();

		if (!summary) {
			throw new Error('Empty summary from Gemini API');
		}

		return summary;
	}
}
