import WeWeRssPlugin from '../main';
import { Feed } from '../types';
import { WeChatApiClient } from './api/WeChatApiClient';
import { MpInfo, MpArticle } from './api/types';
import { logger } from '../utils/logger';
import { extractFeedIdFromUrl, isArticleRecent } from '../utils/helpers';

/**
 * FeedService - Manages WeChat public account feeds
 *
 * Handles feed subscription, article fetching, and metadata management
 */
export class FeedService {
	private plugin: WeWeRssPlugin;
	private apiClient: WeChatApiClient;

	constructor(plugin: WeWeRssPlugin) {
		this.plugin = plugin;
		this.apiClient = new WeChatApiClient(plugin.settings.platformUrl);
	}

	/**
	 * Parse account credentials from cookie field
	 * Supports both new JSON format and legacy token-only format
	 */
	private parseCredentials(cookie: string): { vid: number; token: string } {
		try {
			// Try parsing as JSON (new format)
			const credentials = JSON.parse(cookie);
			if (credentials.vid && credentials.token) {
				return credentials;
			}
		} catch (e) {
			// Not JSON or invalid format
		}

		// Legacy format (token only) or invalid
		throw new Error(
			'Account credentials are in old format or invalid. ' +
			'Please remove this account and add it again by scanning the QR code in Settings > WeWe RSS > Accounts.'
		);
	}

	/**
	 * Subscribe to a WeChat public account via share link
	 */
	async subscribeFeed(wxsLink: string): Promise<Feed> {
		try {
			logger.info('Subscribing to feed:', wxsLink);

			// Get an available account for authentication
			const account = await this.plugin.accountService.getAvailableAccount();
			if (!account) {
				throw new Error('Please add a WeChat account before subscribing to feeds. Go to Settings > WeWe RSS > Add Account.');
			}

			// Parse credentials to get vid and token
			const credentials = this.parseCredentials(account.cookie);

			// Get MP info from share link with authentication
			const mpInfoList = await this.apiClient.getMpInfoWithAuth(
				wxsLink,
				account.id.toString(),
				credentials.token
			);

			if (!mpInfoList || mpInfoList.length === 0) {
				throw new Error('Failed to get MP info from share link');
			}

			const mpInfo = mpInfoList[0];

			// Check if feed already exists
			const existingFeed = this.plugin.databaseService.feeds.findByFeedId(mpInfo.id);
			if (existingFeed) {
				logger.info('Feed already exists:', mpInfo.name);
				return existingFeed;
			}

			// Create feed in database
			const feed = await this.plugin.databaseService.feeds.create(
				mpInfo.id,
				mpInfo.name,
				mpInfo.intro || '',
				account.id
			);

			logger.info('Feed subscribed successfully:', feed.title);

			// Fetch initial articles (don't wait for completion)
			this.fetchHistoricalArticles(feed.id, mpInfo.id).catch(err => {
				logger.error('Failed to fetch historical articles:', err);
			});

			return feed;
		} catch (error) {
			logger.error('Failed to subscribe to feed:', error);
			throw error;
		}
	}

	/**
	 * Fetch historical articles for a feed
	 */
	async fetchHistoricalArticles(feedId: number, mpId: string, maxPages: number = 5): Promise<number> {
		try {
			logger.info(`Fetching historical articles for ${mpId}...`);

			const feed = this.plugin.databaseService.feeds.findById(feedId);
			if (!feed) {
				throw new Error('Feed not found');
			}

			const account = this.plugin.databaseService.accounts.findById(feed.accountId);
			if (!account) {
				throw new Error('Feed account not found');
			}

			// Parse credentials to get vid and token
			const credentials = this.parseCredentials(account.cookie);

			let totalArticles = 0;
			let page = 1;

			while (page <= maxPages) {
				try {
					const articles = await this.apiClient.getMpArticles(
						mpId,
						account.id.toString(),
						credentials.token,
						page
					);

					if (articles.length === 0) {
						logger.info(`No more articles on page ${page}`);
						break;
					}

					// Filter articles by retention period
					const retentionDays = this.plugin.settings.articleRetentionDays || 30;
					const recentArticles = articles.filter(article =>
						isArticleRecent(article.publishTime * 1000, retentionDays)
					);

					const filteredCount = articles.length - recentArticles.length;
					if (filteredCount > 0) {
						logger.info(`Filtered ${filteredCount} articles older than ${retentionDays} days on page ${page}`);
					}

					if (recentArticles.length === 0) {
						logger.info(`No recent articles on page ${page}, stopping fetch`);
						break;
					}

					// Save articles to database
					const articlesToInsert = recentArticles.map(article => ({
						feedId: feedId,
						title: article.title,
						content: '', // Will be filled when syncing notes
						contentHtml: '',
						url: `https://mp.weixin.qq.com/s/${article.id}`,
						publishedAt: article.publishTime * 1000, // Convert to ms
					}));

					const inserted = await this.plugin.databaseService.articles.createBatch(
						articlesToInsert
					);

					totalArticles += inserted;
					logger.info(`Fetched ${inserted} articles from page ${page}`);

					// Delay between pages to avoid rate limiting
					if (page < maxPages) {
						await this.delay(this.plugin.settings.updateDelay * 1000);
					}

					page++;
				} catch (error) {
					logger.error(`Failed to fetch articles on page ${page}:`, error);
					await this.plugin.accountService.handleApiError(account.id, error);
					break;
				}
			}

			// Update last sync timestamp
			this.plugin.databaseService.feeds.updateLastSync(feedId);

			logger.info(`Fetched ${totalArticles} historical articles for ${mpId}`);
			return totalArticles;
		} catch (error) {
			logger.error('Failed to fetch historical articles:', error);
			throw error;
		}
	}

	/**
	 * Refresh articles for a specific feed
	 */
	async refreshFeed(feedId: number): Promise<number> {
		try {
			const feed = this.plugin.databaseService.feeds.findById(feedId);
			if (!feed) {
				throw new Error('Feed not found');
			}

			logger.info('Refreshing feed:', feed.title);

			const account = this.plugin.databaseService.accounts.findById(feed.accountId);
			if (!account) {
				throw new Error('Feed account not found');
			}

			// Parse credentials to get vid and token
			const credentials = this.parseCredentials(account.cookie);

			// Fetch first page of articles
			const articles = await this.apiClient.getMpArticles(
				feed.feedId,
				account.id.toString(),
				credentials.token,
				1
			);

			if (articles.length === 0) {
				logger.info('No new articles found');
				this.plugin.databaseService.feeds.updateLastSync(feedId);
				return 0;
			}

			// Filter articles by retention period
			const retentionDays = this.plugin.settings.articleRetentionDays || 30;
			const recentArticles = articles.filter(article =>
				isArticleRecent(article.publishTime * 1000, retentionDays)
			);

			const filteredCount = articles.length - recentArticles.length;
			if (filteredCount > 0) {
				logger.info(`Filtered ${filteredCount} articles older than ${retentionDays} days`);
			}

			if (recentArticles.length === 0) {
				logger.info('No recent articles found');
				this.plugin.databaseService.feeds.updateLastSync(feedId);
				return 0;
			}

			// Save new articles
			const articlesToInsert = recentArticles.map(article => ({
				feedId: feedId,
				title: article.title,
				content: '',
				contentHtml: '',
				url: `https://mp.weixin.qq.com/s/${article.id}`,
				publishedAt: article.publishTime * 1000,
			}));

			const inserted = await this.plugin.databaseService.articles.createBatch(
				articlesToInsert
			);

			// Update last sync timestamp
			this.plugin.databaseService.feeds.updateLastSync(feedId);

			logger.info(`Refreshed ${inserted} new articles for ${feed.title}`);
			return inserted;
		} catch (error) {
			logger.error('Failed to refresh feed:', error);

			// Handle API errors
			const feed = this.plugin.databaseService.feeds.findById(feedId);
			if (feed) {
				await this.plugin.accountService.handleApiError(feed.accountId, error);
			}

			throw error;
		}
	}

	/**
	 * Refresh all feeds
	 */
	async refreshAllFeeds(): Promise<{ total: number; successful: number; failed: number }> {
		const feeds = this.plugin.databaseService.feeds.findAll();
		const results = {
			total: feeds.length,
			successful: 0,
			failed: 0,
		};

		logger.info(`Refreshing ${feeds.length} feeds...`);

		for (const feed of feeds) {
			try {
				await this.refreshFeed(feed.id);
				results.successful++;

				// Delay between feeds
				if (results.successful < feeds.length) {
					await this.delay(this.plugin.settings.updateDelay * 1000);
				}
			} catch (error) {
				logger.error(`Failed to refresh feed ${feed.title}:`, error);
				results.failed++;
			}
		}

		logger.info(`Refresh complete: ${results.successful}/${results.total} successful`);
		return results;
	}

	/**
	 * Refresh feeds that need updating (haven't been synced recently)
	 */
	async refreshStaleFeeds(thresholdHours: number = 1): Promise<number> {
		const thresholdMs = thresholdHours * 60 * 60 * 1000;
		const staleFeeds = this.plugin.databaseService.feeds.findNeedingSync(thresholdMs);

		logger.info(`Found ${staleFeeds.length} stale feeds to refresh`);

		let refreshed = 0;

		for (const feed of staleFeeds) {
			try {
				await this.refreshFeed(feed.id);
				refreshed++;

				// Delay between feeds
				if (refreshed < staleFeeds.length) {
					await this.delay(this.plugin.settings.updateDelay * 1000);
				}
			} catch (error) {
				logger.error(`Failed to refresh stale feed ${feed.title}:`, error);
			}
		}

		logger.info(`Refreshed ${refreshed} stale feeds`);
		return refreshed;
	}

	/**
	 * Update feed metadata
	 */
	async updateFeedMetadata(feedId: number, title: string, description: string): Promise<void> {
		this.plugin.databaseService.feeds.updateMetadata(feedId, title, description);
		logger.info('Feed metadata updated:', feedId);
	}

	/**
	 * Delete feed and associated articles
	 */
	async deleteFeed(feedId: number): Promise<void> {
		// Delete articles first
		this.plugin.databaseService.articles.deleteByFeedId(feedId);

		// Delete feed
		this.plugin.databaseService.feeds.delete(feedId);

		logger.info('Feed deleted:', feedId);
	}

	/**
	 * Get all feeds
	 */
	getAllFeeds(): Feed[] {
		return this.plugin.databaseService.feeds.findAll();
	}

	/**
	 * Get feed by ID
	 */
	getFeed(feedId: number): Feed | null {
		return this.plugin.databaseService.feeds.findById(feedId);
	}

	/**
	 * Get feed statistics
	 */
	getFeedStats() {
		return this.plugin.databaseService.feeds.getFeedStats();
	}

	/**
	 * Update platform URL
	 */
	setPlatformUrl(url: string): void {
		this.apiClient.setPlatformUrl(url);
		logger.info('Platform URL updated in FeedService');
	}

	/**
	 * Delay helper
	 */
	private delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}
