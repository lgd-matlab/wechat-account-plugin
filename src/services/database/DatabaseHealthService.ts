import { Database } from 'sql.js';
import { HealthCheckResult, HealthReport } from '../../types';
import { logger } from '../../utils/logger';

/**
 * DatabaseHealthService
 *
 * Monitors database health and detects corruption
 *
 * Features:
 * - Run SQLite integrity checks
 * - Validate schema structure
 * - Generate comprehensive health reports
 * - Provide recovery recommendations
 *
 * @example
 * const healthService = new DatabaseHealthService(db);
 * const report = await healthService.performHealthCheck();
 * if (!report.integrity.isHealthy) {
 *   console.log('Database corrupted!');
 * }
 */
export class DatabaseHealthService {
	private db: Database;
	private requiredTables = ['accounts', 'feeds', 'articles', 'migrations'];

	constructor(db: Database) {
		this.db = db;
	}

	/**
	 * Check database integrity using SQLite's built-in checker
	 *
	 * @returns Integrity check result
	 */
	async checkIntegrity(): Promise<HealthCheckResult> {
		try {
			const result = this.db.exec('PRAGMA integrity_check');

			if (result.length === 0) {
				// No results means check failed
				return {
					isHealthy: false,
					errors: ['Integrity check returned no results'],
					warnings: [],
				};
			}

			const rows = result[0].values;
			const messages = rows.map((row) => row[0] as string);

			// "ok" means database is healthy
			if (messages.length === 1 && messages[0] === 'ok') {
				logger.debug('[DatabaseHealthService] Integrity check passed');
				return {
					isHealthy: true,
					errors: [],
					warnings: [],
				};
			}

			// Any other message indicates corruption
			logger.error(
				'[DatabaseHealthService] Integrity check failed:',
				messages
			);
			return {
				isHealthy: false,
				errors: messages,
				warnings: [],
			};
		} catch (error) {
			logger.error('[DatabaseHealthService] Integrity check error:', error);
			return {
				isHealthy: false,
				errors: [
					error instanceof Error
						? error.message
						: 'Unknown integrity check error',
				],
				warnings: [],
			};
		}
	}

	/**
	 * Validate database schema structure
	 *
	 * @returns Schema validation result
	 */
	async validateSchema(): Promise<HealthCheckResult> {
		try {
			const result = this.db.exec(
				"SELECT name FROM sqlite_master WHERE type='table'"
			);

			if (result.length === 0) {
				return {
					isHealthy: false,
					errors: ['No tables found in database'],
					warnings: [],
				};
			}

			const existingTables = result[0].values.map(
				(row) => row[0] as string
			);
			const missingTables = this.requiredTables.filter(
				(table) => !existingTables.includes(table)
			);

			if (missingTables.length > 0) {
				logger.warn(
					`[DatabaseHealthService] Missing tables: ${missingTables.join(', ')}`
				);
				return {
					isHealthy: false,
					errors: [],
					warnings: missingTables.map(
						(table) => `Missing table: ${table}`
					),
				};
			}

			logger.debug('[DatabaseHealthService] Schema validation passed');
			return {
				isHealthy: true,
				errors: [],
				warnings: [],
			};
		} catch (error) {
			logger.error('[DatabaseHealthService] Schema validation error:', error);
			return {
				isHealthy: false,
				errors: [
					error instanceof Error
						? error.message
						: 'Unknown schema validation error',
				],
				warnings: [],
			};
		}
	}

	/**
	 * Perform comprehensive health check
	 *
	 * @returns Complete health report
	 */
	async performHealthCheck(): Promise<HealthReport> {
		const timestamp = Date.now();
		const integrity = await this.checkIntegrity();
		const schema = await this.validateSchema();

		const recommendations: string[] = [];

		// Generate recommendations based on results
		if (!integrity.isHealthy) {
			recommendations.push(
				'Database integrity compromised - restore from backup immediately'
			);
			recommendations.push(
				'Do not perform any write operations until restoration is complete'
			);
		}

		if (!schema.isHealthy && schema.warnings.length > 0) {
			recommendations.push(
				'Missing tables detected - run database migrations'
			);
		}

		if (integrity.isHealthy && schema.isHealthy) {
			recommendations.push('Database is healthy - no action needed');
		}

		const report: HealthReport = {
			timestamp,
			integrity,
			schema,
			recommendations,
		};

		// Log summary
		if (!integrity.isHealthy || !schema.isHealthy) {
			logger.warn('[DatabaseHealthService] Health check found issues:', {
				integrityOk: integrity.isHealthy,
				schemaOk: schema.isHealthy,
			});
		} else {
			logger.debug('[DatabaseHealthService] Health check passed');
		}

		return report;
	}

	/**
	 * Quick health check (integrity only)
	 *
	 * @returns True if database is healthy
	 */
	async isHealthy(): Promise<boolean> {
		const integrity = await this.checkIntegrity();
		return integrity.isHealthy;
	}
}
