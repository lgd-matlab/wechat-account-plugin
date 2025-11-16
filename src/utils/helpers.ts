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
