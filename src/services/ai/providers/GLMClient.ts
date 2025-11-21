import { OpenAIClient } from './OpenAIClient';

/**
 * Zhipu GLM API client
 * Uses OpenAI-compatible API format with some modifications
 */
export class GLMClient extends OpenAIClient {
	/**
	 * Build GLM API request
	 * GLM uses similar format to OpenAI but may have some differences
	 */
	protected buildRequest(article: any): any {
		const baseRequest = super.buildRequest(article);

		// GLM specific modifications if needed
		// For now, using OpenAI-compatible format
		return baseRequest;
	}
}
