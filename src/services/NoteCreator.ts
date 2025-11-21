import { App, TFile, TFolder, normalizePath } from 'obsidian';
import type WeWeRssPlugin from '../main';
import { Article, Feed } from '../types';
import { sanitizeFilename, formatTimestamp, formatPublishedDate } from '../utils/helpers';
import { Logger } from '../utils/logger';
import { ContentParser } from './feed/ContentParser';

export interface NoteMetadata {
	title: string;
	feedName: string;
	author?: string;
	publishedAt: string;
	url: string;
	tags: string[];
}

export class NoteCreator {
	private plugin: WeWeRssPlugin;
	private app: App;
	private logger: Logger;
	private contentParser: ContentParser;

	constructor(plugin: WeWeRssPlugin) {
		this.plugin = plugin;
		this.app = plugin.app;
		this.logger = new Logger('NoteCreator');
		this.contentParser = new ContentParser(plugin.settings.enableCleanHtml);
	}

	/**
	 * Create a note from an article
	 */
	async createNoteFromArticle(article: Article, feed: Feed): Promise<TFile | null> {
		try {
			const { noteLocation, noteTemplate, addTags } = this.plugin.settings;

			// Generate note path
			const notePath = this.generateNotePath(article, feed, noteLocation);

			// Check if note already exists
			const existingFile = this.app.vault.getAbstractFileByPath(notePath);
			if (existingFile instanceof TFile) {
				this.logger.warn(`Note already exists: ${notePath}`);
				return existingFile;
			}

			// Fetch article content if not already available
			let articleContent = article.content;
			if (!articleContent || articleContent.trim() === '') {
				this.logger.info(`Fetching article content from: ${article.url}`);
				try {
					const htmlContent = await this.plugin.accountService.fetchArticleContent(article.url);
					const { markdown, cleanHtml } = this.contentParser.parseContent(htmlContent);

					// Update article in database with content
					articleContent = markdown;
					this.plugin.databaseService.articles.update(article.id, {
						content: markdown,
						contentHtml: cleanHtml
					});

					this.logger.debug(`Article content fetched and parsed: ${markdown.length} chars`);
				} catch (error) {
					this.logger.warn(`Failed to fetch article content, will create link-only note:`, error);
					articleContent = `[Read full article](${article.url})`;
				}
			}

			// Prepare metadata
			const metadata: NoteMetadata = {
				title: article.title,
				feedName: feed.title,
				publishedAt: formatPublishedDate(article.publishedAt),
				url: article.url,
				tags: addTags ? this.extractTags(feed.title) : []
			};

			// Generate note content
			const content = this.generateNoteContent(
				{ ...article, content: articleContent },
				metadata,
				noteTemplate
			);

			// Ensure parent folder exists
			await this.ensureFolderExists(notePath);

			// Create the note
			const file = await this.app.vault.create(notePath, content);
			this.logger.info(`Created note: ${notePath}`);

			return file;
		} catch (error) {
			this.logger.error(`Failed to create note for article ${article.id}:`, error);
			return null;
		}
	}

	/**
	 * Create notes for multiple articles in batch
	 */
	async createNotesFromArticles(
		articles: Article[],
		feedsMap: Map<number, Feed>
	): Promise<{ created: number; skipped: number; failed: number }> {
		let created = 0;
		let skipped = 0;
		let failed = 0;

		for (const article of articles) {
			const feed = feedsMap.get(article.feedId);
			if (!feed) {
				this.logger.warn(`Feed not found for article ${article.id}`);
				failed++;
				continue;
			}

			const file = await this.createNoteFromArticle(article, feed);
			if (file) {
				// Check if it was newly created or already existed
				const existingNoteId = await this.findExistingNoteId(article.url);
				if (existingNoteId) {
					skipped++;
				} else {
					created++;
					// Update article with note_id
					await this.updateArticleNoteId(article.id, file.path);
				}
			} else {
				failed++;
			}
		}

		return { created, skipped, failed };
	}

	/**
	 * Generate note path based on settings and article metadata
	 */
	private generateNotePath(article: Article, feed: Feed, baseLocation: string): string {
		// Sanitize feed name for folder
		const feedFolder = sanitizeFilename(feed.title);

		// Sanitize article title for filename
		const filename = sanitizeFilename(article.title);

		// Generate full path
		const path = normalizePath(`${baseLocation}/${feedFolder}/${filename}.md`);

		return path;
	}

	/**
	 * Generate note content using template
	 */
	private generateNoteContent(
		article: Article,
		metadata: NoteMetadata,
		template: string
	): string {
		// Replace template variables
		let content = template
			.replace(/\{\{title\}\}/g, metadata.title)
			.replace(/\{\{feedName\}\}/g, metadata.feedName)
			.replace(/\{\{author\}\}/g, metadata.author || 'Unknown')
			.replace(/\{\{publishedAt\}\}/g, metadata.publishedAt)
			.replace(/\{\{url\}\}/g, metadata.url)
			.replace(/\{\{date\}\}/g, new Date().toISOString().split('T')[0])
			.replace(/\{\{tags\}\}/g, metadata.tags.map(tag => `#${tag}`).join(' '));

		// Replace content placeholder
		content = content.replace(/\{\{content\}\}/g, article.content);

		return content;
	}

	/**
	 * Extract tags from feed title
	 */
	private extractTags(feedTitle: string): string[] {
		// Basic tag extraction - sanitize feed name
		const tag = feedTitle
			.replace(/[^a-zA-Z0-9\u4e00-\u9fa5\s]/g, '') // Remove special chars
			.replace(/\s+/g, '-') // Replace spaces with hyphens
			.toLowerCase();

		return ['wewe-rss', tag].filter(Boolean);
	}

	/**
	 * Ensure parent folder exists
	 */
	private async ensureFolderExists(filePath: string): Promise<void> {
		const folderPath = filePath.substring(0, filePath.lastIndexOf('/'));

		if (!folderPath) {
			return;
		}

		const folder = this.app.vault.getAbstractFileByPath(folderPath);

		if (!folder) {
			await this.app.vault.createFolder(folderPath);
			this.logger.debug(`Created folder: ${folderPath}`);
		} else if (!(folder instanceof TFolder)) {
			throw new Error(`Path exists but is not a folder: ${folderPath}`);
		}
	}

	/**
	 * Find existing note by URL (search in frontmatter)
	 */
	private async findExistingNoteId(url: string): Promise<string | null> {
		// Simple search through all markdown files
		// In production, you might want to use a database or cache
		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			const content = await this.app.vault.read(file);
			if (content.includes(url)) {
				return file.path;
			}
		}

		return null;
	}

	/**
	 * Update article with note_id in database
	 */
	private async updateArticleNoteId(articleId: number, notePath: string): Promise<void> {
		try {
			this.plugin.databaseService.articles.update(articleId, {
				noteId: notePath,
				synced: true
			});
			this.logger.debug(`Updated article ${articleId} with noteId: ${notePath}`);
		} catch (error) {
			this.logger.error(`Failed to update article ${articleId}:`, error);
		}
	}

	/**
	 * Delete notes for multiple articles by their IDs
	 * @param articleIds Array of article IDs
	 * @returns Number of notes deleted
	 */
	async deleteNotesByArticleIds(articleIds: number[]): Promise<number> {
		if (articleIds.length === 0) {
			return 0;
		}

		this.logger.info(`Attempting to delete notes for ${articleIds.length} articles`);
		let deletedCount = 0;

		for (const id of articleIds) {
			const article = this.plugin.databaseService.articles.findById(id);
			if (!article) {
				this.logger.warn(`Article ${id} not found in database`);
				continue;
			}

			if (article.noteId) {
				const deleted = await this.deleteNote(article.noteId);
				if (deleted) {
					deletedCount++;
				}
			} else {
				this.logger.debug(`Article ${id} has no noteId, skipping note deletion`);
			}
		}

		this.logger.info(`Successfully deleted ${deletedCount} of ${articleIds.length} notes`);
		return deletedCount;
	}

	/**
	 * Delete note file
	 */
	async deleteNote(notePath: string): Promise<boolean> {
		try {
			const file = this.app.vault.getAbstractFileByPath(notePath);
			if (file instanceof TFile) {
				await this.app.vault.delete(file);
				this.logger.info(`Deleted note: ${notePath}`);
				return true;
			} else {
				this.logger.warn(`Note file not found: ${notePath}`);
				return false;
			}
		} catch (error) {
			this.logger.error(`Failed to delete note ${notePath}:`, error);
			return false;
		}
	}

	/**
	 * Update existing note content
	 */
	async updateNote(notePath: string, newContent: string): Promise<boolean> {
		try {
			const file = this.app.vault.getAbstractFileByPath(notePath);
			if (file instanceof TFile) {
				await this.app.vault.modify(file, newContent);
				this.logger.info(`Updated note: ${notePath}`);
				return true;
			}
			return false;
		} catch (error) {
			this.logger.error(`Failed to update note ${notePath}:`, error);
			return false;
		}
	}

	/**
	 * Get note file by path
	 */
	getNote(notePath: string): TFile | null {
		const file = this.app.vault.getAbstractFileByPath(notePath);
		return file instanceof TFile ? file : null;
	}

	/**
	 * Check if note exists
	 */
	noteExists(notePath: string): boolean {
		return this.getNote(notePath) !== null;
	}
}
