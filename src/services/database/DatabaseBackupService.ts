import { App } from 'obsidian';
import { BackupInfo, BackupReason } from '../../types';
import { logger } from '../../utils/logger';

/**
 * DatabaseBackupService
 *
 * Manages database backup and restoration operations
 *
 * Features:
 * - Create timestamped backups with reasons
 * - Restore database from backup
 * - List available backups
 * - Clean old backups based on retention policy
 *
 * @example
 * const backupService = new DatabaseBackupService(app, pluginDir);
 * await backupService.createBackup(BackupReason.MANUAL);
 */
export class DatabaseBackupService {
	private app: App;
	private pluginDir: string;
	private backupDir: string;
	private dbFileName: string;

	constructor(app: App, pluginDir: string, dbFileName = 'wewe-rss.db') {
		this.app = app;
		this.pluginDir = pluginDir;
		this.dbFileName = dbFileName;
		this.backupDir = `${pluginDir}/backups`;
	}

	/**
	 * Initialize backup service (create backup directory)
	 */
	async initialize(): Promise<void> {
		try {
			const adapter = this.app.vault.adapter;
			const exists = await adapter.exists(this.backupDir);
			if (!exists) {
				await adapter.mkdir(this.backupDir);
				logger.info('[DatabaseBackupService] Created backup directory');
			}
		} catch (error) {
			logger.error('[DatabaseBackupService] Failed to initialize:', error);
			throw error;
		}
	}

	/**
	 * Create a database backup
	 *
	 * @param reason Reason for backup
	 * @returns Path to created backup file
	 */
	async createBackup(reason: BackupReason): Promise<string> {
		try {
			const adapter = this.app.vault.adapter;
			const dbPath = `${this.pluginDir}/${this.dbFileName}`;

			// Check if database exists
			const dbExists = await adapter.exists(dbPath);
			if (!dbExists) {
				logger.warn('[DatabaseBackupService] No database file to backup');
				throw new Error('Database file does not exist');
			}

			// Generate backup filename
			const timestamp = Date.now();
			const backupFileName = `wewe-rss-backup-${timestamp}-${reason}.db`;
			const backupPath = `${this.backupDir}/${backupFileName}`;

			// Copy database file
			await adapter.copy(dbPath, backupPath);

			// Get backup size
			const stat = await adapter.stat(backupPath);
			const size = stat?.size || 0;

			logger.info(
				`[DatabaseBackupService] Created backup: ${backupFileName} (${this.formatSize(size)}), reason: ${reason}`
			);

			return backupPath;
		} catch (error) {
			logger.error('[DatabaseBackupService] Failed to create backup:', error);
			throw error;
		}
	}

	/**
	 * Restore database from backup
	 *
	 * @param backupPath Path to backup file
	 */
	async restoreBackup(backupPath: string): Promise<void> {
		try {
			const adapter = this.app.vault.adapter;
			const dbPath = `${this.pluginDir}/${this.dbFileName}`;

			// Check if backup exists
			const backupExists = await adapter.exists(backupPath);
			if (!backupExists) {
				throw new Error(`Backup file not found: ${backupPath}`);
			}

			// Backup current database before restoration (if exists)
			const currentDbExists = await adapter.exists(dbPath);
			if (currentDbExists) {
				const timestamp = Date.now();
				const corruptedBackupPath = `${this.pluginDir}/wewe-rss-corrupted-${timestamp}.db`;
				await adapter.copy(dbPath, corruptedBackupPath);
				logger.info(
					`[DatabaseBackupService] Saved corrupted database to: ${corruptedBackupPath}`
				);
			}

			// Restore from backup
			await adapter.copy(backupPath, dbPath);

			logger.info(
				`[DatabaseBackupService] Restored database from backup: ${backupPath}`
			);
		} catch (error) {
			logger.error('[DatabaseBackupService] Failed to restore backup:', error);
			throw error;
		}
	}

	/**
	 * List all available backups
	 *
	 * @returns Array of backup information
	 */
	async listBackups(): Promise<BackupInfo[]> {
		try {
			const adapter = this.app.vault.adapter;

			// Check if backup directory exists
			const dirExists = await adapter.exists(this.backupDir);
			if (!dirExists) {
				return [];
			}

			// List all files in backup directory
			const files = await adapter.list(this.backupDir);
			const backupFiles = files.files.filter((f) =>
				f.endsWith('.db')
			);

			// Parse backup info from filenames
			const backups: BackupInfo[] = [];
			for (const filePath of backupFiles) {
				try {
					const fileName = filePath.split('/').pop() || '';
					const match = fileName.match(
						/wewe-rss-backup-(\d+)-(.+)\.db$/
					);

					if (match) {
						const timestamp = parseInt(match[1], 10);
						const reason = match[2] as BackupReason;
						const stat = await adapter.stat(filePath);
						const size = stat?.size || 0;

						backups.push({
							path: filePath,
							timestamp,
							size,
							reason,
						});
					}
				} catch (error) {
					logger.warn(
						`[DatabaseBackupService] Failed to parse backup file: ${filePath}`,
						error
					);
				}
			}

			// Sort by timestamp (newest first)
			backups.sort((a, b) => b.timestamp - a.timestamp);

			return backups;
		} catch (error) {
			logger.error('[DatabaseBackupService] Failed to list backups:', error);
			return [];
		}
	}

	/**
	 * Clean old backups based on retention policy
	 *
	 * @param retentionDays Number of days to retain backups
	 * @returns Number of backups deleted
	 */
	async cleanOldBackups(retentionDays: number): Promise<number> {
		try {
			const backups = await this.listBackups();
			const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

			const adapter = this.app.vault.adapter;
			let deletedCount = 0;

			for (const backup of backups) {
				if (backup.timestamp < cutoffTime) {
					try {
						await adapter.remove(backup.path);
						deletedCount++;
						logger.debug(
							`[DatabaseBackupService] Deleted old backup: ${backup.path}`
						);
					} catch (error) {
						logger.warn(
							`[DatabaseBackupService] Failed to delete backup: ${backup.path}`,
							error
						);
					}
				}
			}

			if (deletedCount > 0) {
				logger.info(
					`[DatabaseBackupService] Cleaned ${deletedCount} old backup(s) (retention: ${retentionDays} days)`
				);
			}

			return deletedCount;
		} catch (error) {
			logger.error('[DatabaseBackupService] Failed to clean old backups:', error);
			return 0;
		}
	}

	/**
	 * Format file size to human-readable string
	 */
	private formatSize(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
	}
}
