import { DatabaseService } from '../DatabaseService';
import { Feed } from '../../../types';
import { logger } from '../../../utils/logger';

/**
 * FeedRepository - Manages WeChat public account feeds in the database
 */
export class FeedRepository {
	private db: DatabaseService;

	constructor(db: DatabaseService) {
		this.db = db;
	}

	/**
	 * Create a new feed
	 */
	async create(feedId: string, title: string, description: string, accountId: number): Promise<Feed> {
		const now = Date.now();

		// Check if feed already exists
		const existing = this.findByFeedId(feedId);
		if (existing) {
			logger.warn('Feed already exists:', feedId);
			return existing;
		}

		this.db.execute(
			`INSERT INTO feeds (feed_id, title, description, account_id, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?)`,
			[feedId, title, description, accountId, now, now]
		);

		const id = this.db.getLastInsertId();

		logger.info('Feed created:', { id, feedId, title });

		return {
			id,
			feedId,
			title,
			description,
			accountId,
			createdAt: now,
			updatedAt: now,
		};
	}

	/**
	 * Find feed by ID
	 */
	findById(id: number): Feed | null {
		const result = this.db.queryOne<any>(
			'SELECT * FROM feeds WHERE id = ?',
			[id]
		);

		if (!result) {
			return null;
		}

		return this.mapToFeed(result);
	}

	/**
	 * Find feed by feedId (WeChat public account ID)
	 */
	findByFeedId(feedId: string): Feed | null {
		const result = this.db.queryOne<any>(
			'SELECT * FROM feeds WHERE feed_id = ?',
			[feedId]
		);

		if (!result) {
			return null;
		}

		return this.mapToFeed(result);
	}

	/**
	 * Find all feeds
	 */
	findAll(): Feed[] {
		const results = this.db.query<any>('SELECT * FROM feeds ORDER BY created_at DESC');
		return results.map(r => this.mapToFeed(r));
	}

	/**
	 * Find feeds by account ID
	 */
	findByAccountId(accountId: number): Feed[] {
		const results = this.db.query<any>(
			'SELECT * FROM feeds WHERE account_id = ? ORDER BY created_at DESC',
			[accountId]
		);
		return results.map(r => this.mapToFeed(r));
	}

	/**
	 * Find feeds that need syncing (haven't been synced recently)
	 */
	findNeedingSync(thresholdMs: number = 60 * 60 * 1000): Feed[] {
		const threshold = Date.now() - thresholdMs;

		const results = this.db.query<any>(
			`SELECT * FROM feeds
			WHERE last_sync_at IS NULL OR last_sync_at < ?
			ORDER BY last_sync_at ASC NULLS FIRST`,
			[threshold]
		);

		return results.map(r => this.mapToFeed(r));
	}

	/**
	 * Update feed metadata
	 */
	updateMetadata(id: number, title: string, description: string): void {
		const now = Date.now();
		this.db.execute(
			'UPDATE feeds SET title = ?, description = ?, updated_at = ? WHERE id = ?',
			[title, description, now, id]
		);
		logger.info('Feed metadata updated:', { id, title });
	}

	/**
	 * Update last sync timestamp
	 */
	updateLastSync(id: number, timestamp?: number): void {
		const syncTime = timestamp || Date.now();
		const now = Date.now();

		this.db.execute(
			'UPDATE feeds SET last_sync_at = ?, updated_at = ? WHERE id = ?',
			[syncTime, now, id]
		);

		logger.debug('Feed sync timestamp updated:', { id, syncTime });
	}

	/**
	 * Update account association
	 */
	updateAccount(id: number, accountId: number): void {
		const now = Date.now();
		this.db.execute(
			'UPDATE feeds SET account_id = ?, updated_at = ? WHERE id = ?',
			[accountId, now, id]
		);
		logger.info('Feed account updated:', { id, accountId });
	}

	/**
	 * Delete feed
	 */
	delete(id: number): void {
		this.db.execute('DELETE FROM feeds WHERE id = ?', [id]);
		logger.info('Feed deleted:', id);
	}

	/**
	 * Delete feed by feedId
	 */
	deleteByFeedId(feedId: string): void {
		this.db.execute('DELETE FROM feeds WHERE feed_id = ?', [feedId]);
		logger.info('Feed deleted by feedId:', feedId);
	}

	/**
	 * Count total feeds
	 */
	count(): number {
		const result = this.db.queryOne<{ count: number }>(
			'SELECT COUNT(*) as count FROM feeds'
		);
		return result?.count || 0;
	}

	/**
	 * Count feeds by account
	 */
	countByAccount(accountId: number): number {
		const result = this.db.queryOne<{ count: number }>(
			'SELECT COUNT(*) as count FROM feeds WHERE account_id = ?',
			[accountId]
		);
		return result?.count || 0;
	}

	/**
	 * Get feed statistics (with article counts)
	 */
	getFeedStats(): Array<Feed & { articleCount: number }> {
		const results = this.db.query<any>(
			`SELECT f.*, COUNT(a.id) as article_count
			FROM feeds f
			LEFT JOIN articles a ON a.feed_id = f.id
			GROUP BY f.id
			ORDER BY f.created_at DESC`
		);

		return results.map(r => ({
			...this.mapToFeed(r),
			articleCount: r.article_count || 0,
		}));
	}

	/**
	 * Map database row to Feed object
	 */
	private mapToFeed(row: any): Feed {
		return {
			id: row.id,
			feedId: row.feed_id,
			title: row.title,
			description: row.description || '',
			accountId: row.account_id,
			lastSyncAt: row.last_sync_at || undefined,
			createdAt: row.created_at,
			updatedAt: row.updated_at,
		};
	}
}
