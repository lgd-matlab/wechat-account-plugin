/**
 * Unit tests for ArticleRepository
 * Tests all article database operations
 */

import { Database } from 'sql.js';
import { ArticleRepository } from '../../../services/database/repositories/ArticleRepository';
import { DatabaseService } from '../../../services/database/DatabaseService';
import {
	createMockDatabase,
	insertAccount,
	insertFeed,
	insertArticle,
	seedDatabaseWith,
	getAllRows,
	countRows,
} from '../../mocks/database';
import {
	sampleArticle1,
	sampleArticle2,
	sampleArticle3,
	sampleArticleSynced,
	sampleArticleUnsynced,
	createSampleArticle,
} from '../../fixtures/sample-articles';
import { sampleAccount1 } from '../../fixtures/sample-accounts';
import { sampleFeed1, sampleFeed2 } from '../../fixtures/sample-feeds';

describe('ArticleRepository', () => {
	let db: Database;
	let dbService: DatabaseService;
	let repository: ArticleRepository;

	beforeEach(async () => {
		db = await createMockDatabase();

		// Create mock plugin
		const mockPlugin = {
			manifest: { dir: '.obsidian/plugins/wewe-rss' },
			app: { vault: { adapter: { exists: jest.fn(), readBinary: jest.fn(), writeBinary: jest.fn() } } },
		} as any;

		dbService = new DatabaseService(mockPlugin);
		(dbService as any).db = db;
		(dbService as any).initialized = true;
		repository = new ArticleRepository(dbService);

		// Insert required account and feeds for foreign keys
		insertAccount(db, sampleAccount1);
		insertFeed(db, sampleFeed1);
		insertFeed(db, sampleFeed2);
	});

	afterEach(() => {
		if (db) {
			db.close();
		}
	});

	describe('create', () => {
		it('should create a new article', async () => {
			const article = await repository.create(
				sampleFeed1.id,
				'Test Article',
				'# Test\n\nContent',
				'<h1>Test</h1><p>Content</p>',
				'https://example.com/article',
				Date.now()
			);

			expect(article).toBeDefined();
			expect(article.id).toBeDefined();
			expect(article.title).toBe('Test Article');
			expect(article.synced).toBe(false);
		});

		it('should persist article to database', async () => {
			await repository.create(
				sampleFeed1.id,
				'Test',
				'Content',
				'<p>Content</p>',
				'https://example.com/test',
				Date.now()
			);

			const rows = getAllRows(db, 'articles');
			expect(rows).toHaveLength(1);
		});

		it('should return existing article if URL already exists', async () => {
			insertArticle(db, sampleArticle1);

			const article = await repository.create(
				sampleFeed1.id,
				'Different Title',
				'Different Content',
				'<p>Different</p>',
				sampleArticle1.url,
				Date.now()
			);

			expect(article.id).toBeDefined();
			expect(article.title).toBe(sampleArticle1.title); // Original title
			expect(article.url).toBe(sampleArticle1.url); // Same URL
			expect(countRows(db, 'articles')).toBe(1);
		});
	});

	describe('createBatch', () => {
		it('should insert multiple articles in a transaction', async () => {
			const articles = [
				{
					feedId: sampleFeed1.id,
					title: 'Article 1',
					content: 'Content 1',
					contentHtml: '<p>Content 1</p>',
					url: 'https://example.com/1',
					publishedAt: Date.now(),
				},
				{
					feedId: sampleFeed1.id,
					title: 'Article 2',
					content: 'Content 2',
					contentHtml: '<p>Content 2</p>',
					url: 'https://example.com/2',
					publishedAt: Date.now(),
				},
			];

			const count = await repository.createBatch(articles);

			expect(count).toBe(2);
			expect(countRows(db, 'articles')).toBe(2);
		});

		it('should skip existing articles by URL', async () => {
			insertArticle(db, sampleArticle1);

			const articles = [
				{
					feedId: sampleFeed1.id,
					title: 'Duplicate',
					content: 'Content',
					contentHtml: '<p>Content</p>',
					url: sampleArticle1.url, // Duplicate URL
					publishedAt: Date.now(),
				},
				{
					feedId: sampleFeed1.id,
					title: 'New Article',
					content: 'New Content',
					contentHtml: '<p>New</p>',
					url: 'https://example.com/new',
					publishedAt: Date.now(),
				},
			];

			const count = await repository.createBatch(articles);

			expect(count).toBe(1); // Only inserted the new one
			expect(countRows(db, 'articles')).toBe(2); // 1 existing + 1 new
		});

		it('should return 0 for empty array', async () => {
			const count = await repository.createBatch([]);

			expect(count).toBe(0);
		});
	});

	describe('findAll', () => {
		it('should return all articles ordered by published date', () => {
			insertArticle(db, sampleArticle1);
			insertArticle(db, sampleArticle2);
			insertArticle(db, sampleArticle3);

			const articles = repository.findAll();

			expect(articles).toHaveLength(3);
			// Should be ordered newest first
			expect(articles[0].publishedAt).toBeGreaterThanOrEqual(articles[1].publishedAt);
		});

		it('should return empty array when no articles exist', () => {
			const articles = repository.findAll();

			expect(articles).toEqual([]);
		});
	});

	describe('findById', () => {
		it('should find article by ID', () => {
			insertArticle(db, sampleArticle1);

			// Get the auto-generated ID from the database
			const articles = repository.findAll();
			expect(articles).toHaveLength(1);
			const insertedId = articles[0].id;

			const article = repository.findById(insertedId);

			expect(article).toBeDefined();
			expect(article?.title).toBe(sampleArticle1.title);
		});

		it('should return null for non-existent ID', () => {
			const article = repository.findById(99999);

			expect(article).toBeNull();
		});
	});

	describe('findByUrl', () => {
		it('should find article by URL', () => {
			insertArticle(db, sampleArticle1);

			const article = repository.findByUrl(sampleArticle1.url);

			expect(article).toBeDefined();
			expect(article?.id).toBeDefined();
			expect(article?.title).toBe(sampleArticle1.title);
		});

		it('should return null for non-existent URL', () => {
			const article = repository.findByUrl('https://nonexistent.com/article');

			expect(article).toBeNull();
		});
	});

	describe('findByFeedId', () => {
		it('should find articles by feed ID', () => {
			insertArticle(db, sampleArticle1); // feed1
			insertArticle(db, sampleArticle2); // feed1
			insertArticle(db, sampleArticle3); // feed2

			const articles = repository.findByFeedId(sampleFeed1.id);

			expect(articles).toHaveLength(2);
			expect(articles.every(a => a.feedId === sampleFeed1.id)).toBe(true);
		});

		it('should respect limit parameter', () => {
			insertArticle(db, sampleArticle1);
			insertArticle(db, sampleArticle2);

			const articles = repository.findByFeedId(sampleFeed1.id, 1);

			expect(articles).toHaveLength(1);
		});

		it('should return empty array for feed with no articles', () => {
			const articles = repository.findByFeedId(sampleFeed1.id);

			expect(articles).toEqual([]);
		});
	});

	describe('findUnsynced', () => {
		it('should find unsynced articles', () => {
			insertArticle(db, sampleArticleSynced);
			insertArticle(db, sampleArticleUnsynced);

			const articles = repository.findUnsynced();

			expect(articles).toHaveLength(1);
			expect(articles[0].synced).toBe(false);
		});

		it('should respect limit parameter', () => {
			insertArticle(db, sampleArticleUnsynced);
			insertArticle(db, { ...sampleArticleUnsynced, id: 2, url: 'http://test2.com' });

			const articles = repository.findUnsynced(1);

			expect(articles).toHaveLength(1);
		});

		it('should return empty array when all articles are synced', () => {
			insertArticle(db, sampleArticleSynced);

			const articles = repository.findUnsynced();

			expect(articles).toEqual([]);
		});
	});

	describe('findUnsyncedByFeed', () => {
		it('should find unsynced articles for specific feed', () => {
			insertArticle(db, sampleArticleUnsynced); // feed2, unsynced
			insertArticle(db, sampleArticleSynced); // feed1, synced

			const articles = repository.findUnsyncedByFeed(sampleFeed2.id);

			expect(articles).toHaveLength(1);
			expect(articles[0].feedId).toBe(sampleFeed2.id);
			expect(articles[0].synced).toBe(false);
		});

		it('should respect limit parameter', () => {
			insertArticle(db, sampleArticleUnsynced);
			insertArticle(db, {
				...sampleArticleUnsynced,
				url: 'http://test2.com',
				feed_id: sampleFeed2.id,
			});

			const articles = repository.findUnsyncedByFeed(sampleFeed2.id, 1);

			expect(articles).toHaveLength(1);
		});
	});

	describe('findRecent', () => {
		it('should find recent articles with default limit', () => {
			insertArticle(db, sampleArticle1);
			insertArticle(db, sampleArticle2);
			insertArticle(db, sampleArticle3);

			const articles = repository.findRecent();

			expect(articles).toHaveLength(3);
		});

		it('should respect custom limit', () => {
			insertArticle(db, sampleArticle1);
			insertArticle(db, sampleArticle2);
			insertArticle(db, sampleArticle3);

			const articles = repository.findRecent(2);

			expect(articles).toHaveLength(2);
		});

		it('should order by published date (newest first)', () => {
			const older = createSampleArticle({ published_at: 1000 });
			const newer = createSampleArticle({ published_at: 2000, id: 2, url: 'http://newer.com' });

			insertArticle(db, older);
			insertArticle(db, newer);

			const articles = repository.findRecent();

			expect(articles[0].publishedAt).toBe(2000);
			expect(articles[1].publishedAt).toBe(1000);
		});
	});

	describe('searchByTitle', () => {
		it('should search articles by title keyword', () => {
			insertArticle(db, sampleArticle1); // Contains "TypeScript"
			insertArticle(db, sampleArticle2); // Contains "Obsidian"

			const articles = repository.searchByTitle('TypeScript');

			expect(articles).toHaveLength(1);
			expect(articles[0].title).toContain('TypeScript');
		});

		it('should be case-insensitive', () => {
			insertArticle(db, sampleArticle1);

			const articles = repository.searchByTitle('typescript'); // lowercase

			expect(articles).toHaveLength(1);
		});

		it('should support partial matching', () => {
			insertArticle(db, sampleArticle1); // "TypeScript 在现代前端开发中的应用"

			const articles = repository.searchByTitle('前端');

			expect(articles).toHaveLength(1);
		});

		it('should respect limit parameter', () => {
			insertArticle(db, sampleArticle1);
			insertArticle(db, sampleArticle2);

			const articles = repository.searchByTitle('', 1); // Empty search matches all

			expect(articles.length).toBeLessThanOrEqual(1);
		});
	});

	describe('markAsSynced', () => {
		it('should mark article as synced with note ID', () => {
			insertArticle(db, sampleArticleUnsynced);
			const articles = repository.findAll();
			const insertedId = articles[0].id;

			repository.markAsSynced(insertedId, 'note-123.md');

			const article = repository.findById(insertedId);
			expect(article?.synced).toBe(true);
			expect(article?.noteId).toBe('note-123.md');
		});

		it('should update synced status in database', () => {
			insertArticle(db, sampleArticleUnsynced);
			const articles = repository.findAll();
			const insertedId = articles[0].id;

			repository.markAsSynced(insertedId, 'note.md');

			const rows = getAllRows(db, 'articles');
			expect(rows[0].synced).toBe(1);
			expect(rows[0].note_id).toBe('note.md');
		});
	});

	describe('markBatchAsSynced', () => {
		it('should mark multiple articles as synced', () => {
			insertArticle(db, sampleArticle1);
			insertArticle(db, sampleArticle2);

			const articles = repository.findAll();
			const ids = articles.map(a => a.id);

			repository.markBatchAsSynced(ids);

			const article1 = repository.findById(ids[0]);
			const article2 = repository.findById(ids[1]);

			expect(article1?.synced).toBe(true);
			expect(article2?.synced).toBe(true);
		});

		it('should do nothing for empty array', () => {
			expect(() => repository.markBatchAsSynced([])).not.toThrow();
		});
	});

	describe('update', () => {
		it('should update article title', () => {
			insertArticle(db, sampleArticle1);
			const articles = repository.findAll();
			const insertedId = articles[0].id;

			repository.update(insertedId, { title: 'Updated Title' });

			const article = repository.findById(insertedId);
			expect(article?.title).toBe('Updated Title');
		});

		it('should update multiple fields', () => {
			insertArticle(db, sampleArticle1);
			const articles = repository.findAll();
			const insertedId = articles[0].id;

			repository.update(insertedId, {
				title: 'New Title',
				content: 'New Content',
				synced: true,
				noteId: 'note.md',
			});

			const article = repository.findById(insertedId);
			expect(article?.title).toBe('New Title');
			expect(article?.content).toBe('New Content');
			expect(article?.synced).toBe(true);
			expect(article?.noteId).toBe('note.md');
		});

		it('should do nothing when no updates provided', () => {
			insertArticle(db, sampleArticle1);
			const articles = repository.findAll();
			const insertedId = articles[0].id;
			const before = repository.findById(insertedId);

			repository.update(insertedId, {});

			const after = repository.findById(insertedId);
			expect(after).toEqual(before);
		});
	});

	describe('updateContent', () => {
		it('should update article content and contentHtml', () => {
			insertArticle(db, sampleArticle1);
			const articles = repository.findAll();
			const insertedId = articles[0].id;

			repository.updateContent(
				insertedId,
				'New markdown content',
				'<p>New HTML content</p>'
			);

			const article = repository.findById(insertedId);
			expect(article?.content).toBe('New markdown content');
			expect(article?.contentHtml).toBe('<p>New HTML content</p>');
		});
	});

	describe('delete', () => {
		it('should delete article by ID', () => {
			insertArticle(db, sampleArticle1);
			expect(countRows(db, 'articles')).toBe(1);

			const articles = repository.findAll();
			const insertedId = articles[0].id;

			repository.delete(insertedId);

			expect(countRows(db, 'articles')).toBe(0);
		});

		it('should not throw error when deleting non-existent article', () => {
			expect(() => repository.delete(99999)).not.toThrow();
		});
	});

	describe('deleteByFeedId', () => {
		it('should delete all articles for a feed', () => {
			insertArticle(db, sampleArticle1); // feed1
			insertArticle(db, sampleArticle2); // feed1
			insertArticle(db, sampleArticle3); // feed2

			repository.deleteByFeedId(sampleFeed1.id);

			expect(countRows(db, 'articles')).toBe(1);
			const remaining = repository.findAll();
			expect(remaining[0].feedId).toBe(sampleFeed2.id);
		});
	});

	describe('deleteOlderThan', () => {
		it('should delete articles published before threshold', () => {
			const old = createSampleArticle({ published_at: 1000 });
			const recent = createSampleArticle({
				published_at: Date.now(),
				url: 'http://recent.com',
			});

			insertArticle(db, old);
			insertArticle(db, recent);

			const count = repository.deleteOlderThan(2000);

			expect(count).toBe(1);
			expect(countRows(db, 'articles')).toBe(1);
			const remaining = repository.findAll();
			expect(remaining[0].url).toBe('http://recent.com');
		});

		it('should return 0 when no articles match threshold', () => {
			insertArticle(db, sampleArticle1);

			const count = repository.deleteOlderThan(1000);

			expect(count).toBe(0);
		});
	});

	describe('cleanupSynced', () => {
		it('should cleanup old synced articles', () => {
			const oldSynced = createSampleArticle({
				published_at: Date.now() - 60 * 24 * 60 * 60 * 1000, // 60 days ago
				synced: 1,
			});
			const recentSynced = createSampleArticle({
				published_at: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10 days ago
				synced: 1,
				id: 2,
				url: 'http://recent.com',
			});

			insertArticle(db, oldSynced);
			insertArticle(db, recentSynced);

			const count = repository.cleanupSynced(30); // 30 days threshold

			expect(count).toBe(1);
			expect(countRows(db, 'articles')).toBe(1);
		});

		it('should not delete unsynced articles', () => {
			const oldUnsynced = createSampleArticle({
				published_at: Date.now() - 60 * 24 * 60 * 60 * 1000,
				synced: 0,
			});

			insertArticle(db, oldUnsynced);

			const count = repository.cleanupSynced(30);

			expect(count).toBe(0);
			expect(countRows(db, 'articles')).toBe(1);
		});
	});

	describe('count', () => {
		it('should return 0 when no articles exist', () => {
			const count = repository.count();

			expect(count).toBe(0);
		});

		it('should return correct count of articles', () => {
			insertArticle(db, sampleArticle1);
			insertArticle(db, sampleArticle2);
			insertArticle(db, sampleArticle3);

			const count = repository.count();

			expect(count).toBe(3);
		});
	});

	describe('countByFeed', () => {
		it('should count articles by feed', () => {
			insertArticle(db, sampleArticle1); // feed1
			insertArticle(db, sampleArticle2); // feed1
			insertArticle(db, sampleArticle3); // feed2

			expect(repository.countByFeed(sampleFeed1.id)).toBe(2);
			expect(repository.countByFeed(sampleFeed2.id)).toBe(1);
		});
	});

	describe('countUnsynced', () => {
		it('should count unsynced articles', () => {
			insertArticle(db, sampleArticleSynced);
			insertArticle(db, sampleArticleUnsynced);

			const count = repository.countUnsynced();

			expect(count).toBe(1);
		});

		it('should return 0 when all articles are synced', () => {
			insertArticle(db, sampleArticleSynced);

			const count = repository.countUnsynced();

			expect(count).toBe(0);
		});
	});

	describe('countArticlesOlderThan', () => {
		it('should count articles older than specified days', () => {
			const old = createSampleArticle({
				published_at: Date.now() - 60 * 24 * 60 * 60 * 1000, // 60 days ago
			});
			const recent = createSampleArticle({
				published_at: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10 days ago
				id: 2,
				url: 'http://recent.com',
			});

			insertArticle(db, old);
			insertArticle(db, recent);

			const count = repository.countArticlesOlderThan(30);

			expect(count).toBe(1); // Only the 60-day-old article
		});

		it('should return 0 when no old articles exist', () => {
			const recent = createSampleArticle({
				published_at: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
			});

			insertArticle(db, recent);

			const count = repository.countArticlesOlderThan(30);

			expect(count).toBe(0);
		});

		it('should count all articles when all are old', () => {
			const old1 = createSampleArticle({
				published_at: Date.now() - 60 * 24 * 60 * 60 * 1000,
			});
			const old2 = createSampleArticle({
				published_at: Date.now() - 45 * 24 * 60 * 60 * 1000,
				id: 2,
				url: 'http://old2.com',
			});

			insertArticle(db, old1);
			insertArticle(db, old2);

			const count = repository.countArticlesOlderThan(30);

			expect(count).toBe(2);
		});

		it('should return 0 for empty database', () => {
			const count = repository.countArticlesOlderThan(30);

			expect(count).toBe(0);
		});

		it('should handle 1 day retention period', () => {
			const old = createSampleArticle({
				published_at: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
			});

			insertArticle(db, old);

			const count = repository.countArticlesOlderThan(1);

			expect(count).toBe(1);
		});

		it('should handle 365 day retention period', () => {
			const veryOld = createSampleArticle({
				published_at: Date.now() - 400 * 24 * 60 * 60 * 1000, // 400 days ago
			});
			const old = createSampleArticle({
				published_at: Date.now() - 300 * 24 * 60 * 60 * 1000, // 300 days ago
				id: 2,
				url: 'http://old.com',
			});

			insertArticle(db, veryOld);
			insertArticle(db, old);

			const count = repository.countArticlesOlderThan(365);

			expect(count).toBe(1); // Only 400-day-old article
		});
	});

	describe('getStats', () => {
		it('should return article statistics', () => {
			insertArticle(db, sampleArticle1); // feed1, unsynced
			insertArticle(db, sampleArticle2); // feed1, unsynced
			insertArticle(db, sampleArticleSynced); // feed1, synced

			const stats = repository.getStats();

			expect(stats.total).toBe(3);
			expect(stats.synced).toBe(1);
			expect(stats.unsynced).toBe(2);
			expect(stats.byFeed).toHaveLength(1);
			expect(stats.byFeed[0].feedId).toBe(sampleFeed1.id);
			expect(stats.byFeed[0].count).toBe(3);
		});

		it('should return empty stats when no articles exist', () => {
			const stats = repository.getStats();

			expect(stats.total).toBe(0);
			expect(stats.synced).toBe(0);
			expect(stats.unsynced).toBe(0);
			expect(stats.byFeed).toEqual([]);
		});
	});
});
