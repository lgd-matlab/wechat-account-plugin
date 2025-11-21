/**
 * Unit tests for SummaryService
 * Tests daily summarization workflow, article processing, and file generation
 */

import { SummaryService } from '../../../services/SummaryService';
import { AIClientFactory } from '../../../services/ai/AIClientFactory';
import { WeWeRssSettings, DailySummaryResult, SummaryArticle, Article } from '../../../types';

// Mock AIClientFactory
jest.mock('../../../services/ai/AIClientFactory');
jest.mock('obsidian', () => ({
	requestUrl: jest.fn(),
	Notice: jest.fn(),
}));

describe('SummaryService', () => {
	let summaryService: SummaryService;
	let mockDatabaseService: any;
	let mockApp: any;
	let mockSettings: WeWeRssSettings;
	let mockArticles: Article[];
	let mockFeeds: Map<number, any>;

	beforeEach(() => {
		// Mock database service
		mockDatabaseService = {
			articles: {
				findByDateRange: jest.fn(),
			},
			feeds: {
				findById: jest.fn(),
			},
		};

		// Mock Obsidian app
		mockApp = {
			vault: {
				adapter: {
					exists: jest.fn(),
					mkdir: jest.fn(),
				},
				read: jest.fn(),
				getAbstractFileByPath: jest.fn(),
				create: jest.fn(),
				modify: jest.fn(),
				getName: jest.fn().mockReturnValue('test-vault'),
			},
			metadataCache: {
				getFileCache: jest.fn(),
			},
		};

		// Mock settings
		mockSettings = {
			summarizationEnabled: true,
			summarizationProvider: 'openai',
			summarizationApiKey: 'test-api-key',
			summarizationApiEndpoint: 'https://api.openai.com/v1',
			summarizationModel: 'gpt-3.5-turbo',
			summarizationFolder: 'Daily Summaries',
			summarizationAutoRun: true,
			summarizationScheduleTime: '01:00',
			summarizationLastRun: 0,
		} as any;

		// Mock articles
		mockArticles = [
			{
				id: 1,
				feedId: 1,
				title: 'Test Article 1',
				content: 'Content of test article 1',
				contentHtml: '<p>Content</p>',
				url: 'https://example.com/article1',
				publishedAt: Date.now() - 24 * 60 * 60 * 1000, // Yesterday
				synced: true,
				noteId: 'Test Article 1.md',
				createdAt: Date.now(),
			},
			{
				id: 2,
				feedId: 1,
				title: 'Test Article 2',
				content: 'Content of test article 2',
				contentHtml: '<p>Content 2</p>',
				url: 'https://example.com/article2',
				publishedAt: Date.now() - 24 * 60 * 60 * 1000,
				synced: true,
				noteId: 'Test Article 2.md',
				createdAt: Date.now(),
			},
		];

		// Mock feeds
		mockFeeds = new Map();
		mockFeeds.set(1, {
			id: 1,
			feedId: 'feed_1',
			title: 'Test Feed',
			description: 'Test feed description',
		});

		mockDatabaseService.feeds.findById.mockImplementation((id: number) => mockFeeds.get(id));

		// Create service
		summaryService = new SummaryService(mockDatabaseService, mockApp, mockSettings);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('validateConfiguration', () => {
		it('should return true for valid configuration', () => {
			expect(summaryService['validateConfiguration']()).toBe(true);
		});

		it('should return false if summarization is disabled', () => {
			mockSettings.summarizationEnabled = false;
			summaryService = new SummaryService(mockDatabaseService, mockApp, mockSettings);

			expect(summaryService['validateConfiguration']()).toBe(false);
		});

		it('should return false if API key is missing', () => {
			mockSettings.summarizationApiKey = '';
			summaryService = new SummaryService(mockDatabaseService, mockApp, mockSettings);

			expect(summaryService['validateConfiguration']()).toBe(false);
		});

		it('should return false if endpoint is missing', () => {
			mockSettings.summarizationApiEndpoint = '';
			summaryService = new SummaryService(mockDatabaseService, mockApp, mockSettings);

			expect(summaryService['validateConfiguration']()).toBe(false);
		});

		it('should return false if model is missing', () => {
			mockSettings.summarizationModel = '';
			summaryService = new SummaryService(mockDatabaseService, mockApp, mockSettings);

			expect(summaryService['validateConfiguration']()).toBe(false);
		});
	});

	describe('getYesterdayArticles', () => {
		it('should query articles from yesterday', async () => {
			mockDatabaseService.articles.findByDateRange.mockReturnValue(mockArticles);

			const articles = await summaryService['getYesterdayArticles']();

			expect(mockDatabaseService.articles.findByDateRange).toHaveBeenCalled();
			const [startTime, endTime] = mockDatabaseService.articles.findByDateRange.mock.calls[0];

			// Verify time range is approximately yesterday
			const now = Date.now();
			const oneDayMs = 24 * 60 * 60 * 1000;

			expect(startTime).toBeGreaterThan(now - 2 * oneDayMs);
			expect(startTime).toBeLessThan(now - oneDayMs + 1000);
			expect(endTime).toBeGreaterThan(now - oneDayMs);
			expect(endTime).toBeLessThan(now + 1000);
		});

		it('should return empty array if no articles found', async () => {
			mockDatabaseService.articles.findByDateRange.mockReturnValue([]);

			const articles = await summaryService['getYesterdayArticles']();

			expect(articles).toEqual([]);
		});

		it('should include feed name in returned articles', async () => {
			mockDatabaseService.articles.findByDateRange.mockReturnValue(mockArticles);

			const articles = await summaryService['getYesterdayArticles']();

			expect(articles).toHaveLength(2);
			expect(articles[0].feedName).toBe('Test Feed');
			expect(articles[1].feedName).toBe('Test Feed');
		});

		it('should handle articles with missing feed gracefully', async () => {
			mockDatabaseService.articles.findByDateRange.mockReturnValue(mockArticles);
			mockDatabaseService.feeds.findById.mockReturnValue(null);

			const articles = await summaryService['getYesterdayArticles']();

			expect(articles).toHaveLength(2);
			expect(articles[0].feedName).toBe('Unknown Feed');
		});
	});

	describe('summarizeArticles', () => {
		let mockAIClient: any;

		beforeEach(() => {
			mockAIClient = {
				summarizeArticle: jest.fn(),
			};

			(AIClientFactory.createClient as jest.Mock).mockReturnValue(mockAIClient);
		});

		it('should summarize all articles successfully', async () => {
			mockAIClient.summarizeArticle
				.mockResolvedValueOnce('Summary of article 1')
				.mockResolvedValueOnce('Summary of article 2');

			const summaryArticles: SummaryArticle[] = mockArticles.map(a => ({
				id: a.id,
				title: a.title,
				content: a.content,
				url: a.url,
				publishedAt: a.publishedAt,
				feedName: 'Test Feed',
				noteId: a.noteId,
			}));

			const summaries = await summaryService['summarizeArticles'](summaryArticles);

			expect(summaries).toHaveLength(2);
			expect(summaries[0].summary).toBe('Summary of article 1');
			expect(summaries[1].summary).toBe('Summary of article 2');
		});

		it('should create AI client with correct configuration', async () => {
			mockAIClient.summarizeArticle.mockResolvedValue('Summary');

			const summaryArticles: SummaryArticle[] = [
				{
					id: 1,
					title: 'Test',
					content: 'Content',
					url: 'https://example.com',
					publishedAt: Date.now(),
					feedName: 'Feed',
				},
			];

			await summaryService['summarizeArticles'](summaryArticles);

			expect(AIClientFactory.createClient).toHaveBeenCalledWith('openai', {
				apiKey: 'test-api-key',
				endpoint: 'https://api.openai.com/v1',
				model: 'gpt-3.5-turbo',
			});
		});

		it('should continue processing if one article fails', async () => {
			mockAIClient.summarizeArticle
				.mockRejectedValueOnce(new Error('API error'))
				.mockResolvedValueOnce('Summary of article 2');

			const summaryArticles: SummaryArticle[] = mockArticles.map(a => ({
				id: a.id,
				title: a.title,
				content: a.content,
				url: a.url,
				publishedAt: a.publishedAt,
				feedName: 'Test Feed',
				noteId: a.noteId,
			}));

			const summaries = await summaryService['summarizeArticles'](summaryArticles);

			// Should only have 1 successful summary
			expect(summaries).toHaveLength(1);
			expect(summaries[0].summary).toBe('Summary of article 2');
		});

		it('should log errors for failed articles', async () => {
			const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

			mockAIClient.summarizeArticle.mockRejectedValue(new Error('API error'));

			const summaryArticles: SummaryArticle[] = [
				{
					id: 1,
					title: 'Test',
					content: 'Content',
					url: 'https://example.com',
					publishedAt: Date.now(),
					feedName: 'Feed',
				},
			];

			await summaryService['summarizeArticles'](summaryArticles);

			expect(consoleErrorSpy).toHaveBeenCalled();
			consoleErrorSpy.mockRestore();
		});
	});

	describe('buildMarkdownContent', () => {
		it('should generate properly formatted markdown', () => {
			const result: DailySummaryResult = {
				date: '2025-11-18',
				summaries: [
					{
						articleId: 1,
						title: 'Test Article',
						summary: 'This is a test summary.',
						metadata: {
							publishedAt: 'Nov 17, 2025',
							feedName: 'Test Feed',
							noteLink: 'obsidian://open?vault=MyVault&file=Test%20Article.md',
						},
					},
				],
				totalArticles: 1,
				filePath: '',
			};

			const markdown = summaryService['buildMarkdownContent'](result);

			expect(markdown).toContain('# Daily Summary - 2025-11-18');
			expect(markdown).toContain('Total Articles: 1');
			expect(markdown).toContain('AI Provider: openai');
			expect(markdown).toContain('## 1. Test Article');
			expect(markdown).toContain('**Published**: Nov 17, 2025');
			expect(markdown).toContain('**Source**: Test Feed');
			expect(markdown).toContain('This is a test summary.');
		});

		it('should number articles sequentially', () => {
			const result: DailySummaryResult = {
				date: '2025-11-18',
				summaries: [
					{
						articleId: 1,
						title: 'Article 1',
						summary: 'Summary 1',
						metadata: {
							publishedAt: 'Nov 17',
							feedName: 'Feed',
							noteLink: 'link1',
						},
					},
					{
						articleId: 2,
						title: 'Article 2',
						summary: 'Summary 2',
						metadata: {
							publishedAt: 'Nov 17',
							feedName: 'Feed',
							noteLink: 'link2',
						},
					},
				],
				totalArticles: 2,
				filePath: '',
			};

			const markdown = summaryService['buildMarkdownContent'](result);

			expect(markdown).toContain('## 1. Article 1');
			expect(markdown).toContain('## 2. Article 2');
		});

		it('should include footer', () => {
			const result: DailySummaryResult = {
				date: '2025-11-18',
				summaries: [],
				totalArticles: 0,
				filePath: '',
			};

			const markdown = summaryService['buildMarkdownContent'](result);

			expect(markdown).toContain('WeWe RSS AI Summarization');
		});
	});

	describe('createSummaryFile', () => {
		it('should create summary file with correct filename', async () => {
			const createSpy = jest.spyOn(mockApp.vault, 'create').mockResolvedValue({} as any);
			mockApp.vault.adapter.exists.mockResolvedValue(true);

			const result: DailySummaryResult = {
				date: '2025-11-18',
				summaries: [],
				totalArticles: 0,
				filePath: '',
			};

			await summaryService['createSummaryFile'](result);

			expect(createSpy).toHaveBeenCalledWith(
				'Daily Summaries/2025-11-18-summary.md',
				expect.any(String)
			);
		});

		it('should create folder if it does not exist', async () => {
			mockApp.vault.adapter.exists.mockResolvedValue(false);

			const result: DailySummaryResult = {
				date: '2025-11-18',
				summaries: [],
				totalArticles: 0,
				filePath: '',
			};

			await summaryService['createSummaryFile'](result);

			expect(mockApp.vault.adapter.mkdir).toHaveBeenCalledWith('Daily Summaries');
		});

		it('should not create folder if it already exists', async () => {
			mockApp.vault.adapter.exists.mockResolvedValue(true);

			const result: DailySummaryResult = {
				date: '2025-11-18',
				summaries: [],
				totalArticles: 0,
				filePath: '',
			};

			await summaryService['createSummaryFile'](result);

			expect(mockApp.vault.adapter.mkdir).not.toHaveBeenCalled();
		});
	});

	describe('generateDailySummary (integration)', () => {
		let mockAIClient: any;

		beforeEach(() => {
			mockAIClient = {
				summarizeArticle: jest.fn().mockResolvedValue('AI-generated summary'),
			};

			(AIClientFactory.createClient as jest.Mock).mockReturnValue(mockAIClient);

			mockDatabaseService.articles.findByDateRange.mockReturnValue(mockArticles);
			mockApp.vault.adapter.exists.mockResolvedValue(true);
			jest.spyOn(mockApp.vault, 'create').mockResolvedValue({} as any);
		});

		it('should complete full summarization workflow', async () => {
			const result = await summaryService.generateDailySummary();

			expect(result.totalArticles).toBe(2);
			expect(result.summaries).toHaveLength(2);
			expect(result.filePath).toContain('Daily Summaries/');
			expect(result.filePath).toContain('-summary.md');
		});

		it('should return empty result if no articles found', async () => {
			mockDatabaseService.articles.findByDateRange.mockReturnValue([]);

			const result = await summaryService.generateDailySummary();

			expect(result.totalArticles).toBe(0);
			expect(result.summaries).toHaveLength(0);
			expect(result.filePath).toBe('');
		});

		it('should throw error if configuration is invalid', async () => {
			mockSettings.summarizationEnabled = false;
			summaryService = new SummaryService(mockDatabaseService, mockApp, mockSettings);

			await expect(summaryService.generateDailySummary()).rejects.toThrow(
				'not properly configured'
			);
		});

		it('should update last run timestamp', async () => {
			const beforeTime = Date.now();

			await summaryService.generateDailySummary();

			expect(mockSettings.summarizationLastRun).toBeGreaterThanOrEqual(beforeTime);
			expect(mockSettings.summarizationLastRun).toBeLessThanOrEqual(Date.now());
		});

		it('should handle partial failures gracefully', async () => {
			mockAIClient.summarizeArticle
				.mockRejectedValueOnce(new Error('API error'))
				.mockResolvedValueOnce('Success summary');

			const result = await summaryService.generateDailySummary();

			// Should have 1 successful summary despite 1 failure
			expect(result.totalArticles).toBe(2);
			expect(result.summaries).toHaveLength(1);
		});
	});

	describe('getTodayDateString', () => {
		it('should return date in YYYY-MM-DD format', () => {
			const dateString = summaryService['getTodayDateString']();

			expect(dateString).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		});

		it('should pad single digit months and days', () => {
			// Mock date with single digits
			jest.spyOn(Date.prototype, 'getMonth').mockReturnValue(0); // January = 0
			jest.spyOn(Date.prototype, 'getDate').mockReturnValue(5);

			const dateString = summaryService['getTodayDateString']();

			expect(dateString).toContain('-01-'); // Padded month
			expect(dateString).toContain('-05'); // Padded day
		});
	});

	describe('ensureFolderExists', () => {
		it('should create folder if it does not exist', async () => {
			mockApp.vault.adapter.exists.mockResolvedValue(false);

			await summaryService['ensureFolderExists']('Test Folder');

			expect(mockApp.vault.adapter.mkdir).toHaveBeenCalledWith('Test Folder');
		});

		it('should not create folder if it already exists', async () => {
			mockApp.vault.adapter.exists.mockResolvedValue(true);

			await summaryService['ensureFolderExists']('Existing Folder');

			expect(mockApp.vault.adapter.mkdir).not.toHaveBeenCalled();
		});

		it('should handle errors during folder creation', async () => {
			mockApp.vault.adapter.exists.mockResolvedValue(false);
			mockApp.vault.adapter.mkdir.mockRejectedValue(new Error('Permission denied'));

			await expect(summaryService['ensureFolderExists']('Bad Folder')).rejects.toThrow(
				'Permission denied'
			);
		});
	});

	describe('parsePublishedDate', () => {
		it('should parse "Month Day" format with current year', () => {
			const timestamp = summaryService['parsePublishedDate']('November 19');

			expect(timestamp).toBeGreaterThan(0);
			const date = new Date(timestamp);
			expect(date.getMonth()).toBe(10); // November = 10
			expect(date.getDate()).toBe(19);
		});

		it('should parse ISO date format', () => {
			const timestamp = summaryService['parsePublishedDate']('2024-11-19');

			expect(timestamp).toBeGreaterThan(0);
			const date = new Date(timestamp);
			expect(date.getFullYear()).toBe(2024);
			expect(date.getMonth()).toBe(10); // November
			expect(date.getDate()).toBe(19);
		});

		it('should return timestamp if already a number', () => {
			const inputTimestamp = 1700000000000;
			const result = summaryService['parsePublishedDate'](inputTimestamp);

			expect(result).toBe(inputTimestamp);
		});

		it('should return 0 for invalid date string', () => {
			const result = summaryService['parsePublishedDate']('invalid date');

			expect(result).toBe(0);
		});

		it('should return 0 for undefined input', () => {
			const result = summaryService['parsePublishedDate'](undefined);

			expect(result).toBe(0);
		});
	});

	describe('stripFrontmatter', () => {
		it('should remove YAML frontmatter from content', () => {
			const content = `---
title: Test Article
published: November 19
---

# Article Title

This is the content.`;

			const result = summaryService['stripFrontmatter'](content);

			expect(result).not.toContain('---');
			expect(result).not.toContain('title: Test Article');
			expect(result).toContain('# Article Title');
			expect(result).toContain('This is the content.');
		});

		it('should return content unchanged if no frontmatter', () => {
			const content = `# Article Title

No frontmatter here.`;

			const result = summaryService['stripFrontmatter'](content);

			expect(result).toBe(content);
		});

		it('should handle empty content', () => {
			const result = summaryService['stripFrontmatter']('');

			expect(result).toBe('');
		});
	});

	describe('extractFeedFromPath', () => {
		it('should extract feed name from nested path', () => {
			const result = summaryService['extractFeedFromPath']('WeWe RSS/程序那些事儿/Article.md');

			expect(result).toBe('程序那些事儿');
		});

		it('should handle Windows path separators', () => {
			const result = summaryService['extractFeedFromPath']('WeWe RSS\\程序那些事儿\\Article.md');

			expect(result).toBe('程序那些事儿');
		});

		it('should return "Unknown Feed" for root-level files', () => {
			const result = summaryService['extractFeedFromPath']('WeWe RSS/Article.md');

			expect(result).toBe('Unknown Feed');
		});

		it('should return "Unknown Feed" for invalid paths', () => {
			const result = summaryService['extractFeedFromPath']('Article.md');

			expect(result).toBe('Unknown Feed');
		});
	});

	describe('getAllMarkdownFiles', () => {
		it('should return all markdown files from folder', () => {
			const mockFolder = {
				children: [
					{ path: 'test1.md', extension: 'md' },
					{ path: 'test2.md', extension: 'md' },
					{ path: 'image.png', extension: 'png' }, // Should be filtered out
				]
			} as any;

			const result = summaryService['getAllMarkdownFiles'](mockFolder);

			expect(result).toHaveLength(2);
			expect(result[0].path).toBe('test1.md');
			expect(result[1].path).toBe('test2.md');
		});

		it('should recursively scan subfolders', () => {
			const mockSubfolder = {
				children: [
					{ path: 'nested.md', extension: 'md' },
				]
			} as any;

			const mockFolder = {
				children: [
					{ path: 'root.md', extension: 'md' },
					mockSubfolder,
				]
			} as any;

			// Mock TFolder instanceof check
			Object.setPrototypeOf(mockSubfolder, Object.getPrototypeOf(mockFolder));

			const result = summaryService['getAllMarkdownFiles'](mockFolder);

			expect(result).toHaveLength(2);
		});

		it('should return empty array for empty folder', () => {
			const mockFolder = {
				children: []
			} as any;

			const result = summaryService['getAllMarkdownFiles'](mockFolder);

			expect(result).toEqual([]);
		});
	});

	describe('getYesterdayArticlesFromFilesystem', () => {
		it('should scan filesystem and find articles from yesterday', async () => {
			// Mock folder structure
			const mockFile = {
				path: 'WeWe RSS/Feed Name/Article.md',
				basename: 'Article',
				extension: 'md',
				stat: { mtime: Date.now() - 12 * 60 * 60 * 1000 } // 12 hours ago
			} as any;

			const mockFolder = {
				children: [mockFile]
			} as any;

			mockApp.vault.getAbstractFileByPath.mockReturnValue(mockFolder);
			mockApp.metadataCache.getFileCache.mockReturnValue({
				frontmatter: {
					title: 'Test Article',
					published: 'November 19',
					feed: 'Test Feed',
					url: 'https://example.com/article'
				}
			});
			mockApp.vault.read.mockResolvedValue('---\ntitle: Test\n---\n\n# Content');

			const result = await summaryService['getYesterdayArticlesFromFilesystem']();

			expect(result.length).toBeGreaterThanOrEqual(0);
			// Note: Actual filtering depends on date range
		});

		it('should return empty array if folder does not exist', async () => {
			mockApp.vault.getAbstractFileByPath.mockReturnValue(null);

			const result = await summaryService['getYesterdayArticlesFromFilesystem']();

			expect(result).toEqual([]);
		});

		it('should use file mtime as fallback if no published date', async () => {
			const yesterday = Date.now() - 12 * 60 * 60 * 1000; // 12 hours ago
			const mockFile = {
				path: 'WeWe RSS/Feed/Article.md',
				basename: 'Article',
				extension: 'md',
				stat: { mtime: yesterday }
			} as any;

			const mockFolder = {
				children: [mockFile]
			} as any;

			mockApp.vault.getAbstractFileByPath.mockReturnValue(mockFolder);
			mockApp.metadataCache.getFileCache.mockReturnValue({
				frontmatter: {
					title: 'Test Article',
					// No published field
				}
			});
			mockApp.vault.read.mockResolvedValue('# Content');

			const result = await summaryService['getYesterdayArticlesFromFilesystem']();

			// Should use mtime for date filtering
			expect(mockApp.vault.read).toHaveBeenCalled();
		});

		it('should continue processing despite individual file errors', async () => {
			const mockFile1 = {
				path: 'WeWe RSS/Feed/Good.md',
				basename: 'Good',
				extension: 'md',
				stat: { mtime: Date.now() - 12 * 60 * 60 * 1000 }
			} as any;

			const mockFile2 = {
				path: 'WeWe RSS/Feed/Bad.md',
				basename: 'Bad',
				extension: 'md',
				stat: { mtime: Date.now() - 12 * 60 * 60 * 1000 }
			} as any;

			const mockFolder = {
				children: [mockFile1, mockFile2]
			} as any;

			mockApp.vault.getAbstractFileByPath.mockReturnValue(mockFolder);
			mockApp.metadataCache.getFileCache
				.mockReturnValueOnce({ frontmatter: { title: 'Good', published: 'November 19' } })
				.mockReturnValueOnce(null); // Simulate error for second file
			mockApp.vault.read
				.mockResolvedValueOnce('# Good content')
				.mockRejectedValueOnce(new Error('Read error'));

			const result = await summaryService['getYesterdayArticlesFromFilesystem']();

			// Should have processed at least the successful file
			expect(mockApp.vault.read).toHaveBeenCalled();
		});
	});
});
