import { ItemView, WorkspaceLeaf, Notice } from 'obsidian';
import WeWeRssPlugin from '../../main';
import { Feed, Article } from '../../types';
import { AddAccountModal } from '../modals/AddAccountModal';
import { AddFeedModal } from '../modals/AddFeedModal';

export const VIEW_TYPE_WEWE_RSS = 'wewe-rss-view';

export class WeWeRssSidebarView extends ItemView {
	plugin: WeWeRssPlugin;
	private feedsContainer: HTMLElement;
	private articlesContainer: HTMLElement;
	private selectedFeedId: number | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: WeWeRssPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_WEWE_RSS;
	}

	getDisplayText(): string {
		return 'WeWe RSS';
	}

	getIcon(): string {
		return 'rss';
	}

	async onOpen() {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass('wewe-rss-sidebar');

		// Header with actions
		this.renderHeader(container);

		// Stats bar
		await this.renderStats(container);

		// Main content area
		const mainContent = container.createEl('div', { cls: 'wewe-rss-main-content' });

		// Feeds list
		const feedsSection = mainContent.createEl('div', { cls: 'wewe-rss-feeds-section' });
		feedsSection.createEl('h5', { text: 'Feeds' });
		this.feedsContainer = feedsSection.createEl('div', { cls: 'wewe-rss-feeds-list' });

		// Articles list
		const articlesSection = mainContent.createEl('div', { cls: 'wewe-rss-articles-section' });
		articlesSection.createEl('h5', { text: 'Articles' });
		this.articlesContainer = articlesSection.createEl('div', { cls: 'wewe-rss-articles-list' });

		// Initial render
		await this.refresh();
	}

	private renderHeader(container: HTMLElement) {
		const header = container.createEl('div', { cls: 'wewe-rss-header' });

		const title = header.createEl('h4', { text: 'WeWe RSS' });
		title.addClass('wewe-rss-title');

		const buttonGroup = header.createEl('div', { cls: 'wewe-rss-button-group' });

		// Add Account button
		const addAccountBtn = buttonGroup.createEl('button', {
			text: '+ Account',
			cls: 'wewe-rss-btn wewe-rss-btn-small'
		});
		addAccountBtn.addEventListener('click', () => {
			const modal = new AddAccountModal(this.app, this.plugin);
			modal.open();
		});

		// Add Feed button
		const addFeedBtn = buttonGroup.createEl('button', {
			text: '+ Feed',
			cls: 'wewe-rss-btn wewe-rss-btn-small'
		});
		addFeedBtn.addEventListener('click', () => {
			const modal = new AddFeedModal(this.app, this.plugin);
			modal.open();
		});

		// Sync button
		const syncBtn = buttonGroup.createEl('button', {
			text: '⟳ Sync',
			cls: 'wewe-rss-btn wewe-rss-btn-small wewe-rss-btn-primary'
		});
		syncBtn.addEventListener('click', async () => {
			await this.handleSync();
		});
	}

	private async renderStats(container: HTMLElement) {
		const stats = await this.plugin.syncService.getSyncStats();

		const statsBar = container.createEl('div', { cls: 'wewe-rss-stats-bar' });

		statsBar.createEl('span', {
			text: `📚 ${stats.totalFeeds} feeds`,
			cls: 'wewe-rss-stat'
		});

		statsBar.createEl('span', {
			text: `📄 ${stats.totalArticles} articles`,
			cls: 'wewe-rss-stat'
		});

		if (stats.unsyncedArticles > 0) {
			statsBar.createEl('span', {
				text: `⚠️ ${stats.unsyncedArticles} unsynced`,
				cls: 'wewe-rss-stat wewe-rss-stat-warning'
			});
		}

		if (stats.lastSyncTime) {
			const timeAgo = this.getTimeAgo(stats.lastSyncTime);
			statsBar.createEl('span', {
				text: `🕒 Last sync: ${timeAgo}`,
				cls: 'wewe-rss-stat wewe-rss-stat-muted'
			});
		}
	}

	private async renderFeeds() {
		this.feedsContainer.empty();

		const feeds = this.plugin.databaseService.feeds.findAll();

		if (feeds.length === 0) {
			this.feedsContainer.createEl('div', {
				text: 'No feeds yet. Click "+ Feed" to add one.',
				cls: 'wewe-rss-empty-state'
			});
			return;
		}

		for (const feed of feeds) {
			const feedItem = this.feedsContainer.createEl('div', {
				cls: 'wewe-rss-feed-item'
			});

			if (this.selectedFeedId === feed.id) {
				feedItem.addClass('wewe-rss-feed-item-selected');
			}

			const feedTitle = feedItem.createEl('div', {
				text: feed.title,
				cls: 'wewe-rss-feed-title'
			});

			const feedStats = feedItem.createEl('div', {
				cls: 'wewe-rss-feed-stats'
			});

			const articleCount = this.plugin.databaseService.articles.countByFeed(feed.id);
			feedStats.createEl('span', {
				text: `${articleCount} articles`,
				cls: 'wewe-rss-feed-count'
			});

			if (feed.lastSyncAt) {
				const timeAgo = this.getTimeAgo(new Date(feed.lastSyncAt));
				feedStats.createEl('span', {
					text: timeAgo,
					cls: 'wewe-rss-feed-sync-time'
				});
			}

			feedItem.addEventListener('click', () => {
				this.selectedFeedId = feed.id;
				this.renderFeeds();
				this.renderArticles();
			});
		}
	}

	private async renderArticles() {
		this.articlesContainer.empty();

		let articles: Article[];
		if (this.selectedFeedId) {
			articles = this.plugin.databaseService.articles.findByFeedId(this.selectedFeedId, 50);
		} else {
			// Show recent articles from all feeds
			articles = this.plugin.databaseService.articles.findRecent(20);
		}

		if (articles.length === 0) {
			this.articlesContainer.createEl('div', {
				text: 'No articles yet. Sync feeds to download articles.',
				cls: 'wewe-rss-empty-state'
			});
			return;
		}

		for (const article of articles) {
			const articleItem = this.articlesContainer.createEl('div', {
				cls: 'wewe-rss-article-item'
			});

			if (article.synced) {
				articleItem.addClass('wewe-rss-article-synced');
			}

			const articleTitle = articleItem.createEl('div', {
				text: article.title,
				cls: 'wewe-rss-article-title'
			});

			const articleMeta = articleItem.createEl('div', {
				cls: 'wewe-rss-article-meta'
			});

			const publishedDate = new Date(article.publishedAt);
			articleMeta.createEl('span', {
				text: publishedDate.toLocaleDateString(),
				cls: 'wewe-rss-article-date'
			});

			if (article.synced && article.noteId) {
				const noteLink = articleMeta.createEl('span', {
					text: '📝 Note',
					cls: 'wewe-rss-article-note-link'
				});

				noteLink.addEventListener('click', async (e) => {
					e.stopPropagation();
					const file = this.plugin.noteCreator.getNote(article.noteId!);
					if (file) {
						await this.app.workspace.getLeaf().openFile(file);
					} else {
						new Notice('Note not found');
					}
				});
			}

			articleItem.addEventListener('click', async () => {
				// Create note if not synced
				if (!article.synced) {
					const feed = this.plugin.databaseService.feeds.findById(article.feedId);
					if (feed) {
						const file = await this.plugin.noteCreator.createNoteFromArticle(article, feed);
						if (file) {
							new Notice('Note created!');
							await this.app.workspace.getLeaf().openFile(file);
							await this.refresh();
						}
					}
				} else if (article.noteId) {
					const file = this.plugin.noteCreator.getNote(article.noteId);
					if (file) {
						await this.app.workspace.getLeaf().openFile(file);
					}
				}
			});
		}
	}

	private async handleSync() {
		const syncBtn = this.containerEl.querySelector('.wewe-rss-btn-primary') as HTMLButtonElement;
		if (!syncBtn) return;

		try {
			syncBtn.disabled = true;
			syncBtn.textContent = '⟳ Syncing...';

			const result = await this.plugin.syncService.syncAll();

			new Notice(
				`Sync complete! ${result.feedsRefreshed} feeds, ${result.articlesDownloaded} articles, ${result.notesCreated} notes created`
			);

			await this.refresh();
		} catch (error) {
			new Notice(`Sync failed: ${error.message}`);
		} finally {
			syncBtn.disabled = false;
			syncBtn.textContent = '⟳ Sync';
		}
	}

	async refresh() {
		await this.renderFeeds();
		await this.renderArticles();

		// Update stats
		const statsBar = this.containerEl.querySelector('.wewe-rss-stats-bar');
		if (statsBar) {
			statsBar.empty();
			await this.renderStats(this.containerEl.children[1] as HTMLElement);
		}
	}

	private getTimeAgo(date: Date): string {
		const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

		if (seconds < 60) return 'just now';
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
		if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
		if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

		return date.toLocaleDateString();
	}

	async onClose() {
		// Cleanup if needed
	}
}
