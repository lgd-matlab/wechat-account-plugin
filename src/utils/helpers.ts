/**
 * Helper utility functions
 */

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse cron expression and get next run time
 * Simplified implementation - will be enhanced later
 */
export function getNextCronTime(cronExpression: string): Date {
	// TODO: Implement proper cron parsing
	// For now, return 1 hour from now
	return new Date(Date.now() + 60 * 60 * 1000);
}

/**
 * Check if a timestamp is in the past
 */
export function isPast(timestamp: number): boolean {
	return timestamp < Date.now();
}

/**
 * Format timestamp to readable string
 */
export function formatTimestamp(timestamp: number): string {
	return new Date(timestamp).toLocaleString();
}

/**
 * Format timestamp to "Month Day" format (e.g., "December 18")
 * Used for displaying published dates in article notes
 *
 * @param timestamp Unix timestamp in milliseconds
 * @returns Formatted date string (e.g., "January 5", "December 31")
 */
export function formatPublishedDate(timestamp: number): string {
	const date = new Date(timestamp);
	const month = date.toLocaleString('en-US', { month: 'long' });
	const day = date.getDate();
	return `${month} ${day}`;
}

/**
 * Sanitize filename for vault storage
 */
export function sanitizeFilename(filename: string): string {
	return filename
		.replace(/[\\/:*?"<>|]/g, '-')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Extract feed ID from WeChat share link
 */
export function extractFeedIdFromUrl(url: string): string | null {
	// TODO: Implement URL parsing logic
	// Example: https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=...
	const match = url.match(/__biz=([^&]+)/);
	return match ? match[1] : null;
}

/**
 * Match string against regex patterns
 */
export function matchesPatterns(str: string, patterns: string[]): boolean {
	if (patterns.length === 0) return false;

	return patterns.some(pattern => {
		try {
			const regex = new RegExp(pattern, 'i');
			return regex.test(str);
		} catch (e) {
			console.error('Invalid regex pattern:', pattern, e);
			return false;
		}
	});
}

/**
 * Check if an article is within the retention period
 * @param publishedAt Article publish timestamp (milliseconds)
 * @param daysThreshold Retention period in days (default: 30)
 * @returns true if article is within retention period
 */
export function isArticleRecent(publishedAt: number, daysThreshold: number = 30): boolean {
	const thresholdMs = daysThreshold * 24 * 60 * 60 * 1000;
	const articleAge = Date.now() - publishedAt;
	return articleAge <= thresholdMs;
}
