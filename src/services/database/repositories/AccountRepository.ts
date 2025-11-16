import { DatabaseService } from '../DatabaseService';
import { Account, AccountStatus } from '../../../types';
import { logger } from '../../../utils/logger';

/**
 * AccountRepository - Manages WeChat Reading accounts in the database
 */
export class AccountRepository {
	private db: DatabaseService;

	constructor(db: DatabaseService) {
		this.db = db;
	}

	/**
	 * Create a new account
	 */
	async create(name: string, cookie: string): Promise<Account> {
		const now = Date.now();

		this.db.execute(
			`INSERT INTO accounts (name, cookie, status, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?)`,
			[name, cookie, AccountStatus.ACTIVE, now, now]
		);

		const id = this.db.getLastInsertId();

		logger.info('Account created:', { id, name });

		return {
			id,
			name,
			cookie,
			status: AccountStatus.ACTIVE,
			createdAt: now,
			updatedAt: now,
		};
	}

	/**
	 * Find account by ID
	 */
	findById(id: number): Account | null {
		const result = this.db.queryOne<any>(
			'SELECT * FROM accounts WHERE id = ?',
			[id]
		);

		if (!result) {
			return null;
		}

		return this.mapToAccount(result);
	}

	/**
	 * Find all accounts
	 */
	findAll(): Account[] {
		const results = this.db.query<any>('SELECT * FROM accounts ORDER BY created_at DESC');
		return results.map(r => this.mapToAccount(r));
	}

	/**
	 * Find active accounts (not disabled or expired)
	 */
	findActive(): Account[] {
		const results = this.db.query<any>(
			`SELECT * FROM accounts
			WHERE status = ? OR status = ?
			ORDER BY created_at DESC`,
			[AccountStatus.ACTIVE, AccountStatus.BLACKLISTED]
		);
		return results.map(r => this.mapToAccount(r));
	}

	/**
	 * Find accounts by status
	 */
	findByStatus(status: AccountStatus): Account[] {
		const results = this.db.query<any>(
			'SELECT * FROM accounts WHERE status = ? ORDER BY created_at DESC',
			[status]
		);
		return results.map(r => this.mapToAccount(r));
	}

	/**
	 * Update account status
	 */
	updateStatus(id: number, status: AccountStatus, blacklistedUntil?: number): void {
		const now = Date.now();

		if (blacklistedUntil !== undefined) {
			this.db.execute(
				`UPDATE accounts
				SET status = ?, blacklisted_until = ?, updated_at = ?
				WHERE id = ?`,
				[status, blacklistedUntil, now, id]
			);
		} else {
			this.db.execute(
				`UPDATE accounts
				SET status = ?, blacklisted_until = NULL, updated_at = ?
				WHERE id = ?`,
				[status, now, id]
			);
		}

		logger.info('Account status updated:', { id, status, blacklistedUntil });
	}

	/**
	 * Mark account as blacklisted (小黑屋) with expiry
	 */
	blacklist(id: number, durationMs: number = 24 * 60 * 60 * 1000): void {
		const blacklistedUntil = Date.now() + durationMs;
		this.updateStatus(id, AccountStatus.BLACKLISTED, blacklistedUntil);
		logger.warn('Account blacklisted until:', new Date(blacklistedUntil).toISOString());
	}

	/**
	 * Check if blacklist period has expired and update status
	 */
	checkAndClearBlacklist(id: number): boolean {
		const account = this.findById(id);

		if (!account) {
			return false;
		}

		if (account.status === AccountStatus.BLACKLISTED && account.blacklistedUntil) {
			if (Date.now() > account.blacklistedUntil) {
				this.updateStatus(id, AccountStatus.ACTIVE);
				logger.info('Account blacklist cleared:', id);
				return true;
			}
		}

		return false;
	}

	/**
	 * Update account cookie
	 */
	updateCookie(id: number, cookie: string): void {
		const now = Date.now();
		this.db.execute(
			'UPDATE accounts SET cookie = ?, updated_at = ? WHERE id = ?',
			[cookie, now, id]
		);
		logger.info('Account cookie updated:', id);
	}

	/**
	 * Update account name
	 */
	updateName(id: number, name: string): void {
		const now = Date.now();
		this.db.execute(
			'UPDATE accounts SET name = ?, updated_at = ? WHERE id = ?',
			[name, now, id]
		);
		logger.info('Account name updated:', { id, name });
	}

	/**
	 * Delete account
	 */
	delete(id: number): void {
		this.db.execute('DELETE FROM accounts WHERE id = ?', [id]);
		logger.info('Account deleted:', id);
	}

	/**
	 * Count total accounts
	 */
	count(): number {
		const result = this.db.queryOne<{ count: number }>(
			'SELECT COUNT(*) as count FROM accounts'
		);
		return result?.count || 0;
	}

	/**
	 * Count accounts by status
	 */
	countByStatus(status: AccountStatus): number {
		const result = this.db.queryOne<{ count: number }>(
			'SELECT COUNT(*) as count FROM accounts WHERE status = ?',
			[status]
		);
		return result?.count || 0;
	}

	/**
	 * Map database row to Account object
	 */
	private mapToAccount(row: any): Account {
		return {
			id: row.id,
			name: row.name,
			cookie: row.cookie,
			status: row.status as AccountStatus,
			blacklistedUntil: row.blacklisted_until || undefined,
			createdAt: row.created_at,
			updatedAt: row.updated_at,
		};
	}
}
