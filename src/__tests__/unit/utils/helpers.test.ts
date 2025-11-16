/**
 * Unit tests for helper utilities
 * Tests all helper functions for correctness and edge cases
 */

import {
	sleep,
	getNextCronTime,
	isPast,
	formatTimestamp,
	sanitizeFilename,
	extractFeedIdFromUrl,
	matchesPatterns,
} from '../../../utils/helpers';

describe('helpers', () => {
	describe('sleep', () => {
		it('should resolve after specified milliseconds', async () => {
			const start = Date.now();
			await sleep(100);
			const elapsed = Date.now() - start;

			expect(elapsed).toBeGreaterThanOrEqual(100);
			expect(elapsed).toBeLessThan(200); // Allow some margin
		});

		it('should resolve immediately for 0ms', async () => {
			const start = Date.now();
			await sleep(0);
			const elapsed = Date.now() - start;

			expect(elapsed).toBeLessThan(50);
		});

		it('should return a promise', () => {
			const result = sleep(10);
			expect(result).toBeInstanceOf(Promise);
		});
	});

	describe('getNextCronTime', () => {
		it('should return a Date object', () => {
			const result = getNextCronTime('0 * * * *');
			expect(result).toBeInstanceOf(Date);
		});

		it('should return a future time', () => {
			const now = Date.now();
			const result = getNextCronTime('0 * * * *');

			expect(result.getTime()).toBeGreaterThan(now);
		});

		it('should handle different cron expressions', () => {
			const expressions = ['0 * * * *', '*/5 * * * *', '0 0 * * *'];

			expressions.forEach(expr => {
				const result = getNextCronTime(expr);
				expect(result).toBeInstanceOf(Date);
			});
		});
	});

	describe('isPast', () => {
		it('should return true for past timestamps', () => {
			const pastTime = Date.now() - 10000; // 10 seconds ago
			expect(isPast(pastTime)).toBe(true);
		});

		it('should return false for future timestamps', () => {
			const futureTime = Date.now() + 10000; // 10 seconds from now
			expect(isPast(futureTime)).toBe(false);
		});

		it('should return false for current time (edge case)', () => {
			const now = Date.now();
			expect(isPast(now)).toBe(false);
		});

		it('should handle very old timestamps', () => {
			expect(isPast(0)).toBe(true);
			expect(isPast(1000000000000)).toBe(true); // 2001
		});

		it('should handle far future timestamps', () => {
			const farFuture = Date.now() + 1000 * 60 * 60 * 24 * 365; // 1 year from now
			expect(isPast(farFuture)).toBe(false);
		});
	});

	describe('formatTimestamp', () => {
		it('should format timestamp to string', () => {
			const timestamp = 1704067200000; // 2024-01-01 00:00:00 UTC
			const result = formatTimestamp(timestamp);

			expect(typeof result).toBe('string');
			expect(result.length).toBeGreaterThan(0);
		});

		it('should format current time', () => {
			const now = Date.now();
			const result = formatTimestamp(now);

			expect(result).toContain('2025'); // Current year
		});

		it('should handle Unix epoch', () => {
			const result = formatTimestamp(0);
			expect(result).toBeTruthy();
		});

		it('should produce consistent format', () => {
			const timestamp = 1704067200000;
			const result1 = formatTimestamp(timestamp);
			const result2 = formatTimestamp(timestamp);

			expect(result1).toBe(result2);
		});
	});

	describe('sanitizeFilename', () => {
		it('should remove invalid filename characters', () => {
			const filename = 'file/name:with*invalid?chars<>|.txt';
			const result = sanitizeFilename(filename);

			expect(result).not.toContain('/');
			expect(result).not.toContain(':');
			expect(result).not.toContain('*');
			expect(result).not.toContain('?');
			expect(result).not.toContain('<');
			expect(result).not.toContain('>');
			expect(result).not.toContain('|');
		});

		it('should replace invalid chars with hyphens', () => {
			const filename = 'file/name';
			const result = sanitizeFilename(filename);

			expect(result).toBe('file-name');
		});

		it('should preserve valid characters', () => {
			const filename = 'valid-file_name.txt';
			const result = sanitizeFilename(filename);

			expect(result).toBe('valid-file_name.txt');
		});

		it('should handle multiple spaces', () => {
			const filename = 'file   with    spaces';
			const result = sanitizeFilename(filename);

			expect(result).toBe('file with spaces');
		});

		it('should trim whitespace', () => {
			const filename = '  filename  ';
			const result = sanitizeFilename(filename);

			expect(result).toBe('filename');
		});

		it('should handle Windows path separators', () => {
			const filename = 'path\\to\\file';
			const result = sanitizeFilename(filename);

			expect(result).not.toContain('\\');
			expect(result).toContain('-');
		});

		it('should handle Chinese characters', () => {
			const filename = '中文文件名.txt';
			const result = sanitizeFilename(filename);

			expect(result).toBe('中文文件名.txt');
		});

		it('should handle empty string', () => {
			const result = sanitizeFilename('');
			expect(result).toBe('');
		});

		it('should handle string with only invalid characters', () => {
			const filename = '///:::***';
			const result = sanitizeFilename(filename);

			expect(result).toBe('---------');
		});
	});

	describe('extractFeedIdFromUrl', () => {
		it('should extract __biz parameter from WeChat URL', () => {
			const url = 'https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=MzA3MjQ2NjQwMQ==';
			const result = extractFeedIdFromUrl(url);

			expect(result).toBe('MzA3MjQ2NjQwMQ==');
		});

		it('should handle URL with multiple parameters', () => {
			const url = 'https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=ABC123&other=param';
			const result = extractFeedIdFromUrl(url);

			expect(result).toBe('ABC123');
		});

		it('should return null for URL without __biz', () => {
			const url = 'https://mp.weixin.qq.com/s/article-link';
			const result = extractFeedIdFromUrl(url);

			expect(result).toBeNull();
		});

		it('should return null for invalid URL', () => {
			const url = 'not-a-url';
			const result = extractFeedIdFromUrl(url);

			expect(result).toBeNull();
		});

		it('should handle empty string', () => {
			const result = extractFeedIdFromUrl('');
			expect(result).toBeNull();
		});

		it('should handle __biz as first parameter', () => {
			const url = 'https://mp.weixin.qq.com/mp/profile_ext?__biz=FIRST&other=param';
			const result = extractFeedIdFromUrl(url);

			expect(result).toBe('FIRST');
		});

		it('should handle encoded __biz value', () => {
			const url = 'https://mp.weixin.qq.com/mp/profile_ext?__biz=Mz%3D%3D&action=home';
			const result = extractFeedIdFromUrl(url);

			expect(result).toBe('Mz%3D%3D');
		});
	});

	describe('matchesPatterns', () => {
		it('should return true when string matches pattern', () => {
			const result = matchesPatterns('hello world', ['world']);
			expect(result).toBe(true);
		});

		it('should return false when string does not match any pattern', () => {
			const result = matchesPatterns('hello world', ['foo', 'bar']);
			expect(result).toBe(false);
		});

		it('should be case insensitive', () => {
			const result = matchesPatterns('Hello World', ['WORLD']);
			expect(result).toBe(true);
		});

		it('should support regex patterns', () => {
			const result = matchesPatterns('test123', ['^test\\d+$']);
			expect(result).toBe(true);
		});

		it('should return false for empty patterns array', () => {
			const result = matchesPatterns('hello', []);
			expect(result).toBe(false);
		});

		it('should match any pattern (OR logic)', () => {
			const result = matchesPatterns('test', ['foo', 'test', 'bar']);
			expect(result).toBe(true);
		});

		it('should handle special regex characters', () => {
			const result = matchesPatterns('test.file', ['test\\.file']);
			expect(result).toBe(true);
		});

		it('should handle invalid regex patterns gracefully', () => {
			const result = matchesPatterns('test', ['[invalid']);
			expect(result).toBe(false);
		});

		it('should match partial strings', () => {
			const result = matchesPatterns('hello world test', ['world']);
			expect(result).toBe(true);
		});

		it('should support complex regex patterns', () => {
			const result = matchesPatterns('user@example.com', ['\\w+@\\w+\\.\\w+']);
			expect(result).toBe(true);
		});

		it('should handle Chinese characters', () => {
			const result = matchesPatterns('测试文本', ['测试']);
			expect(result).toBe(true);
		});

		it('should handle empty string input', () => {
			const result = matchesPatterns('', ['pattern']);
			expect(result).toBe(false);
		});

		it('should handle multiple matching patterns', () => {
			const result = matchesPatterns('test', ['test', 'test2']);
			expect(result).toBe(true);
		});
	});
});
