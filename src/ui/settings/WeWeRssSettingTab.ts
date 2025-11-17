import { App, PluginSettingTab, Setting, Notice, Modal } from 'obsidian';
import WeWeRssPlugin from '../../main';
import { Account, AccountStatus } from '../../types';

export class WeWeRssSettingTab extends PluginSettingTab {
	plugin: WeWeRssPlugin;

	constructor(app: App, plugin: WeWeRssPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'WeWe RSS Settings' });

		// Info banner
		const infoBanner = containerEl.createEl('div', { cls: 'wewe-rss-settings-banner' });
		infoBanner.createEl('p', {
			text: 'Subscribe to WeChat public accounts and sync articles as Obsidian notes.',
			cls: 'wewe-rss-settings-description'
		});

		// Account Management Section
		this.addAccountManagement(containerEl);

		// Sync Settings Section
		this.addSyncSettings(containerEl);

		// Note Settings Section
		this.addNoteSettings(containerEl);

		// Content Settings Section
		this.addContentSettings(containerEl);

		// Title Filtering Section
		this.addTitleFilteringSettings(containerEl);

		// API Settings Section
		this.addApiSettings(containerEl);

		// Advanced Settings Section
		this.addAdvancedSettings(containerEl);
	}

	private addSyncSettings(containerEl: HTMLElement) {
		containerEl.createEl('h3', { text: 'Sync Settings' });

		new Setting(containerEl)
			.setName('Auto Sync')
			.setDesc('Automatically sync feeds on schedule')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoSync)
				.onChange(async (value) => {
					this.plugin.settings.autoSync = value;
					await this.plugin.saveSettings();

					// Update scheduler
					if (value) {
						this.plugin.taskScheduler.registerTask(
							'auto-sync',
							async () => {
								await this.plugin.syncService.syncAll({
									staleThresholdHours: this.plugin.settings.syncInterval / 60
								});
							},
							this.plugin.settings.syncInterval
						);
					} else {
						this.plugin.taskScheduler.unregisterTask('auto-sync');
					}

					new Notice(`Auto-sync ${value ? 'enabled' : 'disabled'}`);
				}));

		new Setting(containerEl)
			.setName('Sync Interval')
			.setDesc('How often to sync feeds (in minutes)')
			.addSlider(slider => slider
				.setLimits(15, 360, 15)
				.setValue(this.plugin.settings.syncInterval)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.syncInterval = value;
					await this.plugin.saveSettings();

					// Update scheduler interval
					if (this.plugin.settings.autoSync) {
						this.plugin.taskScheduler.updateTaskInterval('auto-sync', value);
					}
				}));

		new Setting(containerEl)
			.setName('Update Delay')
			.setDesc('Delay between feed requests (seconds) - prevents rate limiting')
			.addSlider(slider => slider
				.setLimits(10, 300, 10)
				.setValue(this.plugin.settings.updateDelay)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.updateDelay = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Max Articles Per Feed')
			.setDesc('Maximum number of articles to fetch per feed')
			.addSlider(slider => slider
				.setLimits(10, 500, 10)
				.setValue(this.plugin.settings.maxArticlesPerFeed)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.maxArticlesPerFeed = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Article Retention (Days)')
			.setDesc('Only sync articles published within the last N days. Older articles and notes will be automatically deleted during sync.')
			.addSlider(slider => slider
				.setLimits(7, 365, 1)
				.setValue(this.plugin.settings.articleRetentionDays)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.articleRetentionDays = value;
					await this.plugin.saveSettings();
				}));
	}

	private addNoteSettings(containerEl: HTMLElement) {
		containerEl.createEl('h3', { text: 'Note Settings' });

		new Setting(containerEl)
			.setName('Note Folder')
			.setDesc('Folder where article notes will be created')
			.addText(text => text
				.setPlaceholder('WeWe RSS')
				.setValue(this.plugin.settings.noteFolder)
				.onChange(async (value) => {
					this.plugin.settings.noteFolder = value;
					this.plugin.settings.noteLocation = value; // Keep in sync
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Add Tags')
			.setDesc('Automatically add tags to created notes')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.addTags)
				.onChange(async (value) => {
					this.plugin.settings.addTags = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Note Template')
			.setDesc('Template for created notes. Available variables: {{title}}, {{feedName}}, {{url}}, {{publishedAt}}, {{content}}, {{tags}}, {{date}}')
			.addTextArea(text => {
				text
					.setPlaceholder('Enter your note template...')
					.setValue(this.plugin.settings.noteTemplate)
					.onChange(async (value) => {
						this.plugin.settings.noteTemplate = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.rows = 12;
				text.inputEl.cols = 50;
			});

		// Reset template button
		new Setting(containerEl)
			.setName('Reset Template')
			.setDesc('Reset note template to default')
			.addButton(button => button
				.setButtonText('Reset to Default')
				.onClick(async () => {
					const defaultTemplate = `---
title: {{title}}
url: {{url}}
published: {{publishedAt}}
feed: {{feedName}}
tags: [wewe-rss, {{feedName}}]
---

# {{title}}

> Published: {{publishedAt}}
> Source: [{{feedName}}]({{url}})

{{content}}
`;
					this.plugin.settings.noteTemplate = defaultTemplate;
					await this.plugin.saveSettings();
					this.display(); // Refresh settings
					new Notice('Template reset to default');
				}));
	}

	private addContentSettings(containerEl: HTMLElement) {
		containerEl.createEl('h3', { text: 'Content Settings' });

		new Setting(containerEl)
			.setName('Feed Mode')
			.setDesc('Summary (faster) or Full Text (slower, more content)')
			.addDropdown(dropdown => dropdown
				.addOption('summary', 'Summary')
				.addOption('fulltext', 'Full Text')
				.setValue(this.plugin.settings.feedMode)
				.onChange(async (value: 'summary' | 'fulltext') => {
					this.plugin.settings.feedMode = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Clean HTML')
			.setDesc('Remove scripts, styles, and other unnecessary HTML elements')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableCleanHtml)
				.onChange(async (value) => {
					this.plugin.settings.enableCleanHtml = value;
					await this.plugin.saveSettings();
				}));
	}

	private addTitleFilteringSettings(containerEl: HTMLElement) {
		containerEl.createEl('h3', { text: 'Title Filtering' });

		containerEl.createEl('p', {
			text: 'Use regex patterns to filter articles by title. Leave empty to include all articles.',
			cls: 'setting-item-description'
		});

		new Setting(containerEl)
			.setName('Include Patterns')
			.setDesc('Only sync articles matching these patterns (comma-separated regex)')
			.addTextArea(text => {
				text
					.setPlaceholder('Example: AI, Machine Learning, 人工智能')
					.setValue(this.plugin.settings.titleIncludePatterns.join(', '))
					.onChange(async (value) => {
						this.plugin.settings.titleIncludePatterns = value
							.split(',')
							.map(p => p.trim())
							.filter(p => p.length > 0);
						await this.plugin.saveSettings();
					});
				text.inputEl.rows = 3;
			});

		new Setting(containerEl)
			.setName('Exclude Patterns')
			.setDesc('Skip articles matching these patterns (comma-separated regex)')
			.addTextArea(text => {
				text
					.setPlaceholder('Example: 广告, 推广, Advertisement')
					.setValue(this.plugin.settings.titleExcludePatterns.join(', '))
					.onChange(async (value) => {
						this.plugin.settings.titleExcludePatterns = value
							.split(',')
							.map(p => p.trim())
							.filter(p => p.length > 0);
						await this.plugin.saveSettings();
					});
				text.inputEl.rows = 3;
			});
	}

	private addApiSettings(containerEl: HTMLElement) {
		containerEl.createEl('h3', { text: 'API Settings' });

		new Setting(containerEl)
			.setName('Platform URL')
			.setDesc('WeChat Reading API base URL (change only if you know what you\'re doing)')
			.addText(text => text
				.setPlaceholder('https://weread.111965.xyz')
				.setValue(this.plugin.settings.platformUrl)
				.onChange(async (value) => {
					this.plugin.settings.platformUrl = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Max Requests Per Minute')
			.setDesc('Rate limit for API requests (lower value = safer)')
			.addSlider(slider => slider
				.setLimits(10, 120, 10)
				.setValue(this.plugin.settings.maxRequestsPerMinute)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.maxRequestsPerMinute = value;
					await this.plugin.saveSettings();
				}));
	}

	private addAdvancedSettings(containerEl: HTMLElement) {
		containerEl.createEl('h3', { text: 'Advanced' });

		// Database stats
		const stats = containerEl.createEl('div', { cls: 'wewe-rss-stats-container' });

		this.plugin.syncService.getSyncStats().then(syncStats => {
			stats.createEl('p', {
				text: `📊 Database Statistics:`,
				cls: 'wewe-rss-stats-title'
			});

			const statsList = stats.createEl('ul', { cls: 'wewe-rss-stats-list' });
			statsList.createEl('li', { text: `Total Feeds: ${syncStats.totalFeeds}` });
			statsList.createEl('li', { text: `Total Articles: ${syncStats.totalArticles}` });
			statsList.createEl('li', { text: `Synced Articles: ${syncStats.syncedArticles}` });
			statsList.createEl('li', { text: `Unsynced Articles: ${syncStats.unsyncedArticles}` });

			const accounts = this.plugin.databaseService.accounts.findAll();
			statsList.createEl('li', { text: `Accounts: ${accounts.length}` });
		});

		// Cleanup button
		new Setting(containerEl)
			.setName('Cleanup Old Articles')
			.setDesc('Delete synced articles older than 30 days from database (notes are preserved)')
			.addButton(button => button
				.setButtonText('Clean Up')
				.setWarning()
				.onClick(async () => {
					const count = await this.plugin.syncService.cleanupOldArticles(30);
					new Notice(`Cleaned up ${count} old articles`);
					this.display(); // Refresh stats
				}));

		// Database path info
		new Setting(containerEl)
			.setName('Database Location')
			.setDesc(`${this.plugin.settings.databasePath}`)
			.setClass('wewe-rss-readonly-setting');
	}

	private addAccountManagement(containerEl: HTMLElement) {
		containerEl.createEl('h3', { text: 'Account Management' });

		// Description
		containerEl.createEl('p', {
			text: 'Manage WeChat Reading accounts used for feed synchronization.',
			cls: 'setting-item-description'
		});

		// Get accounts
		const accounts = this.plugin.databaseService.accounts.findAll();

		// Statistics
		const activeCount = accounts.filter(a => a.status === AccountStatus.ACTIVE).length;
		const statsEl = containerEl.createEl('div', { cls: 'wewe-rss-account-stats' });
		statsEl.createEl('span', {
			text: `Total Accounts: ${accounts.length} | Active: ${activeCount}`,
			cls: 'wewe-rss-stats-text'
		});

		// Account list
		if (accounts.length === 0) {
			// No accounts message
			const noAccountsEl = containerEl.createEl('div', { cls: 'wewe-rss-no-accounts' });
			noAccountsEl.createEl('p', { text: '📭 No accounts added yet.' });
			noAccountsEl.createEl('p', { text: 'Click "Add Account" below to get started.' });
		} else {
			// Display each account
			accounts.forEach(account => {
				const accountSetting = new Setting(containerEl)
					.setName(account.name)
					.setDesc(this.getAccountDescription(account));

				// Status badge
				const statusBadge = accountSetting.nameEl.createSpan({
					cls: `wewe-rss-status-badge wewe-rss-status-${account.status}`
				});
				statusBadge.setText(account.status.toUpperCase());

				// Delete button
				accountSetting.addButton(button => button
					.setButtonText('Delete')
					.setWarning()
					.onClick(async () => {
						// Confirmation
						const confirmed = await this.confirmAccountDeletion(account.name);
						if (confirmed) {
							this.plugin.databaseService.accounts.delete(account.id);
							new Notice(`Account "${account.name}" deleted`);
							this.display(); // Refresh settings
						}
					}));
			});
		}

		// Add Account button
		new Setting(containerEl)
			.setName('Add New Account')
			.setDesc('Scan QR code to authenticate a new WeChat account')
			.addButton(button => button
				.setButtonText('Add Account')
				.setCta()
				.onClick(async () => {
					const { AddAccountModal } = await import('../modals/AddAccountModal');
					new AddAccountModal(this.app, this.plugin).open();
				}));
	}

	private getAccountDescription(account: Account): string {
		const createdDate = new Date(account.createdAt).toLocaleDateString();
		let desc = `Created: ${createdDate}`;

		if (account.status === AccountStatus.BLACKLISTED && account.blacklistedUntil) {
			const until = new Date(account.blacklistedUntil).toLocaleString();
			desc += ` | Blacklisted until: ${until}`;
		}

		return desc;
	}

	private async confirmAccountDeletion(accountName: string): Promise<boolean> {
		return new Promise((resolve) => {
			const modal = new Modal(this.app);
			modal.titleEl.setText('Delete Account?');

			modal.contentEl.createEl('p', {
				text: `Are you sure you want to delete "${accountName}"?`
			});
			modal.contentEl.createEl('p', {
				text: 'All feeds using this account will stop syncing.',
				cls: 'mod-warning'
			});

			const buttonContainer = modal.contentEl.createEl('div', {
				cls: 'modal-button-container'
			});

			buttonContainer.createEl('button', { text: 'Cancel' })
				.addEventListener('click', () => {
					modal.close();
					resolve(false);
				});

			const deleteBtn = buttonContainer.createEl('button', {
				text: 'Delete',
				cls: 'mod-warning'
			});
			deleteBtn.addEventListener('click', () => {
				modal.close();
				resolve(true);
			});

			modal.open();
		});
	}
}
