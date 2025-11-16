import { Feed as FeedGenerator } from 'feed';
import { Feed, Article } from '../../types';
import { matchesPatterns } from '../../utils/helpers';
import { logger } from '../../utils/logger';

/**
 * FeedGenerator - Generates RSS/Atom/JSON feeds
 *
 * Creates standard feed formats from articles
 */
export class WeWeFeedGenerator {
	private baseUrl: string;

	constructor(baseUrl?: string) {
		this.baseUrl = baseUrl || '';
	}

	/**
	 * Generate RSS feed for a specific feed
	 */
	generateRss(
		feed: Feed,
		articles: Article[],
		options?: {
			titleInclude?: string[];
			titleExclude?: string[];
			limit?: number;
		}
	): string {
		const feedGenerator = this.createFeedGenerator(feed, articles, options);
		return feedGenerator.rss2();
	}

	/**
	 * Generate Atom feed for a specific feed
	 */
	generateAtom(
		feed: Feed,
		articles: Article[],
		options?: {
			titleInclude?: string[];
			titleExclude?: string[];
			limit?: number;
		}
	): string {
		const feedGenerator = this.createFeedGenerator(feed, articles, options);
		return feedGenerator.atom1();
	}

	/**
	 * Generate JSON feed for a specific feed
	 */
	generateJson(
		feed: Feed,
		articles: Article[],
		options?: {
			titleInclude?: string[];
			titleExclude?: string[];
			limit?: number;
		}
	): string {
		const feedGenerator = this.createFeedGenerator(feed, articles, options);
		return feedGenerator.json1();
	}

	/**
	 * Generate feed for all feeds combined
	 */
	generateCombinedRss(
		feeds: Feed[],
		articlesMap: Map<number, Article[]>,
		options?: {
			titleInclude?: string[];
			titleExclude?: string[];
			limit?: number;
		}
	): string {
		// Combine all articles
		const allArticles: Article[] = [];
		feeds.forEach(feed => {
			const feedArticles = articlesMap.get(feed.id) || [];
			allArticles.push(...feedArticles);
		});

		// Sort by publish date
		allArticles.sort((a, b) => b.publishedAt - a.publishedAt);

		// Create combined feed
		const feedGenerator = new FeedGenerator({
			title: 'WeWe RSS - All Feeds',
			description: 'Combined feed from all subscribed WeChat public accounts',
			id: this.baseUrl || 'wewe-rss-all',
			link: this.baseUrl || 'wewe-rss-all',
			language: 'zh-CN',
			copyright: 'WeWe RSS',
			generator: 'WeWe RSS for Obsidian',
			feedLinks: {
				rss: `${this.baseUrl}/feeds/all.rss`,
				atom: `${this.baseUrl}/feeds/all.atom`,
				json: `${this.baseUrl}/feeds/all.json`,
			},
		});

		// Filter and add articles
		const filtered = this.filterArticles(allArticles, options);
		this.addArticlesToFeed(feedGenerator, filtered);

		return feedGenerator.rss2();
	}

	/**
	 * Create feed generator instance
	 */
	private createFeedGenerator(
		feed: Feed,
		articles: Article[],
		options?: {
			titleInclude?: string[];
			titleExclude?: string[];
			limit?: number;
		}
	): FeedGenerator {
		const feedGenerator = new FeedGenerator({
			title: feed.title,
			description: feed.description,
			id: feed.feedId,
			link: `https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=${feed.feedId}`,
			language: 'zh-CN',
			copyright: feed.title,
			generator: 'WeWe RSS for Obsidian',
			feedLinks: {
				rss: `${this.baseUrl}/feeds/${feed.feedId}.rss`,
				atom: `${this.baseUrl}/feeds/${feed.feedId}.atom`,
				json: `${this.baseUrl}/feeds/${feed.feedId}.json`,
			},
		});

		// Filter articles
		const filtered = this.filterArticles(articles, options);

		// Add articles to feed
		this.addArticlesToFeed(feedGenerator, filtered);

		return feedGenerator;
	}

	/**
	 * Filter articles based on title patterns and limit
	 */
	private filterArticles(
		articles: Article[],
		options?: {
			titleInclude?: string[];
			titleExclude?: string[];
			limit?: number;
		}
	): Article[] {
		let filtered = [...articles];

		// Apply title include filter
		if (options?.titleInclude && options.titleInclude.length > 0) {
			filtered = filtered.filter(article =>
				matchesPatterns(article.title, options.titleInclude!)
			);
		}

		// Apply title exclude filter
		if (options?.titleExclude && options.titleExclude.length > 0) {
			filtered = filtered.filter(article =>
				!matchesPatterns(article.title, options.titleExclude!)
			);
		}

		// Apply limit
		if (options?.limit && options.limit > 0) {
			filtered = filtered.slice(0, options.limit);
		}

		return filtered;
	}

	/**
	 * Add articles to feed generator
	 */
	private addArticlesToFeed(feedGenerator: FeedGenerator, articles: Article[]): void {
		articles.forEach(article => {
			try {
				feedGenerator.addItem({
					title: article.title,
					id: article.url,
					link: article.url,
					description: article.content || '',
					content: article.contentHtml || article.content || '',
					date: new Date(article.publishedAt),
					published: new Date(article.publishedAt),
				});
			} catch (error) {
				logger.error('Failed to add article to feed:', error);
			}
		});
	}

	/**
	 * Update base URL
	 */
	setBaseUrl(url: string): void {
		this.baseUrl = url;
	}
}
