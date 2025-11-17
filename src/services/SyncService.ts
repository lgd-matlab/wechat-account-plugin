import type WeWeRssPlugin from '../main';
import { Logger } from '../utils/logger';
import { Article, Feed } from '../types';

export interface SyncResult {
	feedsRefreshed: number;
	feedsFailed: number;
	articlesDownloaded: number;
	notesCreated: number;
	notesSkipped: number;
	notesFailed: number;
	articlesDeleted: number;
	notesDeleted: number;
	errors: string[];
}

export interface SyncOptions {
	/** Only sync feeds that haven't been updated in the last N hours */
	staleThresholdHours?: number;
	/** Maximum number of articles to fetch per feed */
	maxArticlesPerFeed?: number;
	/** Whether to create notes immediately or just download articles */
	createNotes?: boolean;
	/** Specific feed IDs to sync (if empty, sync all) */
	feedIds?: number[];
}

export class SyncService {
	private plugin: WeWeRssPlugin;
	private logger: Logger;
	private isSyncing: boolean = false;
	private lastSyncTime: Date | null = null;

	constructor(plugin: WeWeRssPlugin) {
		this.plugin = plugin;
		this.logger = new Logger('SyncService');
	}

	/**
	 * Perform a full sync: refresh feeds and create notes
	 */
	async syncAll(options: SyncOptions = {}): Promise<SyncResult> {
		if (this.isSyncing) {
			this.logger.warn('Sync already in progress, skipping...');
			throw new Error('Sync already in progress');
		}

		this.isSyncing = true;
		const result: SyncResult = {
			feedsRefreshed: 0,
			feedsFailed: 0,
			articlesDownloaded: 0,
			notesCreated: 0,
			notesSkipped: 0,
			notesFailed: 0,
			articlesDeleted: 0,
			notesDeleted: 0,
			errors: []
		};

		try {
			this.logger.info('Starting sync...', options);

			// Step 1: Refresh feeds
			const refreshResult = await this.refreshFeeds(options);
			result.feedsRefreshed = refreshResult.successful;
			result.feedsFailed = refreshResult.failed;
			result.articlesDownloaded = refreshResult.articlesDownloaded;
			result.errors.push(...refreshResult.errors);

			// Step 2: Create notes if enabled
			if (options.createNotes !== false) {
				const noteResult = await this.createNotesForUnsyncedArticles();
				result.notesCreated = noteResult.created;
				result.notesSkipped = noteResult.skipped;
				result.notesFailed = noteResult.failed;
			}

			// Step 3: Cleanup old articles and notes
			const retentionDays = this.plugin.settings.articleRetentionDays || 30;
			const cleanupResult = await this.cleanupOldArticlesAndNotes(retentionDays);
			result.articlesDeleted = cleanupResult.articlesDeleted;
			result.notesDeleted = cleanupResult.notesDeleted;

			this.lastSyncTime = new Date();
			this.logger.info('Sync completed successfully', result);

			return result;
		} catch (error) {
			this.logger.error('Sync failed:', error);
			result.errors.push(error.message);
			throw error;
		} finally {
			this.isSyncing = false;
		}
	}

	/**
	 * Refresh feeds and download new articles
	 */
	private async refreshFeeds(options: SyncOptions): Promise<{
		successful: number;
		failed: number;
		articlesDownloaded: number;
		errors: string[];
	}> {
		const { staleThresholdHours, feedIds } = options;
		const result = {
			successful: 0,
			failed: 0,
			articlesDownloaded: 0,
			errors: [] as string[]
		};

		// Get feeds to refresh
		let feeds: Feed[];
		if (feedIds && feedIds.length > 0) {
			// Refresh specific feeds
			feeds = feedIds
				.map(id => this.plugin.databaseService.feeds.findById(id))
				.filter((feed): feed is Feed => feed !== null);
		} else if (staleThresholdHours !== undefined) {
			// Refresh stale feeds
			feeds = this.plugin.databaseService.feeds.findNeedingSync(staleThresholdHours);
		} else {
			// Refresh all feeds
			feeds = this.plugin.databaseService.feeds.findAll();
		}

		this.logger.info(`Refreshing ${feeds.length} feeds...`);

		// Refresh each feed
		for (const feed of feeds) {
			try {
				const articleCount = await this.plugin.feedService.refreshFeed(feed.id);
				result.articlesDownloaded += articleCount;
				result.successful++;
				this.logger.debug(`Refreshed feed ${feed.title}: ${articleCount} new articles`);
			} catch (error) {
				result.failed++;
				const errorMsg = `Failed to refresh feed ${feed.title}: ${error.message}`;
				result.errors.push(errorMsg);
				this.logger.error(errorMsg);
			}
		}

		return result;
	}

	/**
	 * Create notes for all unsynced articles
	 */
	private async createNotesForUnsyncedArticles(): Promise<{
		created: number;
		skipped: number;
		failed: number;
	}> {
		// Get all unsynced articles
		const articles = this.plugin.databaseService.articles.findUnsynced();

		if (articles.length === 0) {
			this.logger.info('No unsynced articles found');
			return { created: 0, skipped: 0, failed: 0 };
		}

		this.logger.info(`Creating notes for ${articles.length} unsynced articles...`);

		// Build feeds map
		const feedsMap = new Map<number, Feed>();
		const uniqueFeedIds = [...new Set(articles.map(a => a.feedId))];
		for (const feedId of uniqueFeedIds) {
			const feed = this.plugin.databaseService.feeds.findById(feedId);
			if (feed) {
				feedsMap.set(feedId, feed);
			}
		}

		// Create notes in batch
		const result = await this.plugin.noteCreator.createNotesFromArticles(articles, feedsMap);

		this.logger.info('Note creation completed', result);

		return result;
	}

	/**
	 * Cleanup old articles and their notes based on retention policy
	 * @param retentionDays Articles older than this will be deleted
	 * @returns Number of articles and notes deleted
	 */
	private async cleanupOldArticlesAndNotes(retentionDays: number): Promise<{
		articlesDeleted: number;
		notesDeleted: number;
	}> {
		try {
			this.logger.info(`Cleaning up articles older than ${retentionDays} days...`);

			// Delete old articles from database (returns IDs of deleted articles)
			const { deletedIds, count } = this.plugin.databaseService.articles.cleanupOldArticles(retentionDays);

			if (count === 0) {
				this.logger.info('No old articles to cleanup');
				return { articlesDeleted: 0, notesDeleted: 0 };
			}

			// Delete corresponding notes
			const notesDeleted = await this.plugin.noteCreator.deleteNotesByArticleIds(deletedIds);

			this.logger.info(`Cleanup complete: ${count} articles and ${notesDeleted} notes deleted`);

			return { articlesDeleted: count, notesDeleted };
		} catch (error) {
			this.logger.error('Failed to cleanup old articles and notes:', error);
			return { articlesDeleted: 0, notesDeleted: 0 };
		}
	}

	/**
	 * Sync a single feed by ID
	 */
	async syncFeed(feedId: number): Promise<SyncResult> {
		return this.syncAll({
			feedIds: [feedId],
			createNotes: true
		});
	}

	/**
	 * Download articles without creating notes
	 */
	async downloadArticlesOnly(options: SyncOptions = {}): Promise<SyncResult> {
		return this.syncAll({
			...options,
			createNotes: false
		});
	}

	/**
	 * Create notes for existing articles (manual trigger)
	 */
	async createNotesManually(): Promise<{
		created: number;
		skipped: number;
		failed: number;
	}> {
		if (this.isSyncing) {
			throw new Error('Sync already in progress');
		}

		this.isSyncing = true;
		try {
			return await this.createNotesForUnsyncedArticles();
		} finally {
			this.isSyncing = false;
		}
	}

	/**
	 * Check if sync is currently running
	 */
	isRunning(): boolean {
		return this.isSyncing;
	}

	/**
	 * Get last sync time
	 */
	getLastSyncTime(): Date | null {
		return this.lastSyncTime;
	}

	/**
	 * Get sync statistics
	 */
	async getSyncStats(): Promise<{
		totalFeeds: number;
		totalArticles: number;
		unsyncedArticles: number;
		syncedArticles: number;
		lastSyncTime: Date | null;
		isSyncing: boolean;
	}> {
		const feeds = this.plugin.databaseService.feeds.findAll();
		const articles = this.plugin.databaseService.articles.findAll();
		const unsynced = this.plugin.databaseService.articles.findUnsynced();

		return {
			totalFeeds: feeds.length,
			totalArticles: articles.length,
			unsyncedArticles: unsynced.length,
			syncedArticles: articles.length - unsynced.length,
			lastSyncTime: this.lastSyncTime,
			isSyncing: this.isSyncing
		};
	}

	/**
	 * Cleanup old synced articles from database
	 */
	async cleanupOldArticles(retentionDays: number = 30): Promise<number> {
		try {
			const deleted = this.plugin.databaseService.articles.cleanupSynced(retentionDays);
			this.logger.info(`Cleaned up ${deleted} old articles (retention: ${retentionDays} days)`);
			return deleted;
		} catch (error) {
			this.logger.error('Failed to cleanup old articles:', error);
			throw error;
		}
	}
}
