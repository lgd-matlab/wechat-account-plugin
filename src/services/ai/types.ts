/**
 * AI Provider Configuration
 */
export interface AIProviderConfig {
	apiKey: string;
	endpoint: string;
	model: string;
}

/**
 * AI API Response
 */
export interface AIApiResponse {
	summary: string;
	usage?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
}

/**
 * AI API Error
 */
export interface AIApiError {
	code: string;
	message: string;
	retryable: boolean;
}

/**
 * Prompt template for article summarization
 */
export const SUMMARY_PROMPT_TEMPLATE = `Summarize the following article in 2-3 concise sentences. Focus on the main points and key insights.

Article Title: {title}
Published Date: {publishedAt}
Content:
{content}

Provide a clear, informative summary:`;

/**
 * Format prompt with article data
 */
export function formatSummaryPrompt(
	title: string,
	publishedAt: string,
	content: string
): string {
	return SUMMARY_PROMPT_TEMPLATE
		.replace('{title}', title)
		.replace('{publishedAt}', publishedAt)
		.replace('{content}', content);
}
