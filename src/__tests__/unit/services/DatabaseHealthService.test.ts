/**
 * Unit tests for DatabaseHealthService
 * Tests integrity checks, schema validation, and health reports
 */

import { DatabaseHealthService } from '../../../services/database/DatabaseHealthService';
import initSqlJs, { Database } from 'sql.js';

// Helper to create mock database
async function createTestDatabase(): Promise<Database> {
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
		)
	`);

	db.run(`
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
			FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE
		)
	`);

	db.run(`
		CREATE TABLE IF NOT EXISTS migrations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL UNIQUE,
			applied_at INTEGER NOT NULL
		)
	`);

	return db;
}

describe('DatabaseHealthService', () => {
	let healthService: DatabaseHealthService;
	let db: Database;

	beforeEach(async () => {
		db = await createTestDatabase();
		healthService = new DatabaseHealthService(db);
	});

	afterEach(() => {
		db.close();
	});

	describe('checkIntegrity', () => {
		it('should return healthy status for valid database', async () => {
			const result = await healthService.checkIntegrity();

			expect(result.isHealthy).toBe(true);
			expect(result.errors).toEqual([]);
			expect(result.warnings).toEqual([]);
		});

		it('should detect corrupted database', async () => {
			// Corrupt the database by executing invalid SQL that breaks integrity
			// Note: sql.js in-memory DB is hard to corrupt, so we mock the exec
			const mockExec = jest.spyOn(db, 'exec');
			mockExec.mockReturnValue([
				{
					columns: ['integrity_check'],
					values: [['*** in database main ***'], ['Page 1: bad']],
				},
			]);

			const result = await healthService.checkIntegrity();

			expect(result.isHealthy).toBe(false);
			expect(result.errors).toHaveLength(2);
			expect(result.errors[0]).toBe('*** in database main ***');
			expect(result.errors[1]).toBe('Page 1: bad');

			mockExec.mockRestore();
		});

		it('should handle integrity check returning no results', async () => {
			const mockExec = jest.spyOn(db, 'exec');
			mockExec.mockReturnValue([]);

			const result = await healthService.checkIntegrity();

			expect(result.isHealthy).toBe(false);
			expect(result.errors).toContain(
				'Integrity check returned no results'
			);

			mockExec.mockRestore();
		});

		it('should handle integrity check errors', async () => {
			const mockExec = jest.spyOn(db, 'exec');
			mockExec.mockImplementation(() => {
				throw new Error('Database error');
			});

			const result = await healthService.checkIntegrity();

			expect(result.isHealthy).toBe(false);
			expect(result.errors).toContain('Database error');

			mockExec.mockRestore();
		});
	});

	describe('validateSchema', () => {
		it('should return healthy status when all required tables exist', async () => {
			const result = await healthService.validateSchema();

			expect(result.isHealthy).toBe(true);
			expect(result.errors).toEqual([]);
			expect(result.warnings).toEqual([]);
		});

		it('should detect missing tables', async () => {
			// Drop a required table
			db.run('DROP TABLE articles');

			const result = await healthService.validateSchema();

			expect(result.isHealthy).toBe(false);
			expect(result.warnings).toHaveLength(1);
			expect(result.warnings[0]).toBe('Missing table: articles');
		});

		it('should detect multiple missing tables', async () => {
			// Drop multiple tables
			db.run('DROP TABLE articles');
			db.run('DROP TABLE feeds');

			const result = await healthService.validateSchema();

			expect(result.isHealthy).toBe(false);
			expect(result.warnings).toHaveLength(2);
			expect(result.warnings).toContain('Missing table: articles');
			expect(result.warnings).toContain('Missing table: feeds');
		});

		it('should handle empty database (no tables)', async () => {
			// Create new empty database
			const emptyDb = new (db.constructor as any)();
			const emptyHealthService = new DatabaseHealthService(emptyDb);

			const result = await emptyHealthService.validateSchema();

			expect(result.isHealthy).toBe(false);
			expect(result.errors).toContain('No tables found in database');

			emptyDb.close();
		});

		it('should handle schema validation errors', async () => {
			const mockExec = jest.spyOn(db, 'exec');
			mockExec.mockImplementation(() => {
				throw new Error('Schema query failed');
			});

			const result = await healthService.validateSchema();

			expect(result.isHealthy).toBe(false);
			expect(result.errors).toContain('Schema query failed');

			mockExec.mockRestore();
		});
	});

	describe('performHealthCheck', () => {
		it('should return complete health report for healthy database', async () => {
			const report = await healthService.performHealthCheck();

			expect(report.timestamp).toBeDefined();
			expect(report.timestamp).toBeGreaterThan(0);

			expect(report.integrity.isHealthy).toBe(true);
			expect(report.schema.isHealthy).toBe(true);

			expect(report.recommendations).toEqual([
				'Database is healthy - no action needed',
			]);
		});

		it('should recommend restoration when integrity fails', async () => {
			const mockExec = jest.spyOn(db, 'exec');
			mockExec.mockImplementation((sql: string) => {
				if (sql.includes('integrity_check')) {
					return [
						{
							columns: ['integrity_check'],
							values: [['corruption detected']],
						},
					];
				}
				// Default for other queries
				return db.exec(sql);
			});

			const report = await healthService.performHealthCheck();

			expect(report.integrity.isHealthy).toBe(false);
			expect(report.recommendations).toContain(
				'Database integrity compromised - restore from backup immediately'
			);
			expect(report.recommendations).toContain(
				'Do not perform any write operations until restoration is complete'
			);

			mockExec.mockRestore();
		});

		it('should recommend migrations when schema is invalid', async () => {
			// Drop a table to make schema invalid
			db.run('DROP TABLE migrations');

			const report = await healthService.performHealthCheck();

			expect(report.schema.isHealthy).toBe(false);
			expect(report.recommendations).toContain(
				'Missing tables detected - run database migrations'
			);
		});

		it('should provide multiple recommendations for multiple issues', async () => {
			const mockExec = jest.spyOn(db, 'exec');
			mockExec.mockImplementation((sql: string) => {
				if (sql.includes('integrity_check')) {
					return [
						{
							columns: ['integrity_check'],
							values: [['corruption']],
						},
					];
				}
				// Make schema check fail too
				if (sql.includes('sqlite_master')) {
					return [
						{
							columns: ['name'],
							values: [['accounts']], // Only one table
						},
					];
				}
				return [];
			});

			const report = await healthService.performHealthCheck();

			expect(report.integrity.isHealthy).toBe(false);
			expect(report.schema.isHealthy).toBe(false);
			expect(report.recommendations.length).toBeGreaterThan(1);

			mockExec.mockRestore();
		});

		it('should include timestamp in milliseconds', async () => {
			const beforeTest = Date.now();
			const report = await healthService.performHealthCheck();
			const afterTest = Date.now();

			expect(report.timestamp).toBeGreaterThanOrEqual(beforeTest);
			expect(report.timestamp).toBeLessThanOrEqual(afterTest);
		});
	});

	describe('isHealthy', () => {
		it('should return true for healthy database', async () => {
			const isHealthy = await healthService.isHealthy();

			expect(isHealthy).toBe(true);
		});

		it('should return false for corrupted database', async () => {
			const mockExec = jest.spyOn(db, 'exec');
			mockExec.mockReturnValue([
				{
					columns: ['integrity_check'],
					values: [['corruption detected']],
				},
			]);

			const isHealthy = await healthService.isHealthy();

			expect(isHealthy).toBe(false);

			mockExec.mockRestore();
		});

		it('should only check integrity (not schema)', async () => {
			// Drop a table (schema issue, but not integrity issue)
			db.run('DROP TABLE migrations');

			// Integrity should still be fine
			const isHealthy = await healthService.isHealthy();

			expect(isHealthy).toBe(true); // Because we only check integrity
		});
	});

	describe('error handling', () => {
		it('should handle database closed state gracefully', async () => {
			db.close();

			const result = await healthService.checkIntegrity();

			expect(result.isHealthy).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('should handle malformed integrity check results', async () => {
			const mockExec = jest.spyOn(db, 'exec');
			mockExec.mockReturnValue([
				{
					columns: [],
					values: [],
				},
			] as any);

			const result = await healthService.checkIntegrity();

			// Should still handle gracefully
			expect(result).toBeDefined();
			expect(typeof result.isHealthy).toBe('boolean');

			mockExec.mockRestore();
		});
	});
});
