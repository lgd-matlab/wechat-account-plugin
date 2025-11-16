import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { logger } from '../utils/logger';

/**
 * SQLJsWrapper - Handles sql.js initialization and database management
 */
export class SQLJsWrapper {
	private SQL: SqlJsStatic | null = null;
	private initialized: boolean = false;

	/**
	 * Initialize sql.js library
	 * This loads the WASM file and prepares sql.js for use
	 */
	async initialize(): Promise<void> {
		if (this.initialized) {
			logger.debug('sql.js already initialized');
			return;
		}

		try {
			logger.info('Initializing sql.js...');

			// Initialize sql.js with WASM
			// Note: The WASM file will be bundled with the plugin
			this.SQL = await initSqlJs({
				// In production, this should point to the bundled WASM file
				// For now, sql.js will try to load from CDN or local
				locateFile: (file: string) => {
					// Try to load from plugin directory
					return `https://sql.js.org/dist/${file}`;
				}
			});

			this.initialized = true;
			logger.info('sql.js initialized successfully');
		} catch (error) {
			logger.error('Failed to initialize sql.js:', error);
			throw new Error('Failed to initialize database engine');
		}
	}

	/**
	 * Create a new in-memory database
	 */
	createDatabase(): Database {
		if (!this.SQL) {
			throw new Error('sql.js not initialized. Call initialize() first.');
		}

		logger.debug('Creating new in-memory database');
		return new this.SQL.Database();
	}

	/**
	 * Load database from Uint8Array (from file)
	 */
	loadDatabase(data: Uint8Array): Database {
		if (!this.SQL) {
			throw new Error('sql.js not initialized. Call initialize() first.');
		}

		logger.debug('Loading database from buffer');
		return new this.SQL.Database(data);
	}

	/**
	 * Export database to Uint8Array (for saving to file)
	 */
	exportDatabase(db: Database): Uint8Array {
		logger.debug('Exporting database to buffer');
		return db.export();
	}

	/**
	 * Check if sql.js is initialized
	 */
	isInitialized(): boolean {
		return this.initialized;
	}
}

// Singleton instance
export const sqlJsWrapper = new SQLJsWrapper();
