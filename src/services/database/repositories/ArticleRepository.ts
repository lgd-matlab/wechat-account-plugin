import { DatabaseService } from '../DatabaseService';
import { Article } from '../../../types';
import { logger } from '../../../utils/logger';

/**
 * ArticleRepository - Manages WeChat articles in the database
 */
export class ArticleRepository {
	private db: DatabaseService;

	constructor(db: DatabaseService) {
		this.db = db;
	}

	/**
	 * Create a new article
	 */
	async create(
		feedId: number,
		title: string,
		content: string,
		contentHtml: string,
		url: string,
		publishedAt: number
	): Promise<Article> {
		const now = Date.now();

		// Check if article already exists by URL
		const existing = this.findByUrl(url);
		if (existing) {
			logger.debug('Article already exists:', url);
			return existing;
		}

		this.db.execute(
			`INSERT INTO articles (feed_id, title, content, content_html, url, published_at, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?)`,
			[feedId, title, content, contentHtml, url, publishedAt, now]
		);

		const id = this.db.getLastInsertId();

		logger.info('Article created:', { id, title });

		return {
			id,
			feedId,
			title,
			content,
			contentHtml,
			url,
			publishedAt,
			synced: false,
			createdAt: now,
		};
	}

	/**
	 * Batch insert articles (more efficient for multiple inserts)
	 */
	async createBatch(articles: Array<{
		feedId: number;
		title: string;
		content: string;
		contentHtml: string;
		url: string;
		publishedAt: number;
	}>): Promise<number> {
		if (articles.length === 0) {
			return 0;
		}

		const now = Date.now();
		let insertedCount = 0;

		this.db.beginTransaction();

		try {
			for (const article of articles) {
				// Skip if already exists
				const existing = this.findByUrl(article.url);
				if (existing) {
					continue;
				}

				this.db.execute(
					`INSERT INTO articles (feed_id, title, content, content_html, url, published_at, created_at)
					VALUES (?, ?, ?, ?, ?, ?, ?)`,
					[
						article.feedId,
						article.title,
						article.content,
						article.contentHtml,
						article.url,
						article.publishedAt,
						now
					]
				);

				insertedCount++;
			}

			this.db.commit();
			logger.info('Batch articles created:', insertedCount);
		} catch (error) {
			this.db.rollback();
			logger.error('Failed to create batch articles:', error);
			throw error;
		}

		return insertedCount;
	}

	/**
	 * Find all articles
	 */
	findAll(): Article[] {
		const results = this.db.query<any>(
			'SELECT * FROM articles ORDER BY published_at DESC'
		);

		return results.map(r => this.mapToArticle(r));
	}

	/**
	 * Find article by ID
	 */
	findById(id: number): Article | null {
		const result = this.db.queryOne<any>(
			'SELECT * FROM articles WHERE id = ?',
			[id]
		);

		if (!result) {
			return null;
		}

		return this.mapToArticle(result);
	}

	/**
	 * Find article by URL
	 */
	findByUrl(url: string): Article | null {
		const result = this.db.queryOne<any>(
			'SELECT * FROM articles WHERE url = ?',
			[url]
		);

		if (!result) {
			return null;
		}

		return this.mapToArticle(result);
	}

	/**
	 * Find articles by feed ID
	 */
	findByFeedId(feedId: number, limit?: number): Article[] {
		const sql = limit
			? 'SELECT * FROM articles WHERE feed_id = ? ORDER BY published_at DESC LIMIT ?'
			: 'SELECT * FROM articles WHERE feed_id = ? ORDER BY published_at DESC';

		const params = limit ? [feedId, limit] : [feedId];
		const results = this.db.query<any>(sql, params);

		return results.map(r => this.mapToArticle(r));
	}

	/**
	 * Find unsynced articles (notes not yet created)
	 */
	findUnsynced(limit?: number): Article[] {
		const sql = limit
			? 'SELECT * FROM articles WHERE synced = 0 ORDER BY published_at DESC LIMIT ?'
			: 'SELECT * FROM articles WHERE synced = 0 ORDER BY published_at DESC';

		const params = limit ? [limit] : [];
		const results = this.db.query<any>(sql, params);

		return results.map(r => this.mapToArticle(r));
	}

	/**
	 * Find unsynced articles by feed ID
	 */
	findUnsyncedByFeed(feedId: number, limit?: number): Article[] {
		const sql = limit
			? 'SELECT * FROM articles WHERE feed_id = ? AND synced = 0 ORDER BY published_at DESC LIMIT ?'
			: 'SELECT * FROM articles WHERE feed_id = ? AND synced = 0 ORDER BY published_at DESC';

		const params = limit ? [feedId, limit] : [feedId];
		const results = this.db.query<any>(sql, params);

		return results.map(r => this.mapToArticle(r));
	}

	/**
	 * Find recent articles across all feeds
	 */
	findRecent(limit: number = 50): Article[] {
		const results = this.db.query<any>(
			'SELECT * FROM articles ORDER BY published_at DESC LIMIT ?',
			[limit]
		);

		return results.map(r => this.mapToArticle(r));
	}

	/**
	 * Search articles by title
	 */
	searchByTitle(query: string, limit: number = 50): Article[] {
		const results = this.db.query<any>(
			'SELECT * FROM articles WHERE title LIKE ? ORDER BY published_at DESC LIMIT ?',
			[`%${query}%`, limit]
		);

		return results.map(r => this.mapToArticle(r));
	}

	/**
	 * Mark article as synced (note created)
	 */
	markAsSynced(id: number, noteId: string): void {
		this.db.execute(
			'UPDATE articles SET synced = 1, note_id = ? WHERE id = ?',
			[noteId, id]
		);

		logger.debug('Article marked as synced:', { id, noteId });
	}

	/**
	 * Mark multiple articles as synced
	 */
	markBatchAsSynced(articleIds: number[]): void {
		if (articleIds.length === 0) {
			return;
		}

		this.db.beginTransaction();

		try {
			for (const id of articleIds) {
				this.db.execute(
					'UPDATE articles SET synced = 1 WHERE id = ?',
					[id]
				);
			}

			this.db.commit();
			logger.info('Batch articles marked as synced:', articleIds.length);
		} catch (error) {
			this.db.rollback();
			logger.error('Failed to mark batch as synced:', error);
			throw error;
		}
	}

	/**
	 * Update article
	 */
	update(id: number, updates: Partial<Omit<Article, 'id' | 'createdAt'>>): void {
		const fields: string[] = [];
		const values: any[] = [];

		if (updates.title !== undefined) {
			fields.push('title = ?');
			values.push(updates.title);
		}
		if (updates.content !== undefined) {
			fields.push('content = ?');
			values.push(updates.content);
		}
		if (updates.contentHtml !== undefined) {
			fields.push('content_html = ?');
			values.push(updates.contentHtml);
		}
		if (updates.noteId !== undefined) {
			fields.push('note_id = ?');
			values.push(updates.noteId);
		}
		if (updates.synced !== undefined) {
			fields.push('synced = ?');
			values.push(updates.synced ? 1 : 0);
		}

		if (fields.length === 0) {
			return;
		}

		values.push(id);

		this.db.execute(
			`UPDATE articles SET ${fields.join(', ')} WHERE id = ?`,
			values
		);

		logger.info('Article updated:', id);
	}

	/**
	 * Update article content
	 */
	updateContent(id: number, content: string, contentHtml: string): void {
		this.db.execute(
			'UPDATE articles SET content = ?, content_html = ? WHERE id = ?',
			[content, contentHtml, id]
		);

		logger.info('Article content updated:', id);
	}

	/**
	 * Delete article
	 */
	delete(id: number): void {
		this.db.execute('DELETE FROM articles WHERE id = ?', [id]);
		logger.info('Article deleted:', id);
	}

	/**
	 * Delete articles by feed ID
	 */
	deleteByFeedId(feedId: number): void {
		this.db.execute('DELETE FROM articles WHERE feed_id = ?', [feedId]);
		logger.info('Articles deleted for feed:', feedId);
	}

	/**
	 * Delete old articles (cleanup)
	 */
	deleteOlderThan(timestampMs: number): number {
		const result = this.db.query<any>(
			'SELECT COUNT(*) as count FROM articles WHERE published_at < ?',
			[timestampMs]
		);

		const count = result[0]?.count || 0;

		if (count > 0) {
			this.db.execute('DELETE FROM articles WHERE published_at < ?', [timestampMs]);
			logger.info('Old articles deleted:', count);
		}

		return count;
	}

	/**
	 * Cleanup synced articles older than threshold
	 */
	cleanupSynced(daysOld: number = 30): number {
		const threshold = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

		const result = this.db.query<any>(
			'SELECT COUNT(*) as count FROM articles WHERE synced = 1 AND published_at < ?',
			[threshold]
		);

		const count = result[0]?.count || 0;

		if (count > 0) {
			this.db.execute(
				'DELETE FROM articles WHERE synced = 1 AND published_at < ?',
				[threshold]
			);
			logger.info('Synced articles cleaned up:', count);
		}

		return count;
	}

	/**
	 * Count total articles
	 */
	count(): number {
		const result = this.db.queryOne<{ count: number }>(
			'SELECT COUNT(*) as count FROM articles'
		);
		return result?.count || 0;
	}

	/**
	 * Count articles by feed
	 */
	countByFeed(feedId: number): number {
		const result = this.db.queryOne<{ count: number }>(
			'SELECT COUNT(*) as count FROM articles WHERE feed_id = ?',
			[feedId]
		);
		return result?.count || 0;
	}

	/**
	 * Count unsynced articles
	 */
	countUnsynced(): number {
		const result = this.db.queryOne<{ count: number }>(
			'SELECT COUNT(*) as count FROM articles WHERE synced = 0'
		);
		return result?.count || 0;
	}

	/**
	 * Get article statistics
	 */
	getStats(): {
		total: number;
		synced: number;
		unsynced: number;
		byFeed: Array<{ feedId: number; count: number }>;
	} {
		const total = this.count();
		const synced = this.count() - this.countUnsynced();
		const unsynced = this.countUnsynced();

		const byFeedResults = this.db.query<any>(
			'SELECT feed_id, COUNT(*) as count FROM articles GROUP BY feed_id'
		);

		const byFeed = byFeedResults.map(r => ({
			feedId: r.feed_id,
			count: r.count,
		}));

		return { total, synced, unsynced, byFeed };
	}

	/**
	 * Map database row to Article object
	 */
	private mapToArticle(row: any): Article {
		return {
			id: row.id,
			feedId: row.feed_id,
			title: row.title,
			content: row.content,
			contentHtml: row.content_html,
			url: row.url,
			publishedAt: row.published_at,
			synced: row.synced === 1,
			noteId: row.note_id || undefined,
			createdAt: row.created_at,
		};
	}
}
