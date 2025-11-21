import { Modal, App, Notice, Setting } from 'obsidian';
import WeWeRssPlugin from '../../main';
import { Logger } from '../../utils/logger';
import { ERROR_MESSAGES } from '../../types';

export class AddFeedModal extends Modal {
	private plugin: WeWeRssPlugin;
	private logger: Logger;
	private wxsLinkInput: HTMLInputElement;
	private submitBtn: HTMLButtonElement;
	private isSubmitting: boolean = false;

	constructor(app: App, plugin: WeWeRssPlugin) {
		super(app);
		this.plugin = plugin;
		this.logger = new Logger('AddFeedModal');
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.empty();
		contentEl.addClass('wewe-rss-add-feed-modal');

		// Title
		contentEl.createEl('h2', { text: 'Add WeChat Feed' });

		// Instructions
		const instructions = contentEl.createEl('div', { cls: 'wewe-rss-modal-instructions' });
		instructions.createEl('p', {
			text: 'Subscribe to a WeChat public account by pasting the share link below.'
		});

		const stepsList = instructions.createEl('ol', { cls: 'wewe-rss-steps-list' });
		stepsList.createEl('li', { text: 'Open WeChat app and find the public account you want to follow' });
		stepsList.createEl('li', { text: 'Tap the "..." menu and select "Share"' });
		stepsList.createEl('li', { text: 'Copy the share link' });
		stepsList.createEl('li', { text: 'Paste the link below' });

		// Input field
		new Setting(contentEl)
			.setName('WeChat Share Link')
			.setDesc('Example: https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=...')
			.addText(text => {
				this.wxsLinkInput = text.inputEl;
				text
					.setPlaceholder('https://mp.weixin.qq.com/...')
					.inputEl.addClass('wewe-rss-wide-input');
				text.inputEl.addEventListener('keydown', (e) => {
					if (e.key === 'Enter') {
						this.handleSubmit();
					}
				});
			});

		// Example link (for testing)
		const exampleContainer = contentEl.createEl('div', { cls: 'wewe-rss-example-container' });
		exampleContainer.createEl('small', {
			text: 'Tip: The link should start with "https://mp.weixin.qq.com/"',
			cls: 'wewe-rss-hint-text'
		});

		// Buttons
		const buttonContainer = contentEl.createEl('div', { cls: 'wewe-rss-modal-buttons' });

		const cancelBtn = buttonContainer.createEl('button', {
			text: 'Cancel',
			cls: 'wewe-rss-btn'
		});
		cancelBtn.addEventListener('click', () => {
			this.close();
		});

		this.submitBtn = buttonContainer.createEl('button', {
			text: 'Subscribe',
			cls: 'wewe-rss-btn wewe-rss-btn-primary'
		});
		this.submitBtn.addEventListener('click', () => {
			this.handleSubmit();
		});
	}

	private async handleSubmit() {
		if (this.isSubmitting) {
			return;
		}

		const wxsLink = this.wxsLinkInput.value.trim();

		if (!wxsLink) {
			new Notice('Please enter a WeChat share link');
			return;
		}

		// Basic validation
		if (!wxsLink.includes('mp.weixin.qq.com')) {
			new Notice('Invalid WeChat share link. Please check the URL.');
			return;
		}

		try {
			this.isSubmitting = true;
			this.submitBtn.disabled = true;
			this.submitBtn.textContent = 'Subscribing...';

			this.logger.info('Subscribing to feed:', wxsLink);

			// Subscribe to feed
			const feed = await this.plugin.feedService.subscribeFeed(wxsLink);

			this.logger.info('Feed subscribed successfully:', feed);

			new Notice(`Subscribed to "${feed.title}"!`);

			// Optionally fetch initial articles
			const shouldFetchArticles = await this.confirmFetchArticles(feed.title);
			if (shouldFetchArticles) {
				this.submitBtn.textContent = 'Fetching articles...';

				try {
					const articleCount = await this.plugin.feedService.fetchHistoricalArticles(feed.id, feed.feedId);
					new Notice(`Downloaded ${articleCount} articles from "${feed.title}"`);
				} catch (error) {
					this.logger.error('Failed to fetch articles:', error);
					new Notice(`Feed subscribed, but failed to fetch articles: ${error.message}`);
				}
			}

			// Close modal
			this.close();

			// Refresh sidebar if it's open
			const leaves = this.app.workspace.getLeavesOfType('wewe-rss-view');
			if (leaves.length > 0) {
				const view = leaves[0].view as any;
				if (view.refresh) {
					await view.refresh();
				}
			}

		} catch (error) {
			this.logger.error('Failed to subscribe to feed:', error);

			// Check for account re-authentication error
			if (error.message === 'ACCOUNT_NEEDS_REAUTH') {
				new Notice(ERROR_MESSAGES.ACCOUNT_NEEDS_REAUTH, 15000); // Show for 15 seconds
				this.close();

				// Open settings tab automatically to guide user
				setTimeout(() => {
					(this.app as any).setting.open();
					(this.app as any).setting.openTabById('wewe-rss');
				}, 500);
				return;
			}

			// Handle other errors
			new Notice(`Failed to subscribe: ${error.message}`);
			this.submitBtn.disabled = false;
			this.submitBtn.textContent = 'Subscribe';
			this.isSubmitting = false;
		}
	}

	private async confirmFetchArticles(feedTitle: string): Promise<boolean> {
		return new Promise((resolve) => {
			const modal = new Modal(this.app);
			modal.contentEl.createEl('h3', { text: 'Fetch Articles?' });
			modal.contentEl.createEl('p', {
				text: `Would you like to download recent articles from "${feedTitle}" now?`
			});
			modal.contentEl.createEl('p', {
				text: 'This may take a few seconds. You can also sync later.',
				cls: 'wewe-rss-hint-text'
			});

			const buttonContainer = modal.contentEl.createEl('div', { cls: 'wewe-rss-modal-buttons' });

			const noBtn = buttonContainer.createEl('button', {
				text: 'Skip',
				cls: 'wewe-rss-btn'
			});
			noBtn.addEventListener('click', () => {
				modal.close();
				resolve(false);
			});

			const yesBtn = buttonContainer.createEl('button', {
				text: 'Fetch Now',
				cls: 'wewe-rss-btn wewe-rss-btn-primary'
			});
			yesBtn.addEventListener('click', () => {
				modal.close();
				resolve(true);
			});

			modal.open();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
		this.isSubmitting = false;
	}
}
