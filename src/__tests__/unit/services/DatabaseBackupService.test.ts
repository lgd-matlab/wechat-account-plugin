/**
 * Unit tests for DatabaseBackupService
 * Tests backup creation, restoration, listing, and cleanup
 */

import { DatabaseBackupService } from '../../../services/database/DatabaseBackupService';
import { BackupReason } from '../../../types';
import { App } from 'obsidian';

describe('DatabaseBackupService', () => {
	let backupService: DatabaseBackupService;
	let mockApp: any;
	let mockAdapter: any;
	const pluginDir = '.obsidian/plugins/wewe-rss';
	const backupDir = `${pluginDir}/backups`;
	const dbPath = `${pluginDir}/wewe-rss.db`;

	beforeEach(() => {
		// Mock file adapter
		mockAdapter = {
			exists: jest.fn(),
			mkdir: jest.fn(),
			copy: jest.fn(),
			remove: jest.fn(),
			stat: jest.fn(),
			list: jest.fn(),
		};

		// Mock Obsidian App
		mockApp = {
			vault: {
				adapter: mockAdapter,
			},
		} as any;

		backupService = new DatabaseBackupService(
			mockApp as App,
			pluginDir
		);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('initialize', () => {
		it('should create backup directory if it does not exist', async () => {
			mockAdapter.exists.mockResolvedValue(false);

			await backupService.initialize();

			expect(mockAdapter.exists).toHaveBeenCalledWith(backupDir);
			expect(mockAdapter.mkdir).toHaveBeenCalledWith(backupDir);
		});

		it('should not create backup directory if it already exists', async () => {
			mockAdapter.exists.mockResolvedValue(true);

			await backupService.initialize();

			expect(mockAdapter.exists).toHaveBeenCalledWith(backupDir);
			expect(mockAdapter.mkdir).not.toHaveBeenCalled();
		});

		it('should handle errors during initialization', async () => {
			mockAdapter.exists.mockRejectedValue(
				new Error('File system error')
			);

			await expect(backupService.initialize()).rejects.toThrow(
				'File system error'
			);
		});
	});

	describe('createBackup', () => {
		it('should create backup with MANUAL reason', async () => {
			const timestamp = 1700000000000;
			jest.spyOn(Date, 'now').mockReturnValue(timestamp);

			mockAdapter.exists.mockResolvedValue(true);
			mockAdapter.stat.mockResolvedValue({ size: 1024 });

			const backupPath = await backupService.createBackup(
				BackupReason.MANUAL
			);

			expect(mockAdapter.exists).toHaveBeenCalledWith(dbPath);
			expect(mockAdapter.copy).toHaveBeenCalledWith(
				dbPath,
				`${backupDir}/wewe-rss-backup-${timestamp}-manual.db`
			);
			expect(backupPath).toBe(
				`${backupDir}/wewe-rss-backup-${timestamp}-manual.db`
			);
		});

		it('should create backup with AUTO reason', async () => {
			const timestamp = 1700000000000;
			jest.spyOn(Date, 'now').mockReturnValue(timestamp);

			mockAdapter.exists.mockResolvedValue(true);
			mockAdapter.stat.mockResolvedValue({ size: 2048 });

			const backupPath = await backupService.createBackup(
				BackupReason.AUTO
			);

			expect(backupPath).toContain('auto.db');
		});

		it('should create backup with PRE_INITIALIZATION reason', async () => {
			const timestamp = 1700000000000;
			jest.spyOn(Date, 'now').mockReturnValue(timestamp);

			mockAdapter.exists.mockResolvedValue(true);
			mockAdapter.stat.mockResolvedValue({ size: 512 });

			const backupPath = await backupService.createBackup(
				BackupReason.PRE_INITIALIZATION
			);

			expect(backupPath).toContain('pre-initialization.db');
		});

		it('should throw error if database does not exist', async () => {
			mockAdapter.exists.mockResolvedValue(false);

			await expect(
				backupService.createBackup(BackupReason.MANUAL)
			).rejects.toThrow('Database file does not exist');

			expect(mockAdapter.copy).not.toHaveBeenCalled();
		});

		it('should handle copy errors', async () => {
			mockAdapter.exists.mockResolvedValue(true);
			mockAdapter.copy.mockRejectedValue(
				new Error('Copy failed')
			);

			await expect(
				backupService.createBackup(BackupReason.MANUAL)
			).rejects.toThrow('Copy failed');
		});
	});

	describe('restoreBackup', () => {
		const backupPath = `${backupDir}/wewe-rss-backup-1700000000000-manual.db`;

		it('should restore database from backup', async () => {
			mockAdapter.exists.mockImplementation((path: string) => {
				if (path === backupPath) return Promise.resolve(true);
				if (path === dbPath) return Promise.resolve(true);
				return Promise.resolve(false);
			});

			await backupService.restoreBackup(backupPath);

			// Should save corrupted DB
			expect(mockAdapter.copy).toHaveBeenCalledWith(
				dbPath,
				expect.stringContaining('wewe-rss-corrupted-')
			);

			// Should restore from backup
			expect(mockAdapter.copy).toHaveBeenCalledWith(
				backupPath,
				dbPath
			);
		});

		it('should throw error if backup does not exist', async () => {
			mockAdapter.exists.mockResolvedValue(false);

			await expect(
				backupService.restoreBackup(backupPath)
			).rejects.toThrow('Backup file not found');

			expect(mockAdapter.copy).not.toHaveBeenCalled();
		});

		it('should restore even if current database does not exist', async () => {
			mockAdapter.exists.mockImplementation((path: string) => {
				if (path === backupPath) return Promise.resolve(true);
				if (path === dbPath) return Promise.resolve(false);
				return Promise.resolve(false);
			});

			await backupService.restoreBackup(backupPath);

			// Should not try to save non-existent corrupted DB
			expect(mockAdapter.copy).toHaveBeenCalledTimes(1);
			expect(mockAdapter.copy).toHaveBeenCalledWith(
				backupPath,
				dbPath
			);
		});

		it('should handle restoration errors', async () => {
			mockAdapter.exists.mockResolvedValue(true);
			mockAdapter.copy.mockRejectedValue(
				new Error('Restoration failed')
			);

			await expect(
				backupService.restoreBackup(backupPath)
			).rejects.toThrow('Restoration failed');
		});
	});

	describe('listBackups', () => {
		it('should return empty array if backup directory does not exist', async () => {
			mockAdapter.exists.mockResolvedValue(false);

			const backups = await backupService.listBackups();

			expect(backups).toEqual([]);
		});

		it('should return empty array if no backup files exist', async () => {
			mockAdapter.exists.mockResolvedValue(true);
			mockAdapter.list.mockResolvedValue({
				files: [],
				folders: [],
			});

			const backups = await backupService.listBackups();

			expect(backups).toEqual([]);
		});

		it('should list all backup files sorted by timestamp (newest first)', async () => {
			mockAdapter.exists.mockResolvedValue(true);
			mockAdapter.list.mockResolvedValue({
				files: [
					`${backupDir}/wewe-rss-backup-1700000000000-manual.db`,
					`${backupDir}/wewe-rss-backup-1700000060000-auto.db`,
					`${backupDir}/wewe-rss-backup-1700000030000-pre-initialization.db`,
				],
				folders: [],
			});

			mockAdapter.stat.mockImplementation((path: string) => {
				if (path.includes('1700000000000'))
					return Promise.resolve({ size: 1024 });
				if (path.includes('1700000060000'))
					return Promise.resolve({ size: 2048 });
				if (path.includes('1700000030000'))
					return Promise.resolve({ size: 512 });
				return Promise.resolve({ size: 0 });
			});

			const backups = await backupService.listBackups();

			expect(backups).toHaveLength(3);
			expect(backups[0].timestamp).toBe(1700000060000); // Newest first
			expect(backups[0].reason).toBe(BackupReason.AUTO);
			expect(backups[0].size).toBe(2048);

			expect(backups[1].timestamp).toBe(1700000030000);
			expect(backups[1].reason).toBe(BackupReason.PRE_INITIALIZATION);

			expect(backups[2].timestamp).toBe(1700000000000); // Oldest last
			expect(backups[2].reason).toBe(BackupReason.MANUAL);
		});

		it('should ignore files that do not match backup pattern', async () => {
			mockAdapter.exists.mockResolvedValue(true);
			mockAdapter.list.mockResolvedValue({
				files: [
					`${backupDir}/wewe-rss-backup-1700000000000-manual.db`,
					`${backupDir}/some-other-file.db`,
					`${backupDir}/wewe-rss-corrupted-123.db`,
				],
				folders: [],
			});

			mockAdapter.stat.mockResolvedValue({ size: 1024 });

			const backups = await backupService.listBackups();

			expect(backups).toHaveLength(1);
			expect(backups[0].reason).toBe(BackupReason.MANUAL);
		});

		it('should handle errors when listing backups', async () => {
			mockAdapter.exists.mockResolvedValue(true);
			mockAdapter.list.mockRejectedValue(
				new Error('List failed')
			);

			const backups = await backupService.listBackups();

			expect(backups).toEqual([]);
		});
	});

	describe('cleanOldBackups', () => {
		it('should delete backups older than retention days', async () => {
			const now = 1700000000000;
			jest.spyOn(Date, 'now').mockReturnValue(now);

			const retentionDays = 7;
			const cutoffTime = now - retentionDays * 24 * 60 * 60 * 1000;

			mockAdapter.exists.mockResolvedValue(true);
			mockAdapter.list.mockResolvedValue({
				files: [
					`${backupDir}/wewe-rss-backup-${now}-manual.db`, // Current
					`${backupDir}/wewe-rss-backup-${cutoffTime - 1000}-auto.db`, // Old
					`${backupDir}/wewe-rss-backup-${cutoffTime + 1000}-manual.db`, // Recent
				],
				folders: [],
			});

			mockAdapter.stat.mockResolvedValue({ size: 1024 });

			const deletedCount =
				await backupService.cleanOldBackups(retentionDays);

			expect(deletedCount).toBe(1);
			expect(mockAdapter.remove).toHaveBeenCalledWith(
				`${backupDir}/wewe-rss-backup-${cutoffTime - 1000}-auto.db`
			);
			expect(mockAdapter.remove).toHaveBeenCalledTimes(1);
		});

		it('should not delete backups within retention period', async () => {
			const now = 1700000000000;
			jest.spyOn(Date, 'now').mockReturnValue(now);

			const retentionDays = 7;

			mockAdapter.exists.mockResolvedValue(true);
			mockAdapter.list.mockResolvedValue({
				files: [
					`${backupDir}/wewe-rss-backup-${now}-manual.db`,
					`${backupDir}/wewe-rss-backup-${now - 3600000}-auto.db`, // 1 hour ago
				],
				folders: [],
			});

			mockAdapter.stat.mockResolvedValue({ size: 1024 });

			const deletedCount =
				await backupService.cleanOldBackups(retentionDays);

			expect(deletedCount).toBe(0);
			expect(mockAdapter.remove).not.toHaveBeenCalled();
		});

		it('should handle deletion errors gracefully', async () => {
			const now = 1700000000000;
			jest.spyOn(Date, 'now').mockReturnValue(now);

			const retentionDays = 7;
			const oldTimestamp = now - 10 * 24 * 60 * 60 * 1000;

			mockAdapter.exists.mockResolvedValue(true);
			mockAdapter.list.mockResolvedValue({
				files: [
					`${backupDir}/wewe-rss-backup-${oldTimestamp}-auto.db`,
				],
				folders: [],
			});

			mockAdapter.stat.mockResolvedValue({ size: 1024 });
			mockAdapter.remove.mockRejectedValue(
				new Error('Delete failed')
			);

			const deletedCount =
				await backupService.cleanOldBackups(retentionDays);

			expect(deletedCount).toBe(0); // Should continue despite error
		});

		it('should return 0 if no backups exist', async () => {
			mockAdapter.exists.mockResolvedValue(true);
			mockAdapter.list.mockResolvedValue({
				files: [],
				folders: [],
			});

			const deletedCount = await backupService.cleanOldBackups(7);

			expect(deletedCount).toBe(0);
			expect(mockAdapter.remove).not.toHaveBeenCalled();
		});

		it('should handle listBackups errors', async () => {
			mockAdapter.exists.mockResolvedValue(true);
			mockAdapter.list.mockRejectedValue(
				new Error('List failed')
			);

			const deletedCount = await backupService.cleanOldBackups(7);

			expect(deletedCount).toBe(0);
		});
	});
});
