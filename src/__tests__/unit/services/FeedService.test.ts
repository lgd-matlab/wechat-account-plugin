/**
 * Unit tests for FeedService
 * Tests feed subscription, article fetching, and refresh operations
 */

import { FeedService } from '../../../services/FeedService';
import { sampleFeed1, sampleFeed2 } from '../../fixtures/sample-feeds';
import { sampleAccount1 } from '../../fixtures/sample-accounts';
import {
	mockMpInfo1,
	mockGetMpInfoResponse,
	mockGetMpArticlesResponsePage1,
	mockGetMpArticlesResponseEmpty,
} from '../../mocks/api-responses';
import { AccountStatus } from '../../../types';

describe('FeedService', () => {
	let feedService: FeedService;
	let mockPlugin: any;
	let mockDatabaseService: any;
	let mockApiClient: any;
	let mockAccountService: any;

	beforeEach(() => {
		// Mock database service
		mockDatabaseService = {
			feeds: {
				create: jest.fn(),
				findAll: jest.fn(),
				findById: jest.fn(),
				findByFeedId: jest.fn(),
				updateLastSync: jest.fn(),
				updateMetadata: jest.fn(),
				delete: jest.fn(),
				getFeedStats: jest.fn(),
				findNeedingSync: jest.fn(),
			},
			accounts: {
				findById: jest.fn(),
			},
			articles: {
				createBatch: jest.fn(),
				deleteByFeedId: jest.fn(),
			},
		};

		// Mock API client
		mockApiClient = {
			getMpInfo: jest.fn(),
			getMpArticles: jest.fn(),
			setPlatformUrl: jest.fn(),
		};

		// Mock account service
		mockAccountService = {
			getAvailableAccount: jest.fn(),
			handleApiError: jest.fn(),
		};

		// Mock plugin
		mockPlugin = {
			settings: {
				platformUrl: 'https://weread.111965.xyz',
				updateDelay: 0.1, // Short delay for tests
			},
			databaseService: mockDatabaseService,
			accountService: mockAccountService,
		};

		// Create service
		feedService = new FeedService(mockPlugin);
		(feedService as any).apiClient = mockApiClient;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('subscribeFeed', () => {
		it('should subscribe to a new feed successfully', async () => {
			mockApiClient.getMpInfo.mockResolvedValue(mockGetMpInfoResponse);
			mockDatabaseService.feeds.findByFeedId.mockReturnValue(null);
			mockAccountService.getAvailableAccount.mockResolvedValue(sampleAccount1);
			mockDatabaseService.feeds.create.mockResolvedValue(sampleFeed1);
			mockApiClient.getMpArticles.mockResolvedValue(mockGetMpArticlesResponsePage1);

			const result = await feedService.subscribeFeed('https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=test');

			expect(result).toEqual(sampleFeed1);
			expect(mockApiClient.getMpInfo).toHaveBeenCalledWith('https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=test');
			expect(mockDatabaseService.feeds.findByFeedId).toHaveBeenCalledWith(mockMpInfo1.id);
			expect(mockAccountService.getAvailableAccount).toHaveBeenCalled();
			expect(mockDatabaseService.feeds.create).toHaveBeenCalledWith(
				mockMpInfo1.id,
				mockMpInfo1.name,
				mockMpInfo1.intro,
				sampleAccount1.id
			);
		});

		it('should return existing feed if already subscribed', async () => {
			mockApiClient.getMpInfo.mockResolvedValue(mockGetMpInfoResponse);
			mockDatabaseService.feeds.findByFeedId.mockReturnValue(sampleFeed1);

			const result = await feedService.subscribeFeed('https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=test');

			expect(result).toEqual(sampleFeed1);
			expect(mockDatabaseService.feeds.create).not.toHaveBeenCalled();
		});

		it('should throw error if no MP info returned', async () => {
			mockApiClient.getMpInfo.mockResolvedValue([]);

			await expect(feedService.subscribeFeed('https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=test'))
				.rejects.toThrow('Failed to get MP info from share link');
		});

		it('should throw error if no available accounts', async () => {
			mockApiClient.getMpInfo.mockResolvedValue(mockGetMpInfoResponse);
			mockDatabaseService.feeds.findByFeedId.mockReturnValue(null);
			mockAccountService.getAvailableAccount.mockResolvedValue(null);

			await expect(feedService.subscribeFeed('https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=test'))
				.rejects.toThrow('No available accounts to subscribe to feed');
		});

		it('should handle API errors', async () => {
			mockApiClient.getMpInfo.mockRejectedValue(new Error('API error'));

			await expect(feedService.subscribeFeed('https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=test'))
				.rejects.toThrow('API error');
		});
	});

	describe('fetchHistoricalArticles', () => {
		it('should fetch historical articles successfully', async () => {
			mockDatabaseService.feeds.findById.mockReturnValue(sampleFeed1);
			mockDatabaseService.accounts.findById.mockReturnValue(sampleAccount1);
			mockApiClient.getMpArticles.mockResolvedValue(mockGetMpArticlesResponsePage1);
			mockDatabaseService.articles.createBatch.mockResolvedValue(mockGetMpArticlesResponsePage1.length);

			const result = await feedService.fetchHistoricalArticles(sampleFeed1.id, sampleFeed1.feedId, 1);

			expect(result).toBe(mockGetMpArticlesResponsePage1.length);
			expect(mockApiClient.getMpArticles).toHaveBeenCalledWith(
				sampleFeed1.feedId,
				sampleAccount1.id.toString(),
				sampleAccount1.cookie,
				1
			);
			expect(mockDatabaseService.articles.createBatch).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({
						feedId: sampleFeed1.id,
						title: mockGetMpArticlesResponsePage1[0].title,
						url: expect.stringContaining(mockGetMpArticlesResponsePage1[0].id),
					}),
				])
			);
			expect(mockDatabaseService.feeds.updateLastSync).toHaveBeenCalledWith(sampleFeed1.id);
		});

		it('should handle multiple pages of articles', async () => {
			mockDatabaseService.feeds.findById.mockReturnValue(sampleFeed1);
			mockDatabaseService.accounts.findById.mockReturnValue(sampleAccount1);
			mockApiClient.getMpArticles
				.mockResolvedValueOnce(mockGetMpArticlesResponsePage1)
				.mockResolvedValueOnce(mockGetMpArticlesResponsePage1)
				.mockResolvedValueOnce([]);
			mockDatabaseService.articles.createBatch.mockResolvedValue(mockGetMpArticlesResponsePage1.length);

			const result = await feedService.fetchHistoricalArticles(sampleFeed1.id, sampleFeed1.feedId, 3);

			expect(result).toBe(mockGetMpArticlesResponsePage1.length * 2);
			expect(mockApiClient.getMpArticles).toHaveBeenCalledTimes(3);
		});

		it('should stop when no more articles available', async () => {
			mockDatabaseService.feeds.findById.mockReturnValue(sampleFeed1);
			mockDatabaseService.accounts.findById.mockReturnValue(sampleAccount1);
			mockApiClient.getMpArticles.mockResolvedValue([]);
			mockDatabaseService.articles.createBatch.mockResolvedValue(0);

			const result = await feedService.fetchHistoricalArticles(sampleFeed1.id, sampleFeed1.feedId, 5);

			expect(result).toBe(0);
			expect(mockApiClient.getMpArticles).toHaveBeenCalledTimes(1);
		});

		it('should throw error if feed not found', async () => {
			mockDatabaseService.feeds.findById.mockReturnValue(null);

			await expect(feedService.fetchHistoricalArticles(999, 'test_id'))
				.rejects.toThrow('Feed not found');
		});

		it('should throw error if account not found', async () => {
			mockDatabaseService.feeds.findById.mockReturnValue(sampleFeed1);
			mockDatabaseService.accounts.findById.mockReturnValue(null);

			await expect(feedService.fetchHistoricalArticles(sampleFeed1.id, sampleFeed1.feedId))
				.rejects.toThrow('Feed account not found');
		});

		it('should handle API errors and call handleApiError', async () => {
			mockDatabaseService.feeds.findById.mockReturnValue(sampleFeed1);
			mockDatabaseService.accounts.findById.mockReturnValue(sampleAccount1);
			mockApiClient.getMpArticles.mockRejectedValue(new Error('API error'));

			const result = await feedService.fetchHistoricalArticles(sampleFeed1.id, sampleFeed1.feedId, 1);

			expect(result).toBe(0); // No articles fetched due to error
			expect(mockAccountService.handleApiError).toHaveBeenCalledWith(sampleAccount1.id, expect.any(Error));
		});
	});

	describe('refreshFeed', () => {
		it('should refresh feed and fetch new articles', async () => {
			mockDatabaseService.feeds.findById.mockReturnValue(sampleFeed1);
			mockDatabaseService.accounts.findById.mockReturnValue(sampleAccount1);
			mockApiClient.getMpArticles.mockResolvedValue(mockGetMpArticlesResponsePage1);
			mockDatabaseService.articles.createBatch.mockResolvedValue(mockGetMpArticlesResponsePage1.length);

			const result = await feedService.refreshFeed(sampleFeed1.id);

			expect(result).toBe(mockGetMpArticlesResponsePage1.length);
			expect(mockApiClient.getMpArticles).toHaveBeenCalledWith(
				sampleFeed1.feedId,
				sampleAccount1.id.toString(),
				sampleAccount1.cookie,
				1
			);
			expect(mockDatabaseService.feeds.updateLastSync).toHaveBeenCalledWith(sampleFeed1.id);
		});

		it('should return 0 when no new articles found', async () => {
			mockDatabaseService.feeds.findById.mockReturnValue(sampleFeed1);
			mockDatabaseService.accounts.findById.mockReturnValue(sampleAccount1);
			mockApiClient.getMpArticles.mockResolvedValue([]);

			const result = await feedService.refreshFeed(sampleFeed1.id);

			expect(result).toBe(0);
			expect(mockDatabaseService.articles.createBatch).not.toHaveBeenCalled();
			expect(mockDatabaseService.feeds.updateLastSync).toHaveBeenCalledWith(sampleFeed1.id);
		});

		it('should throw error if feed not found', async () => {
			mockDatabaseService.feeds.findById.mockReturnValue(null);

			await expect(feedService.refreshFeed(999))
				.rejects.toThrow('Feed not found');
		});

		it('should throw error if account not found', async () => {
			mockDatabaseService.feeds.findById.mockReturnValue(sampleFeed1);
			mockDatabaseService.accounts.findById.mockReturnValue(null);

			await expect(feedService.refreshFeed(sampleFeed1.id))
				.rejects.toThrow('Feed account not found');
		});

		it('should handle API errors and call handleApiError', async () => {
			mockDatabaseService.feeds.findById.mockReturnValue(sampleFeed1);
			mockDatabaseService.accounts.findById.mockReturnValue(sampleAccount1);
			mockApiClient.getMpArticles.mockRejectedValue(new Error('API error'));

			await expect(feedService.refreshFeed(sampleFeed1.id))
				.rejects.toThrow('API error');
			expect(mockAccountService.handleApiError).toHaveBeenCalledWith(sampleFeed1.accountId, expect.any(Error));
		});
	});

	describe('refreshAllFeeds', () => {
		it('should refresh all feeds successfully', async () => {
			mockDatabaseService.feeds.findAll.mockReturnValue([sampleFeed1, sampleFeed2]);
			mockDatabaseService.feeds.findById
				.mockReturnValueOnce(sampleFeed1)
				.mockReturnValueOnce(sampleFeed2);
			mockDatabaseService.accounts.findById.mockReturnValue(sampleAccount1);
			mockApiClient.getMpArticles.mockResolvedValue(mockGetMpArticlesResponsePage1);
			mockDatabaseService.articles.createBatch.mockResolvedValue(mockGetMpArticlesResponsePage1.length);

			const result = await feedService.refreshAllFeeds();

			expect(result).toEqual({
				total: 2,
				successful: 2,
				failed: 0,
			});
		});

		it('should handle partial failures', async () => {
			mockDatabaseService.feeds.findAll.mockReturnValue([sampleFeed1, sampleFeed2]);
			mockDatabaseService.feeds.findById
				.mockReturnValueOnce(sampleFeed1)
				.mockReturnValueOnce(sampleFeed2);
			mockDatabaseService.accounts.findById.mockReturnValue(sampleAccount1);
			mockApiClient.getMpArticles
				.mockResolvedValueOnce(mockGetMpArticlesResponsePage1)
				.mockRejectedValueOnce(new Error('API error'));
			mockDatabaseService.articles.createBatch.mockResolvedValue(mockGetMpArticlesResponsePage1.length);

			const result = await feedService.refreshAllFeeds();

			expect(result).toEqual({
				total: 2,
				successful: 1,
				failed: 1,
			});
		});

		it('should return empty results when no feeds exist', async () => {
			mockDatabaseService.feeds.findAll.mockReturnValue([]);

			const result = await feedService.refreshAllFeeds();

			expect(result).toEqual({
				total: 0,
				successful: 0,
				failed: 0,
			});
		});
	});

	describe('refreshStaleFeeds', () => {
		it('should refresh only stale feeds', async () => {
			mockDatabaseService.feeds.findNeedingSync.mockReturnValue([sampleFeed1]);
			mockDatabaseService.feeds.findById.mockReturnValue(sampleFeed1);
			mockDatabaseService.accounts.findById.mockReturnValue(sampleAccount1);
			mockApiClient.getMpArticles.mockResolvedValue(mockGetMpArticlesResponsePage1);
			mockDatabaseService.articles.createBatch.mockResolvedValue(mockGetMpArticlesResponsePage1.length);

			const result = await feedService.refreshStaleFeeds(1);

			expect(result).toBe(1);
			expect(mockDatabaseService.feeds.findNeedingSync).toHaveBeenCalledWith(3600000); // 1 hour in ms
		});

		it('should return 0 when no stale feeds exist', async () => {
			mockDatabaseService.feeds.findNeedingSync.mockReturnValue([]);

			const result = await feedService.refreshStaleFeeds(1);

			expect(result).toBe(0);
		});

		it('should handle errors while refreshing stale feeds', async () => {
			mockDatabaseService.feeds.findNeedingSync.mockReturnValue([sampleFeed1]);
			mockDatabaseService.feeds.findById.mockReturnValue(sampleFeed1);
			mockDatabaseService.accounts.findById.mockReturnValue(sampleAccount1);
			mockApiClient.getMpArticles.mockRejectedValue(new Error('API error'));

			const result = await feedService.refreshStaleFeeds(1);

			expect(result).toBe(0); // No feeds successfully refreshed
		});
	});

	describe('updateFeedMetadata', () => {
		it('should update feed metadata', async () => {
			await feedService.updateFeedMetadata(sampleFeed1.id, 'New Title', 'New Description');

			expect(mockDatabaseService.feeds.updateMetadata).toHaveBeenCalledWith(
				sampleFeed1.id,
				'New Title',
				'New Description'
			);
		});
	});

	describe('deleteFeed', () => {
		it('should delete feed and associated articles', async () => {
			await feedService.deleteFeed(sampleFeed1.id);

			expect(mockDatabaseService.articles.deleteByFeedId).toHaveBeenCalledWith(sampleFeed1.id);
			expect(mockDatabaseService.feeds.delete).toHaveBeenCalledWith(sampleFeed1.id);
		});
	});

	describe('getAllFeeds', () => {
		it('should return all feeds', () => {
			const feeds = [sampleFeed1, sampleFeed2];
			mockDatabaseService.feeds.findAll.mockReturnValue(feeds);

			const result = feedService.getAllFeeds();

			expect(result).toEqual(feeds);
		});
	});

	describe('getFeed', () => {
		it('should return feed by ID', () => {
			mockDatabaseService.feeds.findById.mockReturnValue(sampleFeed1);

			const result = feedService.getFeed(sampleFeed1.id);

			expect(result).toEqual(sampleFeed1);
		});

		it('should return null for non-existent feed', () => {
			mockDatabaseService.feeds.findById.mockReturnValue(null);

			const result = feedService.getFeed(99999);

			expect(result).toBeNull();
		});
	});

	describe('getFeedStats', () => {
		it('should return feed statistics', () => {
			const stats = {
				totalFeeds: 5,
				totalArticles: 100,
				unsyncedArticles: 20,
			};
			mockDatabaseService.feeds.getFeedStats.mockReturnValue(stats);

			const result = feedService.getFeedStats();

			expect(result).toEqual(stats);
		});
	});

	describe('setPlatformUrl', () => {
		it('should update platform URL in API client', () => {
			feedService.setPlatformUrl('https://new-platform.com');

			expect(mockApiClient.setPlatformUrl).toHaveBeenCalledWith('https://new-platform.com');
		});
	});
});
