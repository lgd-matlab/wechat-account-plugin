/**
 * Unit tests for FeedRepository
 * Tests all feed database operations
 */

import { Database } from 'sql.js';
import { FeedRepository } from '../../../services/database/repositories/FeedRepository';
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
	sampleFeed1,
	sampleFeed2,
	sampleFeed3,
	sampleFeedStale,
	sampleFeedActive,
	sampleFeedWithBlacklistedAccount,
} from '../../fixtures/sample-feeds';
import { sampleAccount1, sampleAccount2 } from '../../fixtures/sample-accounts';
import { sampleArticle1, sampleArticle2, sampleArticle3 } from '../../fixtures/sample-articles';

describe('FeedRepository', () => {
	let db: Database;
	let dbService: DatabaseService;
	let repository: FeedRepository;

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
		repository = new FeedRepository(dbService);
	});

	afterEach(() => {
		if (db) {
			db.close();
		}
	});

	describe('create', () => {
		beforeEach(() => {
			// Insert required account for foreign key
			insertAccount(db, sampleAccount1);
		});

		it('should create a new feed', async () => {
			const feed = await repository.create(
				'MP_WXS_new',
				'New Feed',
				'Description',
				sampleAccount1.id as any
			);

			expect(feed).toBeDefined();
			expect(feed.id).toBeDefined();
			expect(feed.feedId).toBe('MP_WXS_new');
			expect(feed.title).toBe('New Feed');
			expect(feed.description).toBe('Description');
			expect(feed.accountId).toBe(sampleAccount1.id);
		});

		it('should persist feed to database', async () => {
			await repository.create(
				'MP_WXS_test',
				'Test Feed',
				'Desc',
				sampleAccount1.id as any
			);

			const rows = getAllRows(db, 'feeds');
			expect(rows).toHaveLength(1);
			expect(rows[0].feed_id).toBe('MP_WXS_test'); // Database uses snake_case
		});

		it('should return existing feed if feedId already exists', async () => {
			insertFeed(db, sampleFeed1);

			const feed = await repository.create(
				sampleFeed1.feedId,
				'Different Title',
				'Different Desc',
				sampleAccount1.id as any
			);

			expect(feed.id).toBe(sampleFeed1.id);
			expect(feed.title).toBe(sampleFeed1.title); // Original title, not new one
			expect(countRows(db, 'feeds')).toBe(1); // Only one feed
		});

		it('should set timestamps on creation', async () => {
			const beforeCreate = Date.now();

			const feed = await repository.create(
				'MP_WXS_test',
				'Test',
				'',
				sampleAccount1.id as any
			);

			expect(feed.createdAt).toBeGreaterThanOrEqual(beforeCreate);
			expect(feed.updatedAt).toBeGreaterThanOrEqual(beforeCreate);
		});
	});

	describe('findById', () => {
		it('should find feed by ID', () => {
			insertAccount(db, sampleAccount1);
			insertFeed(db, sampleFeed1);

			const feed = repository.findById(sampleFeed1.id);

			expect(feed).toBeDefined();
			expect(feed?.feedId).toBe(sampleFeed1.feedId);
			expect(feed?.title).toBe(sampleFeed1.title);
		});

		it('should return null for non-existent ID', () => {
			const feed = repository.findById(99999);

			expect(feed).toBeNull();
		});
	});

	describe('findByFeedId', () => {
		it('should find feed by feedId (MP ID)', () => {
			insertAccount(db, sampleAccount1);
			insertFeed(db, sampleFeed1);

			const feed = repository.findByFeedId(sampleFeed1.feedId);

			expect(feed).toBeDefined();
			expect(feed?.id).toBe(sampleFeed1.id);
		});

		it('should return null for non-existent feedId', () => {
			const feed = repository.findByFeedId('MP_WXS_nonexistent');

			expect(feed).toBeNull();
		});
	});

	describe('findAll', () => {
		it('should return empty array when no feeds exist', () => {
			const feeds = repository.findAll();

			expect(feeds).toEqual([]);
		});

		it('should return all feeds', () => {
			insertAccount(db, sampleAccount1);
			insertFeed(db, sampleFeed1);
			insertFeed(db, sampleFeed2);
			insertFeed(db, sampleFeed3);

			const feeds = repository.findAll();

			expect(feeds).toHaveLength(3);
		});

		it('should return feeds ordered by creation date (newest first)', () => {
			insertAccount(db, sampleAccount1);
			const older = { ...sampleFeed1, createdAt: 1000 };
			const newer = { ...sampleFeed2, createdAt: 2000 };

			insertFeed(db, older);
			insertFeed(db, newer);

			const feeds = repository.findAll();

			expect(feeds[0].createdAt).toBe(2000);
			expect(feeds[1].createdAt).toBe(1000);
		});
	});

	describe('findByAccountId', () => {
		it('should find feeds by account ID', () => {
			insertAccount(db, sampleAccount1);
			insertAccount(db, sampleAccount2);
			insertFeed(db, sampleFeed1); // account-001
			insertFeed(db, sampleFeed2); // account-001
			insertFeed(db, sampleFeed3); // account-002

			const feeds = repository.findByAccountId(sampleAccount1.id as any);

			expect(feeds).toHaveLength(2);
			expect(feeds.every(f => f.accountId === sampleAccount1.id)).toBe(true);
		});

		it('should return empty array when account has no feeds', () => {
			insertAccount(db, sampleAccount1);

			const feeds = repository.findByAccountId(sampleAccount1.id as any);

			expect(feeds).toEqual([]);
		});
	});

	describe('findNeedingSync', () => {
		it('should find feeds that have never been synced', () => {
			insertAccount(db, sampleAccount1);
			insertFeed(db, sampleFeed3); // last_sync_at: null

			const feeds = repository.findNeedingSync();

			expect(feeds).toHaveLength(1);
			expect(feeds[0].feedId).toBe(sampleFeed3.feedId);
		});

		it('should find feeds with stale sync timestamps', () => {
			insertAccount(db, sampleAccount1);
			const threshold = 60 * 60 * 1000; // 1 hour
			const oldSyncFeed = {
				...sampleFeed1,
				lastSyncAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
			};
			const recentSyncFeed = {
				...sampleFeed2,
				lastSyncAt: Date.now() - 30 * 60 * 1000, // 30 minutes ago
			};

			insertFeed(db, oldSyncFeed);
			insertFeed(db, recentSyncFeed);

			const feeds = repository.findNeedingSync(threshold);

			expect(feeds).toHaveLength(1);
			expect(feeds[0].feedId).toBe(oldSyncFeed.feedId);
		});

		it('should not include recently synced feeds', () => {
			insertAccount(db, sampleAccount1);
			insertFeed(db, sampleFeedActive); // Synced 1 hour ago

			const feeds = repository.findNeedingSync(2 * 60 * 60 * 1000); // 2 hour threshold

			expect(feeds).toEqual([]);
		});

		it('should prioritize never-synced feeds', () => {
			insertAccount(db, sampleAccount1);
			insertFeed(db, sampleFeedStale); // Synced long ago
			insertFeed(db, sampleFeed3); // Never synced (last_sync_at: null)

			const feeds = repository.findNeedingSync();

			// Never-synced should come first
			expect(feeds[0].lastSyncAt).toBeUndefined();
		});
	});

	describe('updateMetadata', () => {
		it('should update feed title and description', () => {
			insertAccount(db, sampleAccount1);
			insertFeed(db, sampleFeed1);

			repository.updateMetadata(sampleFeed1.id, 'New Title', 'New Description');

			const feed = repository.findById(sampleFeed1.id);
			expect(feed?.title).toBe('New Title');
			expect(feed?.description).toBe('New Description');
		});

		it('should update the updatedAt timestamp', () => {
			insertAccount(db, sampleAccount1);
			insertFeed(db, sampleFeed1);
			const beforeUpdate = Date.now();

			repository.updateMetadata(sampleFeed1.id, 'New Title', 'New Desc');

			const feed = repository.findById(sampleFeed1.id);
			expect(feed?.updatedAt).toBeGreaterThanOrEqual(beforeUpdate);
		});
	});

	describe('updateLastSync', () => {
		it('should update last sync timestamp to current time', () => {
			insertAccount(db, sampleAccount1);
			insertFeed(db, sampleFeed1);
			const beforeUpdate = Date.now();

			repository.updateLastSync(sampleFeed1.id);

			const feed = repository.findById(sampleFeed1.id);
			expect(feed?.lastSyncAt).toBeGreaterThanOrEqual(beforeUpdate);
		});

		it('should update last sync timestamp to specified time', () => {
			insertAccount(db, sampleAccount1);
			insertFeed(db, sampleFeed1);
			const customTime = 1704067200000;

			repository.updateLastSync(sampleFeed1.id, customTime);

			const feed = repository.findById(sampleFeed1.id);
			expect(feed?.lastSyncAt).toBe(customTime);
		});
	});

	describe('updateAccount', () => {
		it('should update feed account association', () => {
			insertAccount(db, sampleAccount1);
			insertAccount(db, sampleAccount2);
			insertFeed(db, sampleFeed1); // Initially account-001

			repository.updateAccount(sampleFeed1.id, sampleAccount2.id as any);

			const feed = repository.findById(sampleFeed1.id);
			expect(feed?.accountId).toBe(sampleAccount2.id);
		});
	});

	describe('delete', () => {
		it('should delete feed by ID', () => {
			insertAccount(db, sampleAccount1);
			insertFeed(db, sampleFeed1);
			expect(countRows(db, 'feeds')).toBe(1);

			repository.delete(sampleFeed1.id);

			expect(countRows(db, 'feeds')).toBe(0);
		});

		it('should not throw error when deleting non-existent feed', () => {
			expect(() => repository.delete(99999)).not.toThrow();
		});
	});

	describe('deleteByFeedId', () => {
		it('should delete feed by feedId', () => {
			insertAccount(db, sampleAccount1);
			insertFeed(db, sampleFeed1);

			repository.deleteByFeedId(sampleFeed1.feedId);

			expect(countRows(db, 'feeds')).toBe(0);
		});

		it('should not delete other feeds', () => {
			insertAccount(db, sampleAccount1);
			insertFeed(db, sampleFeed1);
			insertFeed(db, sampleFeed2);

			repository.deleteByFeedId(sampleFeed1.feedId);

			expect(countRows(db, 'feeds')).toBe(1);
			const remaining = repository.findByFeedId(sampleFeed2.feedId);
			expect(remaining).toBeDefined();
		});
	});

	describe('count', () => {
		it('should return 0 when no feeds exist', () => {
			const count = repository.count();

			expect(count).toBe(0);
		});

		it('should return correct count of feeds', () => {
			insertAccount(db, sampleAccount1);
			insertFeed(db, sampleFeed1);
			insertFeed(db, sampleFeed2);
			insertFeed(db, sampleFeed3);

			const count = repository.count();

			expect(count).toBe(3);
		});
	});

	describe('countByAccount', () => {
		it('should count feeds by account', () => {
			insertAccount(db, sampleAccount1);
			insertAccount(db, sampleAccount2);
			insertFeed(db, sampleFeed1); // account-001
			insertFeed(db, sampleFeed2); // account-001
			insertFeed(db, sampleFeed3); // account-002

			expect(repository.countByAccount(sampleAccount1.id as any)).toBe(2);
			expect(repository.countByAccount(sampleAccount2.id as any)).toBe(1);
		});

		it('should return 0 for account with no feeds', () => {
			insertAccount(db, sampleAccount1);

			const count = repository.countByAccount(sampleAccount1.id as any);

			expect(count).toBe(0);
		});
	});

	describe('getFeedStats', () => {
		it('should return feeds with article counts', () => {
			insertAccount(db, sampleAccount1);
			insertFeed(db, sampleFeed1);
			insertFeed(db, sampleFeed2);
			insertArticle(db, sampleArticle1); // feed: MP_WXS_test001
			insertArticle(db, sampleArticle2); // feed: MP_WXS_test001
			insertArticle(db, sampleArticle3); // feed: MP_WXS_test002

			const stats = repository.getFeedStats();

			expect(stats).toHaveLength(2);
			const feed1Stats = stats.find(s => s.feedId === sampleFeed1.feedId);
			const feed2Stats = stats.find(s => s.feedId === sampleFeed2.feedId);

			expect(feed1Stats?.articleCount).toBe(2);
			expect(feed2Stats?.articleCount).toBe(1);
		});

		it('should return 0 article count for feeds with no articles', () => {
			insertAccount(db, sampleAccount1);
			insertFeed(db, sampleFeed1);

			const stats = repository.getFeedStats();

			expect(stats).toHaveLength(1);
			expect(stats[0].articleCount).toBe(0);
		});

		it('should return empty array when no feeds exist', () => {
			const stats = repository.getFeedStats();

			expect(stats).toEqual([]);
		});
	});
});
