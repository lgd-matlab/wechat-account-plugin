import { Plugin, WorkspaceLeaf, Notice } from 'obsidian';
import { WeWeRssSettingTab } from './ui/settings/WeWeRssSettingTab';
import { WeWeRssSidebarView, VIEW_TYPE_WEWE_RSS } from './ui/views/WeWeRssSidebarView';
import { AddAccountModal } from './ui/modals/AddAccountModal';
import { AddFeedModal } from './ui/modals/AddFeedModal';
import { DatabaseService } from './services/database/DatabaseService';
import { AccountService } from './services/AccountService';
import { FeedService } from './services/FeedService';
import { NoteCreator } from './services/NoteCreator';
import { SyncService } from './services/SyncService';
import { TaskScheduler } from './services/TaskScheduler';
import { DEFAULT_SETTINGS, WeWeRssSettings } from './types';

export default class WeWeRssPlugin extends Plugin {
	settings: WeWeRssSettings;
	databaseService: DatabaseService;
	accountService: AccountService;
	feedService: FeedService;
	noteCreator: NoteCreator;
	syncService: SyncService;
	taskScheduler: TaskScheduler;

	async onload() {
		console.log('Loading WeWe RSS plugin');

		// Load settings
		await this.loadSettings();

		// Initialize database
		this.databaseService = new DatabaseService(this);
		await this.databaseService.initialize();

		// Initialize services
		this.accountService = new AccountService(this);
		this.feedService = new FeedService(this);
		this.noteCreator = new NoteCreator(this);
		this.syncService = new SyncService(this);
		this.taskScheduler = new TaskScheduler(this);

		// Start task scheduler
		this.taskScheduler.start();

		// Register automatic sync task if enabled
		if (this.settings.autoSync) {
			this.taskScheduler.registerTask(
				'auto-sync',
				async () => {
					await this.syncService.syncAll({
						staleThresholdHours: this.settings.syncInterval / 60
					});
				},
				this.settings.syncInterval
			);
		}

		// Register sidebar view
		this.registerView(
			VIEW_TYPE_WEWE_RSS,
			(leaf) => new WeWeRssSidebarView(leaf, this)
		);

		// Add ribbon icon
		this.addRibbonIcon('rss', 'WeWe RSS', () => {
			this.activateView();
		});

		// Add commands
		this.addCommand({
			id: 'open-wewe-rss-sidebar',
			name: 'Open WeWe RSS Sidebar',
			callback: () => {
				this.activateView();
			}
		});

		this.addCommand({
			id: 'sync-all-feeds',
			name: 'Sync All Feeds Now',
			callback: async () => {
				try {
					const result = await this.syncService.syncAll();
					new Notice(
						`Sync complete! ${result.feedsRefreshed} feeds, ${result.articlesDownloaded} articles, ${result.notesCreated} notes created`
					);
				} catch (error) {
					new Notice(`Sync failed: ${error.message}`);
				}
			}
		});

		this.addCommand({
			id: 'add-new-feed',
			name: 'Add New Feed',
			callback: () => {
				const modal = new AddFeedModal(this.app, this);
				modal.open();
			}
		});

		this.addCommand({
			id: 'add-wechat-account',
			name: 'Add WeChat Account',
			callback: () => {
				const modal = new AddAccountModal(this.app, this);
				modal.open();
			}
		});

		this.addCommand({
			id: 'export-opml',
			name: 'Export OPML',
			callback: () => {
				// TODO: Implement OPML export
				console.log('Exporting OPML...');
			}
		});

		// Add settings tab
		this.addSettingTab(new WeWeRssSettingTab(this.app, this));

		// Add status bar item
		const statusBarItem = this.addStatusBarItem();
		statusBarItem.setText('WeWe RSS: Idle');
		statusBarItem.addClass('wewe-rss-status-bar');
	}

	onunload() {
		console.log('Unloading WeWe RSS plugin');

		// Stop task scheduler
		if (this.taskScheduler) {
			this.taskScheduler.stop();
		}

		// Clean up database connection
		if (this.databaseService) {
			this.databaseService.close();
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_WEWE_RSS);

		if (leaves.length > 0) {
			// View already exists, reveal it
			leaf = leaves[0];
		} else {
			// Create new view in right sidebar
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				leaf = rightLeaf;
				await leaf.setViewState({
					type: VIEW_TYPE_WEWE_RSS,
					active: true,
				});
			}
		}

		// Reveal the view
		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}
}
