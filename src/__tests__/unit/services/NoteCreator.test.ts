/**
 * Unit tests for NoteCreator
 * Tests note creation, templates, and file operations
 */

import { NoteCreator } from '../../../services/NoteCreator';
import { sampleArticle1, sampleArticle2, sampleArticle3 } from '../../fixtures/sample-articles';
import { sampleFeed1, sampleFeed2 } from '../../fixtures/sample-feeds';
import { Article, Feed } from '../../../types';
import { MockFile, MockFolder } from '../../mocks/obsidian';

// Mock logger
jest.mock('../../../utils/logger', () => ({
	Logger: jest.fn().mockImplementation(() => ({
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
	})),
}));

// Mock obsidian module to provide TFile and TFolder for instanceof checks
jest.mock('obsidian', () => ({
	...jest.requireActual('../../mocks/obsidian'),
	TFile: class TFile {
		path: string = '';
	},
	TFolder: class TFolder {
		path: string = '';
	},
	normalizePath: (path: string) => path.replace(/\\/g, '/'),
}));

describe('NoteCreator', () => {
	let noteCreator: NoteCreator;
	let mockPlugin: any;
	let mockVault: any;
	let mockApp: any;
	let mockDatabaseService: any;

	// Helper to create mock TFile instances
	const createMockTFile = (path: string) => {
		const TFile = require('obsidian').TFile;
		return Object.assign(new TFile(), { path });
	};

	// Helper to create mock TFolder instances
	const createMockTFolder = (path: string) => {
		const TFolder = require('obsidian').TFolder;
		return Object.assign(new TFolder(), { path });
	};

	// Helper to convert ArticleFixture to Article
	const toArticle = (fixture: typeof sampleArticle1, id: number): Article => ({
		id,
		feedId: fixture.feed_id,
		title: fixture.title,
		content: fixture.content,
		contentHtml: fixture.content_html,
		url: fixture.url,
		publishedAt: fixture.published_at,
		synced: Boolean(fixture.synced),
		noteId: fixture.note_id || undefined,
		createdAt: fixture.created_at,
	});

	beforeEach(() => {
		// Mock vault methods
		mockVault = {
			getAbstractFileByPath: jest.fn(),
			create: jest.fn(),
			createFolder: jest.fn(),
			delete: jest.fn(),
			modify: jest.fn(),
			read: jest.fn(),
			getMarkdownFiles: jest.fn().mockReturnValue([]),
		};

		// Mock app
		mockApp = {
			vault: mockVault,
		};

		// Mock database service
		mockDatabaseService = {
			articles: {
				update: jest.fn(),
			},
		};

		// Mock plugin with default settings
		mockPlugin = {
			app: mockApp,
			databaseService: mockDatabaseService,
			settings: {
				noteLocation: 'WeWe RSS',
				noteTemplate: `---
title: {{title}}
feedName: {{feedName}}
publishedAt: {{publishedAt}}
url: {{url}}
tags: {{tags}}
---

# {{title}}

{{content}}
`,
				addTags: true,
			},
		};

		noteCreator = new NoteCreator(mockPlugin);
	});

	describe('createNoteFromArticle', () => {
		it('should create a new note from article', async () => {
			mockVault.getAbstractFileByPath.mockReturnValue(null); // Note doesn't exist

			const mockFile = new MockFile('WeWe RSS/Test Feed/TypeScript 在现代前端开发中的应用.md');
			mockVault.create.mockResolvedValue(mockFile);

			const article = toArticle(sampleArticle1, 1);
			const feed = { ...sampleFeed1, id: 1 } as Feed;

			const result = await noteCreator.createNoteFromArticle(article, feed);

			expect(result).toBeTruthy();
			expect(mockVault.create).toHaveBeenCalled();
			expect(mockVault.createFolder).toHaveBeenCalled();
		});

		it('should return existing file if note already exists', async () => {
			const existingFile = createMockTFile('WeWe RSS/Test Feed/TypeScript 在现代前端开发中的应用.md');

			mockVault.getAbstractFileByPath.mockReturnValue(existingFile);

			const article = toArticle(sampleArticle1, 1);
			const feed = { ...sampleFeed1, id: 1 } as Feed;

			const result = await noteCreator.createNoteFromArticle(article, feed);

			expect(result).toBe(existingFile);
			expect(mockVault.create).not.toHaveBeenCalled();
		});

		it('should use custom template from settings', async () => {
			mockVault.getAbstractFileByPath.mockReturnValue(null);
			mockVault.create.mockResolvedValue({ path: 'test.md' });

			const customTemplate = '# {{title}}\n{{content}}';
			mockPlugin.settings.noteTemplate = customTemplate;

			const article = toArticle(sampleArticle1, 1);
			const feed = { ...sampleFeed1, id: 1 } as Feed;

			await noteCreator.createNoteFromArticle(article, feed);

			const createCall = mockVault.create.mock.calls[0];
			const content = createCall[1];

			expect(content).toContain(`# ${article.title}`);
			expect(content).toContain(article.content);
		});

		it('should handle errors gracefully', async () => {
			mockVault.getAbstractFileByPath.mockImplementation(() => {
				throw new Error('Vault error');
			});

			const article = toArticle(sampleArticle1, 1);
			const feed = { ...sampleFeed1, id: 1 } as Feed;

			const result = await noteCreator.createNoteFromArticle(article, feed);

			expect(result).toBeNull();
		});

		it('should respect addTags setting', async () => {
			mockVault.getAbstractFileByPath.mockReturnValue(null);
			mockVault.create.mockResolvedValue({ path: 'test.md' });

			mockPlugin.settings.addTags = false;

			const article = toArticle(sampleArticle1, 1);
			const feed = { ...sampleFeed1, id: 1 } as Feed;

			await noteCreator.createNoteFromArticle(article, feed);

			const createCall = mockVault.create.mock.calls[0];
			const content = createCall[1];

			// Should not have tags when addTags is false
			expect(content).toContain('tags: ');
		});
	});

	describe('createNotesFromArticles', () => {
		it('should create notes for multiple articles', async () => {
			mockVault.getAbstractFileByPath.mockReturnValue(null);
			mockVault.create.mockResolvedValue({ path: 'test.md' });
			mockVault.getMarkdownFiles.mockReturnValue([]);

			const articles = [
				toArticle(sampleArticle1, 1),
				toArticle(sampleArticle2, 2),
			];

			const feedsMap = new Map<number, Feed>([
				[1, { ...sampleFeed1, id: 1 } as Feed],
			]);

			const result = await noteCreator.createNotesFromArticles(articles, feedsMap);

			expect(result.created).toBe(2);
			expect(result.skipped).toBe(0);
			expect(result.failed).toBe(0);
			expect(mockVault.create).toHaveBeenCalledTimes(2);
		});

		it('should skip existing notes', async () => {
			const existingFile = createMockTFile('existing.md');

			// When createNoteFromArticle checks if file exists, return the existing file
			mockVault.getAbstractFileByPath.mockReturnValue(existingFile);

			// When findExistingNoteId searches for the note, return it
			mockVault.getMarkdownFiles.mockReturnValue([existingFile]);
			mockVault.read.mockResolvedValue('content with ' + sampleArticle1.url);

			const articles = [toArticle(sampleArticle1, 1)];
			const feedsMap = new Map<number, Feed>([[1, { ...sampleFeed1, id: 1 } as Feed]]);

			const result = await noteCreator.createNotesFromArticles(articles, feedsMap);

			expect(result.skipped).toBe(1);
			expect(result.created).toBe(0);
		});

		it('should track failed note creations', async () => {
			mockVault.getAbstractFileByPath.mockImplementation(() => {
				throw new Error('Vault error');
			});

			const articles = [toArticle(sampleArticle1, 1)];
			const feedsMap = new Map<number, Feed>([[1, { ...sampleFeed1, id: 1 } as Feed]]);

			const result = await noteCreator.createNotesFromArticles(articles, feedsMap);

			expect(result.failed).toBe(1);
			expect(result.created).toBe(0);
		});

		it('should handle articles with missing feed', async () => {
			const articles = [{ ...sampleArticle1, id: 1, feedId: 999 } as Article];
			const feedsMap = new Map<number, Feed>();

			const result = await noteCreator.createNotesFromArticles(articles, feedsMap);

			expect(result.failed).toBe(1);
			expect(mockVault.create).not.toHaveBeenCalled();
		});

		it('should update article note_id after creation', async () => {
			mockVault.getAbstractFileByPath.mockReturnValue(null);
			mockVault.create.mockResolvedValue({ path: 'test.md' });
			mockVault.getMarkdownFiles.mockReturnValue([]);

			const articles = [toArticle(sampleArticle1, 1)];
			const feedsMap = new Map<number, Feed>([[1, { ...sampleFeed1, id: 1 } as Feed]]);

			await noteCreator.createNotesFromArticles(articles, feedsMap);

			expect(mockDatabaseService.articles.update).toHaveBeenCalledWith(1, {
				noteId: 'test.md',
				synced: true,
			});
		});
	});

	describe('generateNotePath', () => {
		it('should generate note path from article and feed', () => {
			const article = toArticle(sampleArticle1, 1);
			const feed = { ...sampleFeed1, id: 1 } as Feed;

			// Access private method through type assertion
			const path = (noteCreator as any).generateNotePath(article, feed, 'WeWe RSS');

			expect(path).toBe('WeWe RSS/技术博客/TypeScript 在现代前端开发中的应用.md');
		});

		it('should sanitize feed name in path', () => {
			const article = toArticle(sampleArticle1, 1);
			const feed = { ...sampleFeed1, id: 1, title: 'Feed/With:Special*Chars?' } as Feed;

			const path = (noteCreator as any).generateNotePath(article, feed, 'WeWe RSS');

			// Should replace invalid filename characters with hyphens
			expect(path).toContain('Feed-With-Special-Chars');
			// Extract just the feed folder name (between first and second /)
			const parts = path.split('/');
			const feedFolderName = parts[1]; // Should be sanitized feed title
			// Feed folder should not contain invalid filename characters (excluding path separator /)
			expect(feedFolderName).not.toMatch(/[\\:*?"<>|]/);
		});

		it('should sanitize article title in filename', () => {
			const article = {
				...sampleArticle1,
				id: 1,
				title: 'Title/With\\Invalid|Chars<>',
			} as Article;
			const feed = { ...sampleFeed1, id: 1 } as Feed;

			const path = (noteCreator as any).generateNotePath(article, feed, 'WeWe RSS');

			expect(path).toContain('.md');
			expect(path).not.toContain('\\');
			expect(path).not.toContain('|');
			expect(path).not.toContain('<');
			expect(path).not.toContain('>');
		});
	});

	describe('generateNoteContent', () => {
		it('should replace template variables', () => {
			const template = '# {{title}}\nFeed: {{feedName}}\nPublished: {{publishedAt}}\n{{content}}';

			const article = {
				...sampleArticle1,
				id: 1,
				title: 'Test Title',
				content: 'Test content',
			} as Article;

			const metadata = {
				title: article.title,
				feedName: 'Test Feed',
				publishedAt: '2024-01-01 12:00:00',
				url: 'https://test.com',
				tags: ['tag1', 'tag2'],
			};

			const content = (noteCreator as any).generateNoteContent(article, metadata, template);

			expect(content).toContain('# Test Title');
			expect(content).toContain('Feed: Test Feed');
			expect(content).toContain('Published: 2024-01-01 12:00:00');
			expect(content).toContain('Test content');
		});

		it('should replace all template variables including tags', () => {
			const template = 'Tags: {{tags}}\nURL: {{url}}\nDate: {{date}}';

			const article = toArticle(sampleArticle1, 1);
			const metadata = {
				title: 'Test',
				feedName: 'Feed',
				publishedAt: '2024-01-01',
				url: 'https://test.com',
				tags: ['wewe-rss', 'tech'],
			};

			const content = (noteCreator as any).generateNoteContent(article, metadata, template);

			expect(content).toContain('Tags: #wewe-rss #tech');
			expect(content).toContain('URL: https://test.com');
			expect(content).toMatch(/Date: \d{4}-\d{2}-\d{2}/);
		});

		it('should handle missing author', () => {
			const template = 'Author: {{author}}';

			const article = toArticle(sampleArticle1, 1);
			const metadata = {
				title: 'Test',
				feedName: 'Feed',
				publishedAt: '2024-01-01',
				url: 'https://test.com',
				tags: [],
			};

			const content = (noteCreator as any).generateNoteContent(article, metadata, template);

			expect(content).toContain('Author: Unknown');
		});

		it('should handle empty tags array', () => {
			const template = 'Tags: {{tags}}';

			const article = toArticle(sampleArticle1, 1);
			const metadata = {
				title: 'Test',
				feedName: 'Feed',
				publishedAt: '2024-01-01',
				url: 'https://test.com',
				tags: [],
			};

			const content = (noteCreator as any).generateNoteContent(article, metadata, template);

			expect(content).toBe('Tags: ');
		});
	});

	describe('extractTags', () => {
		it('should extract tags from feed title', () => {
			const tags = (noteCreator as any).extractTags('Tech Blog');

			expect(tags).toContain('wewe-rss');
			expect(tags).toContain('tech-blog');
		});

		it('should remove special characters from tags', () => {
			const tags = (noteCreator as any).extractTags('Blog@2024!');

			expect(tags.every((tag: string) => /^[a-z0-9-]+$/.test(tag))).toBe(true);
		});

		it('should replace spaces with hyphens', () => {
			const tags = (noteCreator as any).extractTags('My Tech Blog');

			expect(tags).toContain('my-tech-blog');
		});

		it('should handle Chinese characters', () => {
			const tags = (noteCreator as any).extractTags('技术博客');

			expect(tags).toContain('技术博客');
		});

		it('should convert to lowercase', () => {
			const tags = (noteCreator as any).extractTags('TechBlog');

			expect(tags).toContain('techblog');
		});

		it('should always include wewe-rss tag', () => {
			const tags = (noteCreator as any).extractTags('Any Feed Name');

			expect(tags).toContain('wewe-rss');
		});
	});

	describe('ensureFolderExists', () => {
		it('should create folder if it does not exist', async () => {
			mockVault.getAbstractFileByPath.mockReturnValue(null);

			await (noteCreator as any).ensureFolderExists('WeWe RSS/Test Feed/note.md');

			expect(mockVault.createFolder).toHaveBeenCalledWith('WeWe RSS/Test Feed');
		});

		it('should not create folder if it already exists', async () => {
			const existingFolder = createMockTFolder('WeWe RSS/Test Feed');
			mockVault.getAbstractFileByPath.mockReturnValue(existingFolder);

			await (noteCreator as any).ensureFolderExists('WeWe RSS/Test Feed/note.md');

			expect(mockVault.createFolder).not.toHaveBeenCalled();
		});

		it('should throw error if path exists but is not a folder', async () => {
			const existingFile = createMockTFile("");
			mockVault.getAbstractFileByPath.mockReturnValue(existingFile);

			await expect(
				(noteCreator as any).ensureFolderExists('WeWe RSS/Test Feed/note.md')
			).rejects.toThrow('Path exists but is not a folder');
		});

		it('should handle paths without folders', async () => {
			await expect((noteCreator as any).ensureFolderExists('note.md')).resolves.not.toThrow();

			expect(mockVault.createFolder).not.toHaveBeenCalled();
		});
	});

	describe('findExistingNoteId', () => {
		it('should find existing note by URL', async () => {
			const mockFile = createMockTFile("");
			mockFile.path = 'test.md';

			mockVault.getMarkdownFiles.mockReturnValue([mockFile]);
			mockVault.read.mockResolvedValue('Content with https://test.com/article');

			const result = await (noteCreator as any).findExistingNoteId('https://test.com/article');

			expect(result).toBe('test.md');
		});

		it('should return null if no note contains URL', async () => {
			const mockFile = createMockTFile("");
			mockFile.path = 'test.md';

			mockVault.getMarkdownFiles.mockReturnValue([mockFile]);
			mockVault.read.mockResolvedValue('Content without URL');

			const result = await (noteCreator as any).findExistingNoteId('https://test.com/missing');

			expect(result).toBeNull();
		});

		it('should search through multiple files', async () => {
			const file1 = createMockTFile("");
			file1.path = 'file1.md';
			const file2 = createMockTFile("");
			file2.path = 'file2.md';

			mockVault.getMarkdownFiles.mockReturnValue([file1, file2]);
			mockVault.read
				.mockResolvedValueOnce('No URL here')
				.mockResolvedValueOnce('Has https://test.com/article URL');

			const result = await (noteCreator as any).findExistingNoteId('https://test.com/article');

			expect(result).toBe('file2.md');
		});
	});

	describe('deleteNote', () => {
		it('should delete existing note', async () => {
			const mockFile = createMockTFile("");
			mockFile.path = 'test.md';

			mockVault.getAbstractFileByPath.mockReturnValue(mockFile);

			const result = await noteCreator.deleteNote('test.md');

			expect(result).toBe(true);
			expect(mockVault.delete).toHaveBeenCalledWith(mockFile);
		});

		it('should return false if note does not exist', async () => {
			mockVault.getAbstractFileByPath.mockReturnValue(null);

			const result = await noteCreator.deleteNote('nonexistent.md');

			expect(result).toBe(false);
			expect(mockVault.delete).not.toHaveBeenCalled();
		});

		it('should return false if path is not a file', async () => {
			const mockFolder = createMockTFolder("");
			mockVault.getAbstractFileByPath.mockReturnValue(mockFolder);

			const result = await noteCreator.deleteNote('folder');

			expect(result).toBe(false);
		});

		it('should handle deletion errors', async () => {
			const mockFile = createMockTFile("");
			mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
			mockVault.delete.mockRejectedValue(new Error('Delete failed'));

			const result = await noteCreator.deleteNote('test.md');

			expect(result).toBe(false);
		});
	});

	describe('updateNote', () => {
		it('should update existing note content', async () => {
			const mockFile = createMockTFile("");
			mockFile.path = 'test.md';

			mockVault.getAbstractFileByPath.mockReturnValue(mockFile);

			const result = await noteCreator.updateNote('test.md', 'New content');

			expect(result).toBe(true);
			expect(mockVault.modify).toHaveBeenCalledWith(mockFile, 'New content');
		});

		it('should return false if note does not exist', async () => {
			mockVault.getAbstractFileByPath.mockReturnValue(null);

			const result = await noteCreator.updateNote('nonexistent.md', 'Content');

			expect(result).toBe(false);
			expect(mockVault.modify).not.toHaveBeenCalled();
		});

		it('should return false if path is not a file', async () => {
			const mockFolder = createMockTFolder("");
			mockVault.getAbstractFileByPath.mockReturnValue(mockFolder);

			const result = await noteCreator.updateNote('folder', 'Content');

			expect(result).toBe(false);
		});

		it('should handle update errors', async () => {
			const mockFile = createMockTFile("");
			mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
			mockVault.modify.mockRejectedValue(new Error('Update failed'));

			const result = await noteCreator.updateNote('test.md', 'Content');

			expect(result).toBe(false);
		});
	});

	describe('getNote', () => {
		it('should return note file if exists', () => {
			const mockFile = createMockTFile("");
			mockFile.path = 'test.md';

			mockVault.getAbstractFileByPath.mockReturnValue(mockFile);

			const result = noteCreator.getNote('test.md');

			expect(result).toBe(mockFile);
		});

		it('should return null if note does not exist', () => {
			mockVault.getAbstractFileByPath.mockReturnValue(null);

			const result = noteCreator.getNote('nonexistent.md');

			expect(result).toBeNull();
		});

		it('should return null if path is not a file', () => {
			const mockFolder = createMockTFolder("");
			mockVault.getAbstractFileByPath.mockReturnValue(mockFolder);

			const result = noteCreator.getNote('folder');

			expect(result).toBeNull();
		});
	});

	describe('noteExists', () => {
		it('should return true if note exists', () => {
			const mockFile = createMockTFile("");
			mockVault.getAbstractFileByPath.mockReturnValue(mockFile);

			const result = noteCreator.noteExists('test.md');

			expect(result).toBe(true);
		});

		it('should return false if note does not exist', () => {
			mockVault.getAbstractFileByPath.mockReturnValue(null);

			const result = noteCreator.noteExists('nonexistent.md');

			expect(result).toBe(false);
		});

		it('should return false if path is not a file', () => {
			const mockFolder = createMockTFolder("");
			mockVault.getAbstractFileByPath.mockReturnValue(mockFolder);

			const result = noteCreator.noteExists('folder');

			expect(result).toBe(false);
		});
	});

	describe('edge cases', () => {
		it('should handle very long article titles', async () => {
			mockVault.getAbstractFileByPath.mockReturnValue(null);
			mockVault.create.mockResolvedValue({ path: 'test.md' });

			const longTitle = 'A'.repeat(300);
			const article = { ...sampleArticle1, id: 1, title: longTitle } as Article;
			const feed = { ...sampleFeed1, id: 1 } as Feed;

			const result = await noteCreator.createNoteFromArticle(article, feed);

			expect(result).toBeDefined();
			expect(mockVault.create).toHaveBeenCalled();
		});

		it('should handle Unicode characters in paths', async () => {
			mockVault.getAbstractFileByPath.mockReturnValue(null);
			mockVault.create.mockResolvedValue({ path: 'test.md' });

			const article = { ...sampleArticle1, id: 1, title: '测试文章 🚀' } as Article;
			const feed = { ...sampleFeed1, id: 1, title: '中文Feed' } as Feed;

			const result = await noteCreator.createNoteFromArticle(article, feed);

			expect(result).toBeDefined();
			expect(mockVault.create).toHaveBeenCalled();
		});

		it('should handle empty template', async () => {
			mockVault.getAbstractFileByPath.mockReturnValue(null);
			mockVault.create.mockResolvedValue({ path: 'test.md' });

			mockPlugin.settings.noteTemplate = '';

			const article = toArticle(sampleArticle1, 1);
			const feed = { ...sampleFeed1, id: 1 } as Feed;

			const result = await noteCreator.createNoteFromArticle(article, feed);

			expect(result).toBeDefined();
		});
	});
});
