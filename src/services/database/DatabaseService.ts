import { Database } from 'sql.js';
import { normalizePath } from 'obsidian';
import WeWeRssPlugin from '../../main';
import { sqlJsWrapper } from '../../lib/sql-js-wrapper';
import { logger } from '../../utils/logger';
import { DB_NAME } from '../../utils/constants';
import { AccountRepository, FeedRepository, ArticleRepository } from './repositories';

/**
 * DatabaseService - SQLite database wrapper using sql.js
 *
 * Manages the embedded SQLite database for WeWe RSS with file persistence.
 */
export class DatabaseService {
	plugin: WeWeRssPlugin;
	db: Database | null = null;
	initialized: boolean = false;
	private dbPath: string;
	private saveTimer: NodeJS.Timeout | null = null;

	// Repository instances
	public accounts: AccountRepository;
	public feeds: FeedRepository;
	public articles: ArticleRepository;

	constructor(plugin: WeWeRssPlugin) {
		this.plugin = plugin;
		this.dbPath = normalizePath(`${plugin.manifest.dir}/${DB_NAME}`);

		// Initialize repositories
		this.accounts = new AccountRepository(this);
		this.feeds = new FeedRepository(this);
		this.articles = new ArticleRepository(this);
	}

	/**
	 * Initialize the database connection
	 */
	async initialize(): Promise<void> {
		if (this.initialized) {
			logger.debug('Database already initialized');
			return;
		}

		try {
			logger.info('Initializing database...');

			// Initialize sql.js WASM
			await sqlJsWrapper.initialize();

			// Try to load existing database
			const dbExists = await this.plugin.app.vault.adapter.exists(this.dbPath);

			if (dbExists) {
				logger.info('Loading existing database from:', this.dbPath);
				const dbData = await this.plugin.app.vault.adapter.readBinary(this.dbPath);
				this.db = sqlJsWrapper.loadDatabase(new Uint8Array(dbData));
				logger.info('Database loaded successfully');
			} else {
				logger.info('Creating new database');
				this.db = sqlJsWrapper.createDatabase();

				// Run initial migrations
				await this.runMigrations();

				// Save the new database
				await this.save();
				logger.info('New database created and saved');
			}

			this.initialized = true;

			// Setup auto-save every 30 seconds
			this.setupAutoSave();

		} catch (error) {
			logger.error('Failed to initialize database:', error);
			throw error;
		}
	}

	/**
	 * Run database migrations
	 */
	private async runMigrations(): Promise<void> {
		if (!this.db) {
			throw new Error('Database not initialized');
		}

		logger.info('Running database migrations...');

		// Create migrations table if it doesn't exist
		this.db.run(`
			CREATE TABLE IF NOT EXISTS migrations (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				name TEXT NOT NULL UNIQUE,
				applied_at INTEGER NOT NULL
			)
		`);

		// Check if we need to run initial migration
		const result = this.db.exec(`
			SELECT name FROM migrations WHERE name = '001_initial'
		`);

		if (result.length === 0 || result[0].values.length === 0) {
			logger.info('Running migration: 001_initial');
			await this.runInitialMigration();

			// Record migration
			this.db.run(`
				INSERT INTO migrations (name, applied_at)
				VALUES ('001_initial', ?)
			`, [Date.now()]);

			logger.info('Migration 001_initial completed');
		} else {
			logger.info('Database already migrated');
		}
	}

	/**
	 * Run initial migration (create tables)
	 */
	private async runInitialMigration(): Promise<void> {
		if (!this.db) {
			throw new Error('Database not initialized');
		}

		// Accounts table
		this.db.run(`
			CREATE TABLE IF NOT EXISTS accounts (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				name TEXT NOT NULL,
				cookie TEXT NOT NULL,
				status TEXT NOT NULL DEFAULT 'active',
				blacklisted_until INTEGER,
				created_at INTEGER NOT NULL,
				updated_at INTEGER NOT NULL
			)
		`);

		// Feeds table
		this.db.run(`
			CREATE TABLE IF NOT EXISTS feeds (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				feed_id TEXT NOT NULL UNIQUE,
				title TEXT NOT NULL,
				description TEXT,
				account_id INTEGER NOT NULL,
				last_sync_at INTEGER,
				created_at INTEGER NOT NULL,
				updated_at INTEGER NOT NULL,
				FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
			)
		`);

		// Articles table
		this.db.run(`
			CREATE TABLE IF NOT EXISTS articles (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				feed_id INTEGER NOT NULL,
				title TEXT NOT NULL,
				content TEXT NOT NULL,
				content_html TEXT NOT NULL,
				url TEXT NOT NULL UNIQUE,
				published_at INTEGER NOT NULL,
				synced INTEGER NOT NULL DEFAULT 0,
				note_id TEXT,
				created_at INTEGER NOT NULL,
				FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE
			)
		`);

		// Settings table
		this.db.run(`
			CREATE TABLE IF NOT EXISTS settings (
				key TEXT PRIMARY KEY,
				value TEXT NOT NULL
			)
		`);

		// Create indexes for better performance
		this.db.run('CREATE INDEX IF NOT EXISTS idx_feeds_feed_id ON feeds(feed_id)');
		this.db.run('CREATE INDEX IF NOT EXISTS idx_articles_feed_id ON articles(feed_id)');
		this.db.run('CREATE INDEX IF NOT EXISTS idx_articles_url ON articles(url)');
		this.db.run('CREATE INDEX IF NOT EXISTS idx_articles_synced ON articles(synced)');

		logger.info('Initial database schema created');
	}

	/**
	 * Save database to file
	 */
	async save(): Promise<void> {
		if (!this.db) {
			logger.warn('Cannot save: database not initialized');
			return;
		}

		try {
			logger.debug('Saving database to:', this.dbPath);
			const data = sqlJsWrapper.exportDatabase(this.db);

			// Ensure directory exists
			const dir = this.dbPath.substring(0, this.dbPath.lastIndexOf('/'));
			if (!(await this.plugin.app.vault.adapter.exists(dir))) {
				await this.plugin.app.vault.adapter.mkdir(dir);
			}

			// Convert Uint8Array to ArrayBuffer for Obsidian API
			const buffer = data.buffer.slice(0) as ArrayBuffer;
			await this.plugin.app.vault.adapter.writeBinary(this.dbPath, buffer);
			logger.debug('Database saved successfully');
		} catch (error) {
			logger.error('Failed to save database:', error);
			throw error;
		}
	}

	/**
	 * Setup auto-save timer
	 */
	private setupAutoSave(): void {
		// Clear existing timer
		if (this.saveTimer) {
			clearInterval(this.saveTimer);
		}

		// Save every 30 seconds
		this.saveTimer = setInterval(async () => {
			await this.save();
		}, 30000);

		logger.info('Auto-save enabled (30s interval)');
	}

	/**
	 * Close database connection
	 */
	async close(): Promise<void> {
		if (this.saveTimer) {
			clearInterval(this.saveTimer);
			this.saveTimer = null;
		}

		if (this.db) {
			// Final save before closing
			await this.save();
			this.db.close();
			this.db = null;
			logger.info('Database connection closed');
		}

		this.initialized = false;
	}

	/**
	 * Execute a SQL query that returns results
	 */
	query<T = any>(sql: string, params: any[] = []): T[] {
		if (!this.initialized || !this.db) {
			throw new Error('Database not initialized');
		}

		try {
			const result = this.db.exec(sql, params);

			if (result.length === 0) {
				return [];
			}

			const columns = result[0].columns;
			const values = result[0].values;

			return values.map((row: any[]) => {
				const obj: any = {};
				columns.forEach((col: string, idx: number) => {
					obj[col] = row[idx];
				});
				return obj as T;
			});
		} catch (error) {
			logger.error('Query failed:', sql, error);
			throw error;
		}
	}

	/**
	 * Execute a SQL query that returns a single result
	 */
	queryOne<T = any>(sql: string, params: any[] = []): T | null {
		const results = this.query<T>(sql, params);
		return results.length > 0 ? results[0] : null;
	}

	/**
	 * Execute a SQL statement (INSERT, UPDATE, DELETE)
	 */
	execute(sql: string, params: any[] = []): void {
		if (!this.initialized || !this.db) {
			throw new Error('Database not initialized');
		}

		try {
			this.db.run(sql, params);
		} catch (error) {
			logger.error('Execute failed:', sql, error);
			throw error;
		}
	}

	/**
	 * Get the last inserted row ID
	 */
	getLastInsertId(): number {
		if (!this.db) {
			throw new Error('Database not initialized');
		}

		const result = this.db.exec('SELECT last_insert_rowid() as id');
		return result[0].values[0][0] as number;
	}

	/**
	 * Begin a transaction
	 */
	beginTransaction(): void {
		this.execute('BEGIN TRANSACTION');
	}

	/**
	 * Commit a transaction
	 */
	commit(): void {
		this.execute('COMMIT');
	}

	/**
	 * Rollback a transaction
	 */
	rollback(): void {
		this.execute('ROLLBACK');
	}
}
