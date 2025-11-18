import { Modal, App, Setting, Notice } from 'obsidian';
import { Logger } from '../../utils/logger';

/**
 * CleanupArticlesModal - Interactive dialog for cleaning up old articles
 *
 * Allows users to specify retention days and preview how many articles will be deleted.
 */
export class CleanupArticlesModal extends Modal {
	private logger: Logger;
	private onConfirm: (days: number) => Promise<void>;
	private defaultDays: number;
	private estimatedCount: number;
	private inputValue: number;
	private confirmButton: HTMLButtonElement;

	/**
	 * @param app Obsidian app instance
	 * @param onConfirm Callback when user confirms deletion (receives retention days)
	 * @param defaultDays Default value for retention days input
	 * @param estimatedCount Estimated number of articles that will be deleted
	 */
	constructor(
		app: App,
		onConfirm: (days: number) => Promise<void>,
		defaultDays: number = 30,
		estimatedCount: number = 0
	) {
		super(app);
		this.logger = new Logger('CleanupArticlesModal');
		this.onConfirm = onConfirm;
		this.defaultDays = defaultDays;
		this.estimatedCount = estimatedCount;
		this.inputValue = defaultDays;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('wewe-rss-cleanup-modal');

		// Title
		contentEl.createEl('h2', { text: 'Clean Up Old Articles' });

		// Description
		const description = contentEl.createEl('div', { cls: 'wewe-rss-modal-instructions' });
		description.createEl('p', {
			text: 'Delete articles older than a specified number of days from the database.'
		});
		description.createEl('p', {
			text: 'Note: This only removes database records. Note files in your vault will be preserved.',
			cls: 'mod-warning'
		});

		// Retention days input
		new Setting(contentEl)
			.setName('Keep articles from last')
			.setDesc('Articles published before this many days ago will be deleted')
			.addText(text => {
				text
					.setPlaceholder('30')
					.setValue(String(this.defaultDays))
					.onChange((value) => {
						const numValue = parseInt(value);
						if (!isNaN(numValue) && numValue > 0 && numValue <= 365) {
							this.inputValue = numValue;
							this.updatePreview();
							this.validateInput();
						} else {
							this.validateInput();
						}
					});
				text.inputEl.type = 'number';
				text.inputEl.min = '1';
				text.inputEl.max = '365';
				text.inputEl.addEventListener('keypress', (e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						this.handleConfirm();
					}
				});
			})
			.addExtraButton(button => {
				button
					.setIcon('calendar')
					.setTooltip('Days')
					.extraSettingsEl.createSpan({ text: 'days' });
			});

		// Preview section
		const previewEl = contentEl.createEl('div', { cls: 'wewe-rss-cleanup-preview' });
		previewEl.createEl('p', {
			text: `📊 Preview:`,
			cls: 'wewe-rss-preview-title'
		});

		const previewText = previewEl.createEl('p', {
			cls: 'wewe-rss-preview-text'
		});
		previewText.innerHTML = this.getPreviewText();

		// Validation message
		const validationEl = contentEl.createEl('div', { cls: 'wewe-rss-validation-message' });
		validationEl.style.display = 'none';

		// Button container
		const buttonContainer = contentEl.createEl('div', { cls: 'wewe-rss-modal-buttons' });

		// Cancel button
		const cancelBtn = buttonContainer.createEl('button', {
			text: 'Cancel',
			cls: 'wewe-rss-btn'
		});
		cancelBtn.addEventListener('click', () => {
			this.close();
		});

		// Confirm button
		this.confirmButton = buttonContainer.createEl('button', {
			text: 'Delete Articles',
			cls: 'wewe-rss-btn mod-warning'
		});
		this.confirmButton.addEventListener('click', () => {
			this.handleConfirm();
		});

		this.logger.debug('Cleanup modal opened', {
			defaultDays: this.defaultDays,
			estimatedCount: this.estimatedCount
		});
	}

	/**
	 * Update preview text based on current input value
	 */
	private updatePreview(): void {
		const previewText = this.contentEl.querySelector('.wewe-rss-preview-text');
		if (previewText) {
			previewText.innerHTML = this.getPreviewText();
		}
	}

	/**
	 * Get preview text showing estimated deletion count
	 */
	private getPreviewText(): string {
		if (this.estimatedCount === 0) {
			return `<span style="color: var(--text-muted)">No articles will be deleted</span>`;
		} else if (this.estimatedCount === 1) {
			return `<span style="color: var(--text-warning)">Approximately <strong>1 article</strong> will be deleted</span>`;
		} else {
			return `<span style="color: var(--text-warning)">Approximately <strong>${this.estimatedCount} articles</strong> will be deleted</span>`;
		}
	}

	/**
	 * Validate input and update UI accordingly
	 */
	private validateInput(): void {
		const validationEl = this.contentEl.querySelector('.wewe-rss-validation-message');
		if (!validationEl) return;

		const isValid = this.inputValue >= 1 && this.inputValue <= 365;

		if (!isValid) {
			validationEl.textContent = 'Please enter a value between 1 and 365 days';
			validationEl.setAttribute('style', 'display: block; color: var(--text-error);');
			this.confirmButton.disabled = true;
		} else {
			validationEl.setAttribute('style', 'display: none;');
			this.confirmButton.disabled = false;
		}
	}

	/**
	 * Handle confirm button click
	 */
	private async handleConfirm(): Promise<void> {
		if (this.inputValue < 1 || this.inputValue > 365) {
			new Notice('Please enter a valid retention period (1-365 days)');
			return;
		}

		this.logger.info('User confirmed cleanup', { retentionDays: this.inputValue });

		// Disable button to prevent double-clicks
		this.confirmButton.disabled = true;
		this.confirmButton.textContent = 'Deleting...';

		try {
			await this.onConfirm(this.inputValue);
			this.close();
		} catch (error) {
			this.logger.error('Cleanup failed:', error);
			new Notice(`Cleanup failed: ${error.message}`);
			this.confirmButton.disabled = false;
			this.confirmButton.textContent = 'Delete Articles';
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
