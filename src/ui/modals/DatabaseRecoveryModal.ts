import { App, Modal, Setting } from 'obsidian';
import { DatabaseBackupService } from '../../services/database/DatabaseBackupService';
import { BackupInfo } from '../../types';
import { logger } from '../../utils/logger';

/**
 * DatabaseRecoveryModal
 *
 * User interface for database corruption recovery
 *
 * Features:
 * - Display corruption error details
 * - Restore from latest backup
 * - View and select from all available backups
 * - Reset database (delete all data)
 *
 * @example
 * const modal = new DatabaseRecoveryModal(app, backupService, errorMessage);
 * modal.open();
 */
export class DatabaseRecoveryModal extends Modal {
	private backupService: DatabaseBackupService;
	private errorMessage: string;
	private onRestore: (backupPath: string | null) => void;

	constructor(
		app: App,
		backupService: DatabaseBackupService,
		errorMessage: string,
		onRestore: (backupPath: string | null) => void
	) {
		super(app);
		this.backupService = backupService;
		this.errorMessage = errorMessage;
		this.onRestore = onRestore;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Title
		contentEl.createEl('h2', { text: 'Database Corruption Detected' });

		// Error message
		contentEl.createDiv({ cls: 'mod-warning' }, (div) => {
			div.createEl('p', {
				text: 'The WeWe RSS database file is corrupted and cannot be loaded.',
			});
			div.createEl('p', {
				text: `Error: ${this.errorMessage}`,
				cls: 'u-monospace',
			});
		});

		// Recommendation
		contentEl.createEl('h3', { text: 'Recovery Options' });

		contentEl.createEl('p', {
			text: 'Choose one of the following recovery options:',
		});

		// Option 1: Restore from latest backup
		new Setting(contentEl)
			.setName('Restore from Latest Backup')
			.setDesc('Restore database from the most recent automatic backup')
			.addButton((button) =>
				button
					.setButtonText('Restore Latest')
					.setCta()
					.onClick(async () => {
						await this.restoreLatestBackup();
					})
			);

		// Option 2: View all backups
		new Setting(contentEl)
			.setName('View All Backups')
			.setDesc('Browse and select from all available backup files')
			.addButton((button) =>
				button.setButtonText('View Backups').onClick(async () => {
					await this.showBackupList();
				})
			);

		// Option 3: Reset database
		new Setting(contentEl)
			.setName('Reset Database (Delete All Data)')
			.setDesc(
				'Delete the corrupted database and start fresh. WARNING: All accounts, feeds, and articles will be lost!'
			)
			.addButton((button) =>
				button
					.setButtonText('Reset Database')
					.setWarning()
					.onClick(async () => {
						await this.resetDatabase();
					})
			);

		// Cancel button
		new Setting(contentEl).addButton((button) =>
			button.setButtonText('Cancel').onClick(() => {
				this.close();
			})
		);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	/**
	 * Restore from the latest backup
	 */
	private async restoreLatestBackup(): Promise<void> {
		try {
			const backups = await this.backupService.listBackups();

			if (backups.length === 0) {
				this.showError('No backups found. Please try resetting the database.');
				return;
			}

			const latestBackup = backups[0]; // Backups are sorted newest first
			await this.backupService.restoreBackup(latestBackup.path);

			logger.info('Database restored from latest backup');
			this.onRestore(latestBackup.path);
			this.close();

			// Show success message
			this.showSuccess(
				`Database restored successfully from backup (${this.formatDate(latestBackup.timestamp)})`
			);
		} catch (error) {
			logger.error('Failed to restore from latest backup:', error);
			this.showError(
				`Restoration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Show list of all available backups
	 */
	private async showBackupList(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Available Backups' });

		try {
			const backups = await this.backupService.listBackups();

			if (backups.length === 0) {
				contentEl.createEl('p', {
					text: 'No backups found.',
					cls: 'mod-warning',
				});

				// Back button
				new Setting(contentEl).addButton((button) =>
					button.setButtonText('Back').onClick(() => {
						this.onOpen();
					})
				);
				return;
			}

			contentEl.createEl('p', {
				text: `Found ${backups.length} backup(s). Select one to restore:`,
			});

			// List backups
			for (const backup of backups) {
				new Setting(contentEl)
					.setName(this.formatDate(backup.timestamp))
					.setDesc(
						`${backup.reason} - ${this.formatSize(backup.size)}`
					)
					.addButton((button) =>
						button
							.setButtonText('Restore')
							.setCta()
							.onClick(async () => {
								await this.restoreSpecificBackup(backup);
							})
					);
			}

			// Back button
			new Setting(contentEl).addButton((button) =>
				button.setButtonText('Back').onClick(() => {
					this.onOpen();
				})
			);
		} catch (error) {
			logger.error('Failed to list backups:', error);
			this.showError(
				`Failed to load backups: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Restore from a specific backup
	 */
	private async restoreSpecificBackup(backup: BackupInfo): Promise<void> {
		try {
			await this.backupService.restoreBackup(backup.path);

			logger.info(`Database restored from backup: ${backup.path}`);
			this.onRestore(backup.path);
			this.close();

			this.showSuccess(
				`Database restored successfully from backup (${this.formatDate(backup.timestamp)})`
			);
		} catch (error) {
			logger.error('Failed to restore from backup:', error);
			this.showError(
				`Restoration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Reset database (delete and start fresh)
	 */
	private async resetDatabase(): Promise<void> {
		const confirmed = confirm(
			'Are you sure you want to delete the database? This will remove all accounts, feeds, and articles. This action cannot be undone!'
		);

		if (!confirmed) {
			return;
		}

		try {
			logger.info('User confirmed database reset');
			this.onRestore(null); // null means reset
			this.close();

			this.showSuccess(
				'Database will be reset. Please reload the plugin.'
			);
		} catch (error) {
			logger.error('Failed to reset database:', error);
			this.showError(
				`Reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Show success message
	 */
	private showSuccess(message: string): void {
		// Use Obsidian's Notice API
		// @ts-ignore - Notice is available in Obsidian
		new Notice(message, 5000);
	}

	/**
	 * Show error message
	 */
	private showError(message: string): void {
		// Use Obsidian's Notice API
		// @ts-ignore - Notice is available in Obsidian
		new Notice(message, 8000);

		// Also log to console
		logger.error(message);
	}

	/**
	 * Format timestamp to readable date
	 */
	private formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleString();
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
