import { App, TFile, TFolder } from 'obsidian';
import { DatabaseService } from './database/DatabaseService';
import { WeWeRssSettings, SummaryArticle, ArticleSummary, DailySummaryResult, Article, Feed } from '../types';
import { AIClientFactory } from './ai/AIClientFactory';
import { Logger } from '../utils/logger';

/**
 * Service for generating AI-powered daily article summaries
 */
export class SummaryService {
	private db: DatabaseService;
	private app: App;
	private settings: WeWeRssSettings;
	private logger: Logger;

	constructor(db: DatabaseService, app: App, settings: WeWeRssSettings) {
		this.db = db;
		this.app = app;
		this.settings = settings;
		this.logger = new Logger('SummaryService');
	}

	/**
	 * Generate daily summary for yesterday's articles
	 * @returns Summary result with file path
	 */
	async generateDailySummary(): Promise<DailySummaryResult> {
		this.logger.info('Starting daily summary generation');

		// Validate configuration
		if (!this.validateConfiguration()) {
			throw new Error('Summarization is not properly configured. Please check settings.');
		}

		try {
			// Get yesterday's articles (with filesystem fallback)
			const articles = await this.getYesterdayArticles();
			this.logger.info(`Found ${articles.length} articles from yesterday`);

			if (articles.length === 0) {
				this.logger.info('No articles to summarize');
				return {
					date: this.getTodayDateString(),
					summaries: [],
					totalArticles: 0,
					filePath: ''
				};
			}

			// Summarize articles
			const summaries = await this.summarizeArticles(articles);
			this.logger.info(`Successfully summarized ${summaries.length}/${articles.length} articles`);

			// Create result
			const result: DailySummaryResult = {
				date: this.getTodayDateString(),
				summaries,
				totalArticles: articles.length,
				filePath: ''
			};

			// Create summary file
			const filePath = await this.createSummaryFile(result);
			result.filePath = filePath;

			// Update last run timestamp
			this.settings.summarizationLastRun = Date.now();

			this.logger.info('Daily summary generation complete', { filePath, totalArticles: articles.length });

			return result;

		} catch (error) {
			this.logger.error('Failed to generate daily summary', error);
			throw error;
		}
	}

	/**
	 * Validate summarization configuration
	 * @returns True if configuration is valid
	 */
	private validateConfiguration(): boolean {
		if (!this.settings.summarizationEnabled) {
			this.logger.error('Summarization is not enabled');
			return false;
		}

		if (!this.settings.summarizationApiKey) {
			this.logger.error('API key is not configured');
			return false;
		}

		if (!this.settings.summarizationProvider) {
			this.logger.error('Provider is not selected');
			return false;
		}

		if (!AIClientFactory.isSupported(this.settings.summarizationProvider)) {
			this.logger.error(`Unsupported provider: ${this.settings.summarizationProvider}`);
			return false;
		}

		return true;
	}

	/**
	 * Get articles published yesterday
	 * Tries database first, then falls back to filesystem
	 * @returns Array of articles with feed names
	 */
	private async getYesterdayArticles(): Promise<SummaryArticle[]> {
		const { start, end } = this.getYesterdayDateRange();
		this.logger.debug('Querying articles', { start, end });

		// Phase 1: Try database first (fast path)
		const articles = this.db.articles.findByDateRange(start, end);
		const syncedArticles = articles.filter(a => a.synced);

		if (syncedArticles.length > 0) {
			this.logger.info(`Found ${syncedArticles.length} articles from database`);

			// Enrich with feed names
			const summaryArticles: SummaryArticle[] = syncedArticles.map(article => {
				const feed = this.db.feeds.findById(article.feedId);
				return {
					id: article.id,
					title: article.title,
					content: article.content,
					url: article.url,
					publishedAt: article.publishedAt,
					feedName: feed?.title || 'Unknown Feed',
					noteId: article.noteId
				};
			});

			return summaryArticles;
		}

		// Phase 2: Fallback to filesystem
		this.logger.info('No articles in database, scanning filesystem...');
		const articlesFromFs = await this.getYesterdayArticlesFromFilesystem();
		this.logger.info(`Found ${articlesFromFs.length} articles from filesystem`);

		return articlesFromFs;
	}

	/**
	 * Get articles published yesterday from filesystem
	 * Fallback method when database query returns no results
	 * @returns Array of articles with feed names from filesystem
	 */
	private async getYesterdayArticlesFromFilesystem(): Promise<SummaryArticle[]> {
		const noteFolder = this.settings.noteLocation;
		const folder = this.app.vault.getAbstractFileByPath(noteFolder);

		// Check if folder exists
		if (!folder || !(folder instanceof TFolder)) {
			this.logger.warn(`Note folder not found: ${noteFolder}`);
			return [];
		}

		const articles: SummaryArticle[] = [];
		const { start, end } = this.getYesterdayDateRange();
		const startTime = Date.now();

		try {
			// Get all markdown files recursively
			const files = this.getAllMarkdownFiles(folder);
			this.logger.debug(`Scanning ${files.length} markdown files in filesystem`);

			// Process each file
			for (const file of files) {
				try {
					// Read metadata cache for frontmatter
					const cache = this.app.metadataCache.getFileCache(file);
					const frontmatter = cache?.frontmatter;

					// Parse publication date
					let publishedAt = 0;
					if (frontmatter?.published) {
						publishedAt = this.parsePublishedDate(frontmatter.published);
					}

					// Fallback to file modification time if no valid date
					if (publishedAt === 0) {
						publishedAt = file.stat.mtime;
						this.logger.debug(`Using file mtime for ${file.basename}`, { mtime: publishedAt });
					}

					// Filter articles in yesterday's date range
					if (publishedAt >= start && publishedAt < end) {
						// Read file content
						const content = await this.app.vault.read(file);

						// Extract feed name from path or frontmatter
						const feedName = frontmatter?.feed || this.extractFeedFromPath(file.path);

						// Build SummaryArticle object
						articles.push({
							id: 0, // Filesystem-based, no DB ID
							title: frontmatter?.title || file.basename,
							content: this.stripFrontmatter(content),
							url: frontmatter?.url || '',
							publishedAt,
							feedName,
							noteId: file.path
						});

						this.logger.debug(`Found article from filesystem: ${file.basename}`, {
							publishedAt: new Date(publishedAt).toISOString(),
							feedName
						});
					}
				} catch (error) {
					this.logger.error(`Failed to process file ${file.path}`, error);
					// Continue with other files
				}
			}

			const durationMs = Date.now() - startTime;
			this.logger.info('Filesystem scan complete', {
				filesScanned: files.length,
				articlesFound: articles.length,
				durationMs
			});

		} catch (error) {
			this.logger.error('Failed to scan filesystem', error);
		}

		return articles;
	}

	/**
	 * Get yesterday's date range (start and end timestamps)
	 * @returns Date range in milliseconds
	 */
	private getYesterdayDateRange(): { start: number; end: number } {
		const now = new Date();
		const yesterday = new Date(now);
		yesterday.setDate(yesterday.getDate() - 1);
		yesterday.setHours(0, 0, 0, 0);

		const start = yesterday.getTime();
		const end = start + (24 * 60 * 60 * 1000); // +24 hours

		return { start, end };
	}

	/**
	 * Get today's date string (YYYY-MM-DD format)
	 * @returns Date string
	 */
	private getTodayDateString(): string {
		const today = new Date();
		const year = today.getFullYear();
		const month = String(today.getMonth() + 1).padStart(2, '0');
		const day = String(today.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	/**
	 * Summarize articles using AI API
	 * @param articles Articles to summarize
	 * @returns Array of article summaries
	 */
	private async summarizeArticles(articles: SummaryArticle[]): Promise<ArticleSummary[]> {
		// Create AI client
		const client = AIClientFactory.createClient(
			this.settings.summarizationProvider,
			{
				apiKey: this.settings.summarizationApiKey,
				endpoint: this.settings.summarizationApiEndpoint,
				model: this.settings.summarizationModel
			}
		);

		const summaries: ArticleSummary[] = [];

		// Summarize each article with delay to respect rate limits
		for (let i = 0; i < articles.length; i++) {
			const article = articles[i];
			this.logger.debug(`Summarizing article ${i + 1}/${articles.length}`, { title: article.title });

			try {
				const summary = await client.summarizeArticle(article);
				summaries.push(this.buildArticleSummary(article, summary));
				this.logger.debug('Article summarized successfully', { articleId: article.id });

			} catch (error) {
				this.logger.error(`Failed to summarize article ${article.id}`, error);
				// Continue with other articles even if one fails
				summaries.push(this.buildErrorSummary(article, error as Error));
			}

			// Add delay between requests to respect rate limits
			// Use configurable delay from settings (default: 10 seconds for free tier APIs)
			if (i < articles.length - 1) {
				const delayMs = this.settings.summarizationRequestDelaySeconds * 1000;
				this.logger.debug(`Waiting ${this.settings.summarizationRequestDelaySeconds} seconds before next article to respect rate limits...`);
				await this.sleep(delayMs);
			}
		}

		return summaries;
	}

	/**
	 * Sleep for specified milliseconds
	 * @param ms Milliseconds to sleep
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Build article summary object
	 * @param article Source article
	 * @param summary AI-generated summary
	 * @returns ArticleSummary
	 */
	private buildArticleSummary(article: SummaryArticle, summary: string): ArticleSummary {
		const publishedDate = new Date(article.publishedAt).toLocaleString();
		const noteLink = article.noteId
			? `obsidian://open?vault=${encodeURIComponent(this.app.vault.getName())}&file=${encodeURIComponent(article.noteId)}`
			: '';

		return {
			articleId: article.id,
			title: article.title,
			summary,
			metadata: {
				publishedAt: publishedDate,
				feedName: article.feedName,
				noteLink
			}
		};
	}

	/**
	 * Build error summary when AI summarization fails
	 * @param article Source article
	 * @param error Error that occurred
	 * @returns ArticleSummary with error message
	 */
	private buildErrorSummary(article: SummaryArticle, error: Error): ArticleSummary {
		const publishedDate = new Date(article.publishedAt).toLocaleString();
		const noteLink = article.noteId
			? `obsidian://open?vault=${encodeURIComponent(this.app.vault.getName())}&file=${encodeURIComponent(article.noteId)}`
			: '';

		return {
			articleId: article.id,
			title: article.title,
			summary: `⚠️ Summarization failed: ${error.message}`,
			metadata: {
				publishedAt: publishedDate,
				feedName: article.feedName,
				noteLink
			}
		};
	}

	/**
	 * Create summary markdown file in vault
	 * @param result Summary result
	 * @returns File path
	 */
	private async createSummaryFile(result: DailySummaryResult): Promise<string> {
		const folder = this.settings.summarizationFolder;
		const fileName = `${result.date}-summary.md`;
		const filePath = `${folder}/${fileName}`;

		// Ensure folder exists
		await this.ensureFolderExists(folder);

		// Generate markdown content
		const content = this.buildMarkdownContent(result);

		// Check if file already exists
		const existingFile = this.app.vault.getAbstractFileByPath(filePath);
		if (existingFile instanceof TFile) {
			// Update existing file
			await this.app.vault.modify(existingFile, content);
			this.logger.info('Updated existing summary file', { filePath });
		} else {
			// Create new file
			await this.app.vault.create(filePath, content);
			this.logger.info('Created new summary file', { filePath });
		}

		return filePath;
	}

	/**
	 * Ensure folder exists, create if needed
	 * @param folderPath Folder path
	 */
	private async ensureFolderExists(folderPath: string): Promise<void> {
		const folder = this.app.vault.getAbstractFileByPath(folderPath);

		if (!folder) {
			// Create folder and all parent folders
			await this.app.vault.createFolder(folderPath);
			this.logger.debug('Created folder', { folderPath });
		}
	}

	/**
	 * Build markdown content for summary file
	 * @param result Summary result
	 * @returns Markdown content
	 */
	private buildMarkdownContent(result: DailySummaryResult): string {
		const lines: string[] = [];

		// Header
		lines.push(`# Daily Summary - ${result.date}`);
		lines.push('');
		lines.push(`> Generated on ${new Date().toLocaleString()}`);
		lines.push(`> Total Articles: ${result.totalArticles}`);
		lines.push(`> AI Provider: ${this.settings.summarizationProvider}`);
		lines.push('');
		lines.push('---');
		lines.push('');

		// Articles
		if (result.summaries.length === 0) {
			lines.push('No articles were published yesterday.');
		} else {
			result.summaries.forEach((summary, index) => {
				// Article header
				lines.push(`## ${index + 1}. ${summary.title}`);
				lines.push('');

				// Metadata
				lines.push(`**Published**: ${summary.metadata.publishedAt}  `);
				lines.push(`**Source**: ${summary.metadata.feedName}  `);

				if (summary.metadata.noteLink) {
					lines.push(`**Note**: [Open in Obsidian](${summary.metadata.noteLink})  `);
				}

				lines.push('');

				// Summary
				lines.push('**AI Summary**:');
				lines.push('');
				lines.push(summary.summary);
				lines.push('');
				lines.push('---');
				lines.push('');
			});
		}

		// Footer
		lines.push('');
		lines.push('---');
		lines.push('');
		lines.push('*This summary was generated automatically by WeWe RSS AI Summarization feature.*');

		return lines.join('\n');
	}

	/**
	 * Parse publication date from various formats
	 * @param dateString Date string or timestamp
	 * @returns Unix timestamp in milliseconds, or 0 if invalid
	 */
	private parsePublishedDate(dateString: string | number | undefined): number {
		if (!dateString) {
			return 0;
		}

		// If already a number (Unix timestamp), return it
		if (typeof dateString === 'number') {
			return dateString;
		}

		// Try to parse as date string
		try {
			// Handle "Month Day" format (e.g., "November 19")
			// Infer current year
			if (/^[A-Za-z]+ \d{1,2}$/.test(dateString)) {
				const currentYear = new Date().getFullYear();
				const fullDateString = `${dateString}, ${currentYear}`;
				const timestamp = Date.parse(fullDateString);
				if (!isNaN(timestamp)) {
					return timestamp;
				}
			}

			// Try parsing as-is (handles ISO, US formats, etc.)
			const timestamp = Date.parse(dateString);
			if (!isNaN(timestamp)) {
				return timestamp;
			}

			// Invalid date
			return 0;
		} catch (error) {
			this.logger.debug('Failed to parse date', { dateString, error });
			return 0;
		}
	}

	/**
	 * Strip YAML frontmatter from markdown content
	 * @param content Markdown content with frontmatter
	 * @returns Content without frontmatter
	 */
	private stripFrontmatter(content: string): string {
		// Match frontmatter block: ---\n...\n---\n
		const frontmatterRegex = /^---\n[\s\S]*?\n---\n/;
		return content.replace(frontmatterRegex, '').trim();
	}

	/**
	 * Extract feed name from file path
	 * @param filePath Path to markdown file
	 * @returns Feed name (parent folder name) or "Unknown Feed"
	 */
	private extractFeedFromPath(filePath: string): string {
		// Split path by both forward and backward slashes
		const parts = filePath.split(/[\/\\]/);

		// Find the noteLocation folder index
		const noteLocationIndex = parts.indexOf(this.settings.noteLocation);

		// If noteLocation found and has a child folder, use it as feed name
		if (noteLocationIndex !== -1 && noteLocationIndex < parts.length - 2) {
			return parts[noteLocationIndex + 1];
		}

		// Fallback: use parent folder name
		if (parts.length >= 2) {
			return parts[parts.length - 2];
		}

		return 'Unknown Feed';
	}

	/**
	 * Recursively get all markdown files from a folder
	 * @param folder Folder to scan
	 * @returns Array of TFile objects
	 */
	private getAllMarkdownFiles(folder: TFolder): TFile[] {
		const files: TFile[] = [];

		for (const child of folder.children) {
			if (child instanceof TFile && child.extension === 'md') {
				files.push(child);
			} else if (child instanceof TFolder) {
				// Recursively scan subfolders
				files.push(...this.getAllMarkdownFiles(child));
			}
		}

		return files;
	}
}
