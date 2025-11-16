/**
 * Mock database utilities for testing
 * Provides in-memory SQLite database setup and helpers
 */

import initSqlJs, { Database } from 'sql.js';
import { DatabaseService } from '../../services/database/DatabaseService';
import { AccountFixture, allSampleAccounts } from '../fixtures/sample-accounts';
import { FeedFixture, allSampleFeeds } from '../fixtures/sample-feeds';
import { ArticleFixture, allSampleArticles } from '../fixtures/sample-articles';

/**
 * Create an in-memory SQLite database with schema
 */
export async function createMockDatabase(): Promise<Database> {
	const SQL = await initSqlJs();
	const db = new SQL.Database();

	// Create schema
	db.run(`
		CREATE TABLE IF NOT EXISTS accounts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			cookie TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'active',
			blacklisted_until INTEGER,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);
	`);

	db.run(`
		CREATE TABLE IF NOT EXISTS feeds (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			feed_id TEXT UNIQUE NOT NULL,
			title TEXT NOT NULL,
			description TEXT,
			account_id INTEGER NOT NULL,
			last_sync_at INTEGER,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			FOREIGN KEY (account_id) REFERENCES accounts(id)
		);
	`);

	db.run(`
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
			FOREIGN KEY (feed_id) REFERENCES feeds(id)
		);
	`);

	db.run(`
		CREATE TABLE IF NOT EXISTS settings (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL
		);
	`);

	db.run(`
		CREATE TABLE IF NOT EXISTS migrations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			applied_at INTEGER NOT NULL
		);
	`);

	// Create indexes
	db.run('CREATE INDEX IF NOT EXISTS idx_feeds_account_id ON feeds(account_id);');
	db.run('CREATE INDEX IF NOT EXISTS idx_articles_feed_id ON articles(feed_id);');
	db.run('CREATE INDEX IF NOT EXISTS idx_articles_synced ON articles(synced);');

	return db;
}

/**
 * Insert account fixture into database
 */
export function insertAccount(db: Database, account: AccountFixture): void {
	if (account.id !== undefined) {
		// Insert with specific ID
		const stmt = db.prepare(
			'INSERT INTO accounts (id, name, cookie, status, blacklisted_until, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
		);
		stmt.run([
			account.id,
			account.name,
			account.cookie,
			account.status,
			account.blacklisted_until,
			account.created_at,
			account.updated_at,
		]);
		stmt.free();
	} else {
		// Let ID auto-increment
		const stmt = db.prepare(
			'INSERT INTO accounts (name, cookie, status, blacklisted_until, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
		);
		stmt.run([
			account.name,
			account.cookie,
			account.status,
			account.blacklisted_until,
			account.created_at,
			account.updated_at,
		]);
		stmt.free();
	}
}

/**
 * Insert feed fixture into database
 */
export function insertFeed(db: Database, feed: FeedFixture): void {
	const stmt = db.prepare(
		'INSERT INTO feeds (id, feed_id, title, description, account_id, last_sync_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
	);
	stmt.run([
		feed.id,
		feed.feedId,
		feed.title,
		feed.description,
		feed.accountId,
		feed.lastSyncAt,
		feed.createdAt,
		feed.updatedAt,
	]);
	stmt.free();
}

/**
 * Insert article fixture into database
 */
export function insertArticle(db: Database, article: ArticleFixture): void {
	const stmt = db.prepare(
		'INSERT INTO articles (feed_id, title, content, content_html, url, published_at, synced, note_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
	);
	stmt.run([
		article.feed_id,
		article.title,
		article.content,
		article.content_html,
		article.url,
		article.published_at,
		article.synced,
		article.note_id,
		article.created_at,
	]);
	stmt.free();
}

/**
 * Seed database with all sample data
 */
export function seedDatabase(db: Database): void {
	// Insert accounts
	allSampleAccounts.forEach((account) => insertAccount(db, account));

	// Insert feeds
	allSampleFeeds.forEach((feed) => insertFeed(db, feed));

	// Insert articles
	allSampleArticles.forEach((article) => insertArticle(db, article));
}

/**
 * Seed database with specific fixtures
 */
export function seedDatabaseWith(
	db: Database,
	data: {
		accounts?: AccountFixture[];
		feeds?: FeedFixture[];
		articles?: ArticleFixture[];
	}
): void {
	if (data.accounts) {
		data.accounts.forEach((account) => insertAccount(db, account));
	}
	if (data.feeds) {
		data.feeds.forEach((feed) => insertFeed(db, feed));
	}
	if (data.articles) {
		data.articles.forEach((article) => insertArticle(db, article));
	}
}

/**
 * Get all rows from a table
 */
export function getAllRows(db: Database, tableName: string): any[] {
	const stmt = db.prepare(`SELECT * FROM ${tableName}`);
	const rows: any[] = [];

	while (stmt.step()) {
		rows.push(stmt.getAsObject());
	}

	stmt.free();
	return rows;
}

/**
 * Count rows in a table
 */
export function countRows(db: Database, tableName: string): number {
	const stmt = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`);
	stmt.step();
	const result = stmt.getAsObject();
	stmt.free();
	return (result.count as number) || 0;
}

/**
 * Clear all data from a table
 */
export function clearTable(db: Database, tableName: string): void {
	db.run(`DELETE FROM ${tableName}`);
}

/**
 * Clear all tables
 */
export function clearAllTables(db: Database): void {
	const tables = ['articles', 'feeds', 'accounts', 'settings', 'migrations'];
	tables.forEach((table) => clearTable(db, table));
}

/**
 * Export database to Uint8Array (for saving/loading)
 */
export function exportDatabase(db: Database): Uint8Array {
	return db.export();
}

/**
 * Import database from Uint8Array
 */
export async function importDatabase(data: Uint8Array): Promise<Database> {
	const SQL = await initSqlJs();
	return new SQL.Database(data);
}

/**
 * Execute raw SQL query
 */
export function executeQuery(db: Database, sql: string, params: any[] = []): any[] {
	const stmt = db.prepare(sql);
	if (params.length > 0) {
		stmt.bind(params);
	}

	const rows: any[] = [];
	while (stmt.step()) {
		rows.push(stmt.getAsObject());
	}

	stmt.free();
	return rows;
}

/**
 * Execute raw SQL command (INSERT, UPDATE, DELETE)
 */
export function executeCommand(db: Database, sql: string, params: any[] = []): void {
	const stmt = db.prepare(sql);
	if (params.length > 0) {
		stmt.bind(params);
	}
	stmt.step();
	stmt.free();
}

/**
 * Check if a table exists
 */
export function tableExists(db: Database, tableName: string): boolean {
	const stmt = db.prepare(
		"SELECT name FROM sqlite_master WHERE type='table' AND name=?"
	);
	stmt.bind([tableName]);
	const exists = stmt.step();
	stmt.free();
	return exists;
}

/**
 * Get table schema
 */
export function getTableSchema(db: Database, tableName: string): any[] {
	const stmt = db.prepare(`PRAGMA table_info(${tableName})`);
	const columns: any[] = [];

	while (stmt.step()) {
		columns.push(stmt.getAsObject());
	}

	stmt.free();
	return columns;
}

/**
 * Create a DatabaseService instance with mock database
 */
export async function createMockDatabaseService(): Promise<DatabaseService> {
	const db = await createMockDatabase();

	// Create a mock plugin
	const mockPlugin = {
		manifest: {
			dir: '.obsidian/plugins/wewe-rss',
			id: 'wewe-rss',
			name: 'WeWe RSS',
			version: '0.1.0',
		},
		app: {
			vault: {
				adapter: {
					exists: jest.fn().mockResolvedValue(false),
					readBinary: jest.fn(),
					writeBinary: jest.fn(),
				},
			},
		},
	} as any;

	const dbService = new DatabaseService(mockPlugin);

	// Replace the internal database with our mock
	(dbService as any).db = db;
	(dbService as any).initialized = true;

	return dbService;
}

/**
 * Helper to verify database state in tests
 */
export class DatabaseStateVerifier {
	constructor(private db: Database) {}

	hasAccount(accountId: string): boolean {
		const rows = executeQuery(this.db, 'SELECT * FROM accounts WHERE id = ?', [accountId]);
		return rows.length > 0;
	}

	hasFeed(feedId: string): boolean {
		const rows = executeQuery(this.db, 'SELECT * FROM feeds WHERE feed_id = ?', [feedId]);
		return rows.length > 0;
	}

	hasArticle(articleId: string): boolean {
		const rows = executeQuery(this.db, 'SELECT * FROM articles WHERE id = ?', [articleId]);
		return rows.length > 0;
	}

	getAccountStatus(accountId: string): string | null {
		const rows = executeQuery(this.db, 'SELECT status FROM accounts WHERE id = ?', [
			accountId,
		]);
		return rows.length > 0 ? (rows[0].status as string) : null;
	}

	getArticleSyncStatus(articleId: string): boolean {
		const rows = executeQuery(this.db, 'SELECT synced FROM articles WHERE id = ?', [
			articleId,
		]);
		return rows.length > 0 ? (rows[0].synced as number) === 1 : false;
	}

	getFeedArticleCount(feedId: string): number {
		const rows = executeQuery(
			this.db,
			'SELECT COUNT(*) as count FROM articles WHERE feed_id = ?',
			[feedId]
		);
		return rows.length > 0 ? (rows[0].count as number) : 0;
	}

	getUnsyncedArticleCount(): number {
		const rows = executeQuery(
			this.db,
			'SELECT COUNT(*) as count FROM articles WHERE synced = 0'
		);
		return rows.length > 0 ? (rows[0].count as number) : 0;
	}
}

/**
 * Create a verifier for database state assertions
 */
export function createVerifier(db: Database): DatabaseStateVerifier {
	return new DatabaseStateVerifier(db);
}
