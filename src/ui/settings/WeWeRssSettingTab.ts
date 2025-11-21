import { App, PluginSettingTab, Setting, Notice, Modal } from 'obsidian';
import WeWeRssPlugin from '../../main';
import { Account, AccountStatus } from '../../types';

export class WeWeRssSettingTab extends PluginSettingTab {
	plugin: WeWeRssPlugin;
	private currentTab: 'general' | 'ai' = 'general';

	constructor(app: App, plugin: WeWeRssPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'WeWe RSS Settings' });

		// Tab navigation
		this.addTabNavigation(containerEl);

		// Content based on active tab
		if (this.currentTab === 'general') {
			this.displayGeneralSettings(containerEl);
		} else {
			this.displayAISettings(containerEl);
		}
	}

	private addTabNavigation(containerEl: HTMLElement): void {
		const navContainer = containerEl.createEl('div', { cls: 'wewe-rss-tab-navigation' });

		const generalBtn = navContainer.createEl('button', {
			text: 'General',
			cls: `wewe-rss-tab-button ${this.currentTab === 'general' ? 'active' : ''}`
		});
		generalBtn.addEventListener('click', () => {
			this.currentTab = 'general';
			this.display();
		});

		const aiBtn = navContainer.createEl('button', {
			text: 'AI Settings',
			cls: `wewe-rss-tab-button ${this.currentTab === 'ai' ? 'active' : ''}`
		});
		aiBtn.addEventListener('click', () => {
			this.currentTab = 'ai';
			this.display();
		});
	}

	private displayGeneralSettings(containerEl: HTMLElement): void {
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

		// Database Backup Section
		this.addDatabaseBackupSettings(containerEl);

		// Advanced Settings Section
		this.addAdvancedSettings(containerEl);
	}

	private displayAISettings(containerEl: HTMLElement): void {
		// Info banner
		const infoBanner = containerEl.createEl('div', { cls: 'wewe-rss-settings-banner' });
		infoBanner.createEl('p', {
			text: 'Configure AI-powered summarization for your WeChat articles.',
			cls: 'wewe-rss-settings-description'
		});

		// AI Summarization Settings
		this.addSummarizationSettings(containerEl);
	}

	private addSummarizationSettings(containerEl: HTMLElement) {
		containerEl.createEl('h3', { text: 'AI Summarization' });

		// Enable toggle
		new Setting(containerEl)
			.setName('Enable AI Summarization')
			.setDesc('Generate daily summaries of articles using AI')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.summarizationEnabled)
				.onChange(async (value) => {
					this.plugin.settings.summarizationEnabled = value;
					await this.plugin.saveSettings();
					this.display(); // Refresh to show/hide other settings
				}));

		// Only show other settings if enabled
		if (!this.plugin.settings.summarizationEnabled) {
			return;
		}

		// Provider selection
		new Setting(containerEl)
			.setName('AI Provider')
			.setDesc('Select the AI service to use for summarization')
			.addDropdown(dropdown => dropdown
				.addOption('openai', 'OpenAI')
				.addOption('gemini', 'Google Gemini')
				.addOption('claude', 'Anthropic Claude')
				.addOption('deepseek', 'DeepSeek')
				.addOption('glm', 'Zhipu GLM')
				.addOption('generic', 'Generic (OpenAI-compatible)')
				.setValue(this.plugin.settings.summarizationProvider)
				.onChange(async (value: any) => {
					this.plugin.settings.summarizationProvider = value;
					// Update default endpoint and model
					this.plugin.settings.summarizationApiEndpoint = this.getDefaultEndpoint(value);
					this.plugin.settings.summarizationModel = this.getDefaultModel(value);
					await this.plugin.saveSettings();
					this.display(); // Refresh for provider-specific settings
				}));

		// API Key
		new Setting(containerEl)
			.setName('API Key')
			.setDesc('Your API key for the selected provider (kept secure in settings)')
			.addText(text => {
				text.setPlaceholder('sk-...')
					.setValue(this.plugin.settings.summarizationApiKey)
					.onChange(async (value) => {
						this.plugin.settings.summarizationApiKey = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.type = 'password';
			});

		// API Endpoint
		new Setting(containerEl)
			.setName('API Endpoint')
			.setDesc('API endpoint URL (for custom or self-hosted services)')
			.addText(text => text
				.setPlaceholder(this.getDefaultEndpoint(this.plugin.settings.summarizationProvider))
				.setValue(this.plugin.settings.summarizationApiEndpoint)
				.onChange(async (value) => {
					this.plugin.settings.summarizationApiEndpoint = value;
					await this.plugin.saveSettings();
				}));

		// Model selection
		new Setting(containerEl)
			.setName('Model')
			.setDesc('AI model to use (e.g., gpt-3.5-turbo, gemini-pro, claude-3-haiku)')
			.addText(text => text
				.setPlaceholder(this.getDefaultModel(this.plugin.settings.summarizationProvider))
				.setValue(this.plugin.settings.summarizationModel)
				.onChange(async (value) => {
					this.plugin.settings.summarizationModel = value;
					await this.plugin.saveSettings();
				}));

		// Request delay between articles
		new Setting(containerEl)
			.setName('Request Delay (seconds)')
			.setDesc('Delay between article summarization requests to respect API rate limits. ' +
					'For free tier APIs like MegaLLM, use 10-60 seconds to avoid HTTP 429 errors.')
			.addText(text => text
				.setPlaceholder('10')
				.setValue(String(this.plugin.settings.summarizationRequestDelaySeconds))
				.onChange(async (value) => {
					const delay = parseInt(value);
					if (!isNaN(delay) && delay >= 0 && delay <= 300) {
						this.plugin.settings.summarizationRequestDelaySeconds = delay;
						await this.plugin.saveSettings();
					}
				}));

		// Summary folder
		new Setting(containerEl)
			.setName('Summary Folder')
			.setDesc('Folder where daily summaries will be saved')
			.addText(text => text
				.setPlaceholder('Daily Summaries')
				.setValue(this.plugin.settings.summarizationFolder)
				.onChange(async (value) => {
					this.plugin.settings.summarizationFolder = value;
					await this.plugin.saveSettings();
				}));

		// Auto-run toggle
		new Setting(containerEl)
			.setName('Auto-run Daily')
			.setDesc('Automatically generate summaries on schedule')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.summarizationAutoRun)
				.onChange(async (value) => {
					this.plugin.settings.summarizationAutoRun = value;
					await this.plugin.saveSettings();

					// Update scheduler
					if (value && this.plugin.summaryService) {
						this.plugin.scheduleAutomaticSummarization();
					} else {
						this.plugin.taskScheduler.unregisterTask('daily-summary');
					}

					new Notice(value ? 'Auto-summarization enabled' : 'Auto-summarization disabled');
				}));

		// Schedule time
		new Setting(containerEl)
			.setName('Schedule Time')
			.setDesc('Time to run automatic summarization (24-hour format, e.g., 01:00)')
			.addText(text => text
				.setPlaceholder('01:00')
				.setValue(this.plugin.settings.summarizationScheduleTime)
				.onChange(async (value) => {
					this.plugin.settings.summarizationScheduleTime = value;
					await this.plugin.saveSettings();

					// Restart scheduler with new time
					if (this.plugin.settings.summarizationAutoRun && this.plugin.summaryService) {
						this.plugin.scheduleAutomaticSummarization();
					}
				}));

		// Manual trigger button
		new Setting(containerEl)
			.setName('Generate Summary')
			.setDesc('Manually generate a summary for yesterday\'s articles')
			.addButton(button => button
				.setButtonText('Generate Now')
				.setCta()
				.onClick(async () => {
					if (!this.plugin.summaryService) {
						new Notice('Summary service not initialized');
						return;
					}

					button.setButtonText('Generating...');
					button.setDisabled(true);

					try {
						const result = await this.plugin.summaryService.generateDailySummary();
						if (result.totalArticles > 0) {
							new Notice(`Summary created: ${result.summaries.length}/${result.totalArticles} articles summarized`);
						} else {
							new Notice('No articles from yesterday to summarize');
						}
					} catch (error) {
						new Notice(`Failed to generate summary: ${error.message}`);
						this.plugin.logger.error('Summary generation failed:', error);
					} finally {
						button.setButtonText('Generate Now');
						button.setDisabled(false);
					}
				}));

		// Last run info
		if (this.plugin.settings.summarizationLastRun > 0) {
			const lastRun = new Date(this.plugin.settings.summarizationLastRun);
			const lastRunEl = containerEl.createEl('div', {
				cls: 'setting-item-description'
			});
			lastRunEl.style.marginTop = '-10px';
			lastRunEl.style.paddingLeft = '0';
			lastRunEl.setText(`Last run: ${lastRun.toLocaleString()}`);
		}
	}

	private getDefaultEndpoint(provider: string): string {
		const endpoints: Record<string, string> = {
			'openai': 'https://api.openai.com/v1',
			'gemini': 'https://generativelanguage.googleapis.com/v1',
			'claude': 'https://api.anthropic.com/v1',
			'deepseek': 'https://api.deepseek.com/v1',
			'glm': 'https://open.bigmodel.cn/api/paas/v4',
			'generic': 'https://api.openai.com/v1'
		};
		return endpoints[provider] || endpoints['openai'];
	}

	private getDefaultModel(provider: string): string {
		const models: Record<string, string> = {
			'openai': 'gpt-3.5-turbo',
			'gemini': 'gemini-pro',
			'claude': 'claude-3-haiku-20240307',
			'deepseek': 'deepseek-chat',
			'glm': 'glm-4',
			'generic': 'gpt-3.5-turbo'
		};
		return models[provider] || models['openai'];
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
			.setName('Sync Days Filter')
			.setDesc('Only sync articles published within the last N days. Older articles will be ignored during sync. (Default: 5 days)')
			.addText(text => {
				text
					.setPlaceholder('5')
					.setValue(String(this.plugin.settings.syncDaysFilter))
					.onChange(async (value) => {
						const numValue = parseInt(value);
						if (!isNaN(numValue) && numValue >= 1 && numValue <= 365) {
							this.plugin.settings.syncDaysFilter = numValue;
							await this.plugin.saveSettings();
						}
					});
				text.inputEl.type = 'number';
				text.inputEl.min = '1';
				text.inputEl.max = '365';
			})
			.addExtraButton(button => {
				button
					.setIcon('calendar')
					.setTooltip('Days')
					.extraSettingsEl.createSpan({ text: 'days' });
			});
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

	private addDatabaseBackupSettings(containerEl: HTMLElement) {
		containerEl.createEl('h3', { text: 'Database Backup' });

		containerEl.createEl('p', {
			text: 'Configure automatic database backups to protect against data loss.',
			cls: 'setting-item-description'
		});

		// Auto-backup toggle
		new Setting(containerEl)
			.setName('Automatic Backups')
			.setDesc('Automatically create database backups before plugin initialization and migrations')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoBackupEnabled)
				.onChange(async (value) => {
					this.plugin.settings.autoBackupEnabled = value;
					await this.plugin.saveSettings();
					new Notice(`Automatic backups ${value ? 'enabled' : 'disabled'}`);
				}));

		// Backup retention
		new Setting(containerEl)
			.setName('Backup Retention')
			.setDesc('Number of days to keep old backups (older backups will be deleted automatically)')
			.addSlider(slider => slider
				.setLimits(1, 30, 1)
				.setValue(this.plugin.settings.backupRetentionDays)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.backupRetentionDays = value;
					await this.plugin.saveSettings();
				}));

		// Backup before sync
		new Setting(containerEl)
			.setName('Backup Before Sync')
			.setDesc('Create backup before each sync operation (provides extra safety but uses more disk space)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.backupBeforeSync)
				.onChange(async (value) => {
					this.plugin.settings.backupBeforeSync = value;
					await this.plugin.saveSettings();
				}));

		// Manual backup button
		new Setting(containerEl)
			.setName('Create Manual Backup')
			.setDesc('Create a backup of the database right now')
			.addButton(button => button
				.setButtonText('Create Backup')
				.setCta()
				.onClick(async () => {
					try {
						const backupPath = await this.plugin.databaseService.createManualBackup();
						new Notice(`Backup created successfully: ${backupPath.split('/').pop()}`);
					} catch (error) {
						new Notice(`Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
					}
				}));

		// View backups button
		new Setting(containerEl)
			.setName('View All Backups')
			.setDesc('Browse and manage existing database backups')
			.addButton(button => button
				.setButtonText('View Backups')
				.onClick(async () => {
					try {
						const backups = await this.plugin.databaseService.backupService.listBackups();

						if (backups.length === 0) {
							new Notice('No backups found');
							return;
						}

						// Show backup list in modal
						const backupList = backups.map(b =>
							`${new Date(b.timestamp).toLocaleString()} - ${b.reason} (${this.formatSize(b.size)})`
						).join('\n');

						new Notice(`Found ${backups.length} backup(s):\n${backupList}`, 10000);
					} catch (error) {
						new Notice(`Failed to list backups: ${error instanceof Error ? error.message : 'Unknown error'}`);
					}
				}));
	}

	private addAdvancedSettings(containerEl: HTMLElement) {
		containerEl.createEl('h3', { text: 'Advanced' });

		// AI Settings notice
		containerEl.createEl('p', {
			text: '💡 AI Summarization settings have moved to the "WeWe RSS - AI" tab.',
			cls: 'setting-item-description'
		});

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
			.setDesc('Delete old articles from database (notes are preserved). You can specify how many days to keep.')
			.addButton(button => button
				.setButtonText('Clean Up')
				.setWarning()
				.onClick(async () => {
					// Get last used retention days or default to 30
					const defaultDays = this.plugin.settings.lastCleanupRetentionDays || 30;

					// Get count for preview
					const estimatedCount = this.plugin.databaseService.articles.countArticlesOlderThan(defaultDays);

					// Import and open modal
					const { CleanupArticlesModal } = await import('../modals/CleanupArticlesModal');
					new CleanupArticlesModal(
						this.app,
						async (retentionDays: number) => {
							// Save the retention days for next time
							this.plugin.settings.lastCleanupRetentionDays = retentionDays;
							await this.plugin.saveSettings();

							// Perform cleanup (deletes both DB records and note files)
							const result = await this.plugin.syncService.cleanupOldArticles(retentionDays);
							new Notice(`Cleaned up ${result.articlesDeleted} articles and ${result.notesDeleted} notes (older than ${retentionDays} days)`);

							// Refresh stats display
							this.display();
						},
						defaultDays,
						estimatedCount
					).open();
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

		// Check for outdated accounts
		const outdatedAccounts = accounts.filter(a => !this.validateAccountFormat(a));

		// Warning banner if any accounts need re-authentication
		if (outdatedAccounts.length > 0) {
			const warningBanner = containerEl.createEl('div', { cls: 'wewe-rss-warning-banner' });
			warningBanner.createEl('h4', {
				text: `⚠️ ${outdatedAccounts.length} account(s) need re-authentication`
			});
			warningBanner.createEl('p', {
				text: 'Your account credentials are outdated. To fix this, remove the affected account(s) and add them again by clicking "Add Account" and scanning the QR code.'
			});
		}

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

				// Check if account needs re-authentication
				const needsReauth = !this.validateAccountFormat(account);
				if (needsReauth) {
					accountSetting.settingEl.addClass('wewe-rss-account-outdated');
					// Add warning icon before the name
					const warningIcon = accountSetting.nameEl.createSpan({
						cls: 'wewe-rss-account-warning'
					});
					warningIcon.setText('⚠️');
					warningIcon.setAttribute('aria-label', 'Needs re-authentication');
					warningIcon.setAttribute('title', 'This account needs re-authentication');
				}

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

	/**
	 * Validate account credential format
	 * Returns true if account has new JSON format with vid and token
	 */
	private validateAccountFormat(account: Account): boolean {
		try {
			const credentials = JSON.parse(account.cookie);
			return !!(credentials.vid && credentials.token);
		} catch {
			return false; // Old format or invalid JSON
		}
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


	private formatSize(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
	}
}
