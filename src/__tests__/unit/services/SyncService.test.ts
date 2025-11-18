/**
 * Unit tests for SyncService
 * Tests sync operations, cleanup, and note management
 */

import { SyncService } from '../../../services/SyncService';
import { ArticleRepository } from '../../../services/database/repositories/ArticleRepository';
import { FeedRepository } from '../../../services/database/repositories/FeedRepository';
import { NoteCreator } from '../../../services/NoteCreator';
import { FeedService } from '../../../services/FeedService';

// Mock logger
jest.mock('../../../utils/logger', () => ({
	Logger: jest.fn().mockImplementation(() => ({
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
	})),
}));

describe('SyncService', () => {
	let syncService: SyncService;
	let mockPlugin: any;
	let mockArticleRepository: jest.Mocked<ArticleRepository>;
	let mockFeedRepository: jest.Mocked<FeedRepository>;
	let mockNoteCreator: jest.Mocked<NoteCreator>;
	let mockFeedService: jest.Mocked<FeedService>;

	beforeEach(() => {
		// Mock ArticleRepository
		mockArticleRepository = {
			cleanupOldArticles: jest.fn(),
			cleanupSynced: jest.fn(),
			findAll: jest.fn(),
			findUnsynced: jest.fn(),
			countArticlesOlderThan: jest.fn(),
		} as any;

		// Mock FeedRepository
		mockFeedRepository = {
			findAll: jest.fn(),
			findById: jest.fn(),
			findNeedingSync: jest.fn(),
		} as any;

		// Mock NoteCreator
		mockNoteCreator = {
			createNotesFromArticles: jest.fn(),
			deleteNotesByArticleIds: jest.fn(),
		} as any;

		// Mock FeedService
		mockFeedService = {
			refreshFeed: jest.fn(),
		} as any;

		// Mock plugin with all required services
		mockPlugin = {
			settings: {
				lastCleanupRetentionDays: 30,
				articleRetentionDays: 30,
			},
			databaseService: {
				articles: mockArticleRepository,
				feeds: mockFeedRepository,
			},
			noteCreator: mockNoteCreator,
			feedService: mockFeedService,
		};

		syncService = new SyncService(mockPlugin);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('cleanupOldArticles', () => {
		it('should delete both articles and notes with specified retention days', async () => {
			// Arrange
			const retentionDays = 30;
			const deletedIds = [1, 2, 3];
			const articlesCount = 3;
			const notesCount = 3;

			mockArticleRepository.cleanupOldArticles.mockReturnValue({
				deletedIds,
				count: articlesCount,
			});
			mockNoteCreator.deleteNotesByArticleIds.mockResolvedValue(notesCount);

			// Act
			const result = await syncService.cleanupOldArticles(retentionDays);

			// Assert
			expect(result).toEqual({
				articlesDeleted: articlesCount,
				notesDeleted: notesCount,
			});
			expect(mockArticleRepository.cleanupOldArticles).toHaveBeenCalledWith(retentionDays);
			expect(mockNoteCreator.deleteNotesByArticleIds).toHaveBeenCalledWith(deletedIds);
		});

		it('should use default retention days when not specified', async () => {
			// Arrange
			mockArticleRepository.cleanupOldArticles.mockReturnValue({
				deletedIds: [],
				count: 0,
			});
			mockNoteCreator.deleteNotesByArticleIds.mockResolvedValue(0);

			// Act
			await syncService.cleanupOldArticles();

			// Assert
			expect(mockArticleRepository.cleanupOldArticles).toHaveBeenCalledWith(30); // default value
		});

		it('should handle case when no articles are deleted', async () => {
			// Arrange
			const retentionDays = 7;
			mockArticleRepository.cleanupOldArticles.mockReturnValue({
				deletedIds: [],
				count: 0,
			});
			mockNoteCreator.deleteNotesByArticleIds.mockResolvedValue(0);

			// Act
			const result = await syncService.cleanupOldArticles(retentionDays);

			// Assert
			expect(result).toEqual({
				articlesDeleted: 0,
				notesDeleted: 0,
			});
			// When no articles to delete, note deletion is skipped (early return)
			expect(mockNoteCreator.deleteNotesByArticleIds).not.toHaveBeenCalled();
		});

		it('should handle case when articles deleted but notes already removed', async () => {
			// Arrange
			const retentionDays = 15;
			const deletedIds = [1, 2, 3];
			mockArticleRepository.cleanupOldArticles.mockReturnValue({
				deletedIds,
				count: 3,
			});
			// Notes already deleted or don't exist
			mockNoteCreator.deleteNotesByArticleIds.mockResolvedValue(0);

			// Act
			const result = await syncService.cleanupOldArticles(retentionDays);

			// Assert
			expect(result).toEqual({
				articlesDeleted: 3,
				notesDeleted: 0,
			});
		});

		it('should handle different retention day values', async () => {
			// Test with 1 day
			mockArticleRepository.cleanupOldArticles.mockReturnValue({
				deletedIds: [1],
				count: 1,
			});
			mockNoteCreator.deleteNotesByArticleIds.mockResolvedValue(1);

			let result = await syncService.cleanupOldArticles(1);
			expect(mockArticleRepository.cleanupOldArticles).toHaveBeenCalledWith(1);

			// Test with 365 days
			result = await syncService.cleanupOldArticles(365);
			expect(mockArticleRepository.cleanupOldArticles).toHaveBeenCalledWith(365);

			// Test with 7 days
			result = await syncService.cleanupOldArticles(7);
			expect(mockArticleRepository.cleanupOldArticles).toHaveBeenCalledWith(7);
		});

		it('should handle errors from article repository gracefully', async () => {
			// Arrange
			const error = new Error('Database error');
			mockArticleRepository.cleanupOldArticles.mockImplementation(() => {
				throw error;
			});

			// Act
			const result = await syncService.cleanupOldArticles(30);

			// Assert - should return zeros instead of propagating error
			expect(result).toEqual({
				articlesDeleted: 0,
				notesDeleted: 0,
			});
		});

		it('should handle errors from note creator gracefully', async () => {
			// Arrange
			mockArticleRepository.cleanupOldArticles.mockReturnValue({
				deletedIds: [1, 2],
				count: 2,
			});
			const error = new Error('File system error');
			mockNoteCreator.deleteNotesByArticleIds.mockRejectedValue(error);

			// Act
			const result = await syncService.cleanupOldArticles(30);

			// Assert - should return zeros instead of propagating error
			expect(result).toEqual({
				articlesDeleted: 0,
				notesDeleted: 0,
			});
		});

		it('should handle large batches of articles', async () => {
			// Arrange
			const retentionDays = 60;
			const largeIdList = Array.from({ length: 1000 }, (_, i) => i + 1);
			mockArticleRepository.cleanupOldArticles.mockReturnValue({
				deletedIds: largeIdList,
				count: 1000,
			});
			mockNoteCreator.deleteNotesByArticleIds.mockResolvedValue(1000);

			// Act
			const result = await syncService.cleanupOldArticles(retentionDays);

			// Assert
			expect(result.articlesDeleted).toBe(1000);
			expect(result.notesDeleted).toBe(1000);
			expect(mockNoteCreator.deleteNotesByArticleIds).toHaveBeenCalledWith(largeIdList);
		});

		it('should handle mismatched article and note counts gracefully', async () => {
			// Arrange - 5 articles deleted but only 3 notes found/deleted
			const retentionDays = 30;
			mockArticleRepository.cleanupOldArticles.mockReturnValue({
				deletedIds: [1, 2, 3, 4, 5],
				count: 5,
			});
			mockNoteCreator.deleteNotesByArticleIds.mockResolvedValue(3);

			// Act
			const result = await syncService.cleanupOldArticles(retentionDays);

			// Assert
			expect(result).toEqual({
				articlesDeleted: 5,
				notesDeleted: 3,
			});
		});

		it('should work with different retention policies', async () => {
			// Test aggressive cleanup (1 day)
			mockArticleRepository.cleanupOldArticles.mockReturnValue({
				deletedIds: [1, 2, 3, 4, 5],
				count: 5,
			});
			mockNoteCreator.deleteNotesByArticleIds.mockResolvedValue(5);

			let result = await syncService.cleanupOldArticles(1);
			expect(result.articlesDeleted).toBe(5);

			// Test lenient cleanup (365 days)
			mockArticleRepository.cleanupOldArticles.mockReturnValue({
				deletedIds: [1],
				count: 1,
			});
			mockNoteCreator.deleteNotesByArticleIds.mockResolvedValue(1);

			result = await syncService.cleanupOldArticles(365);
			expect(result.articlesDeleted).toBe(1);
		});

		it('should maintain call order - articles then notes', async () => {
			// Arrange
			const callOrder: string[] = [];
			mockArticleRepository.cleanupOldArticles.mockImplementation(() => {
				callOrder.push('articles');
				return { deletedIds: [1, 2], count: 2 };
			});
			mockNoteCreator.deleteNotesByArticleIds.mockImplementation(async () => {
				callOrder.push('notes');
				return 2;
			});

			// Act
			await syncService.cleanupOldArticles(30);

			// Assert
			expect(callOrder).toEqual(['articles', 'notes']);
		});
	});

	describe('cleanupOldArticles - return type verification', () => {
		it('should return object with articlesDeleted and notesDeleted properties', async () => {
			// Arrange
			mockArticleRepository.cleanupOldArticles.mockReturnValue({
				deletedIds: [1, 2, 3],
				count: 3,
			});
			mockNoteCreator.deleteNotesByArticleIds.mockResolvedValue(3);

			// Act
			const result = await syncService.cleanupOldArticles(30);

			// Assert
			expect(result).toHaveProperty('articlesDeleted');
			expect(result).toHaveProperty('notesDeleted');
			expect(typeof result.articlesDeleted).toBe('number');
			expect(typeof result.notesDeleted).toBe('number');
		});

		it('should return non-negative counts', async () => {
			// Arrange
			mockArticleRepository.cleanupOldArticles.mockReturnValue({
				deletedIds: [1, 2],
				count: 2,
			});
			mockNoteCreator.deleteNotesByArticleIds.mockResolvedValue(2);

			// Act
			const result = await syncService.cleanupOldArticles(30);

			// Assert
			expect(result.articlesDeleted).toBeGreaterThanOrEqual(0);
			expect(result.notesDeleted).toBeGreaterThanOrEqual(0);
		});
	});
});
