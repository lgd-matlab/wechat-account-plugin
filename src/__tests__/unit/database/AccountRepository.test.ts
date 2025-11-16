/**
 * Unit tests for AccountRepository
 * Tests all account database operations
 */

import { Database } from 'sql.js';
import { AccountRepository } from '../../../services/database/repositories/AccountRepository';
import { DatabaseService } from '../../../services/database/DatabaseService';
import { AccountStatus } from '../../../types';
import {
	createMockDatabase,
	insertAccount,
	seedDatabaseWith,
	getAllRows,
	countRows,
	clearAllTables,
} from '../../mocks/database';
import {
	sampleAccount1,
	sampleAccount2,
	sampleAccountBlacklisted,
	sampleAccountExpiredBlacklist,
	sampleAccountDisabled,
	sampleAccountExpired,
	activeAccounts,
} from '../../fixtures/sample-accounts';

describe('AccountRepository', () => {
	let db: Database;
	let dbService: DatabaseService;
	let repository: AccountRepository;

	beforeEach(async () => {
		// Create fresh in-memory database for each test
		db = await createMockDatabase();

		// Create mock plugin
		const mockPlugin = {
			manifest: { dir: '.obsidian/plugins/wewe-rss' },
			app: { vault: { adapter: { exists: jest.fn(), readBinary: jest.fn(), writeBinary: jest.fn() } } },
		} as any;

		dbService = new DatabaseService(mockPlugin);
		(dbService as any).db = db;
		(dbService as any).initialized = true;
		repository = new AccountRepository(dbService);
	});

	afterEach(() => {
		// Clean up
		if (db) {
			db.close();
		}
	});

	describe('create', () => {
		it('should create a new account with default ACTIVE status', async () => {
			const name = 'test_user';
			const cookie = JSON.stringify({ vid: 12345, token: 'test-token' });

			const account = await repository.create(name, cookie);

			expect(account).toBeDefined();
			expect(account.id).toBeDefined();
			expect(account.name).toBe(name);
			expect(account.cookie).toBe(cookie);
			expect(account.status).toBe(AccountStatus.ACTIVE);
			expect(account.createdAt).toBeDefined();
			expect(account.updatedAt).toBeDefined();
		});

		it('should persist the account to database', async () => {
			await repository.create('test_user', 'test-cookie');

			const rows = getAllRows(db, 'accounts');
			expect(rows).toHaveLength(1);
			expect(rows[0].name).toBe('test_user');
		});

		it('should allow creating multiple accounts', async () => {
			await repository.create('user1', 'cookie1');
			await repository.create('user2', 'cookie2');
			await repository.create('user3', 'cookie3');

			const count = countRows(db, 'accounts');
			expect(count).toBe(3);
		});
	});

	describe('findById', () => {
		it('should find an existing account by ID', () => {
			insertAccount(db, sampleAccount1);

			const account = repository.findById(sampleAccount1.id as any);

			expect(account).toBeDefined();
			expect(account?.name).toBe(sampleAccount1.name);
			expect(account?.cookie).toBe(sampleAccount1.cookie);
		});

		it('should return null for non-existent ID', () => {
			const account = repository.findById(99999);

			expect(account).toBeNull();
		});

		it('should return account with correct status', () => {
			insertAccount(db, sampleAccountBlacklisted);

			const account = repository.findById(sampleAccountBlacklisted.id as any);

			expect(account?.status).toBe(AccountStatus.BLACKLISTED);
			expect(account?.blacklistedUntil).toBeDefined();
		});
	});

	describe('findAll', () => {
		it('should return empty array when no accounts exist', () => {
			const accounts = repository.findAll();

			expect(accounts).toEqual([]);
		});

		it('should return all accounts', () => {
			insertAccount(db, sampleAccount1);
			insertAccount(db, sampleAccount2);
			insertAccount(db, sampleAccountDisabled);

			const accounts = repository.findAll();

			expect(accounts).toHaveLength(3);
		});

		it('should return accounts ordered by creation date (newest first)', () => {
			const older = { ...sampleAccount1, created_at: 1000 };
			const newer = { ...sampleAccount2, created_at: 2000 };

			insertAccount(db, older);
			insertAccount(db, newer);

			const accounts = repository.findAll();

			expect(accounts[0].createdAt).toBe(2000);
			expect(accounts[1].createdAt).toBe(1000);
		});
	});

	describe('findActive', () => {
		it('should return only ACTIVE and BLACKLISTED accounts', () => {
			seedDatabaseWith(db, {
				accounts: [
					sampleAccount1, // ACTIVE
					sampleAccountBlacklisted, // BLACKLISTED
					sampleAccountDisabled, // DISABLED
					sampleAccountExpired, // EXPIRED
				],
			});

			const accounts = repository.findActive();

			expect(accounts).toHaveLength(2);
			expect(accounts.every(a =>
				a.status === AccountStatus.ACTIVE || a.status === AccountStatus.BLACKLISTED
			)).toBe(true);
		});

		it('should return empty array when no active accounts', () => {
			seedDatabaseWith(db, {
				accounts: [sampleAccountDisabled, sampleAccountExpired],
			});

			const accounts = repository.findActive();

			expect(accounts).toEqual([]);
		});
	});

	describe('findByStatus', () => {
		it('should find accounts by ACTIVE status', () => {
			seedDatabaseWith(db, {
				accounts: [sampleAccount1, sampleAccount2, sampleAccountDisabled],
			});

			const accounts = repository.findByStatus(AccountStatus.ACTIVE);

			expect(accounts).toHaveLength(2);
			expect(accounts.every(a => a.status === AccountStatus.ACTIVE)).toBe(true);
		});

		it('should find accounts by BLACKLISTED status', () => {
			seedDatabaseWith(db, {
				accounts: [sampleAccount1, sampleAccountBlacklisted],
			});

			const accounts = repository.findByStatus(AccountStatus.BLACKLISTED);

			expect(accounts).toHaveLength(1);
			expect(accounts[0].status).toBe(AccountStatus.BLACKLISTED);
		});

		it('should return empty array when no accounts match status', () => {
			insertAccount(db, sampleAccount1); // ACTIVE

			const accounts = repository.findByStatus(AccountStatus.EXPIRED);

			expect(accounts).toEqual([]);
		});
	});

	describe('updateStatus', () => {
		it('should update account status without blacklist time', () => {
			insertAccount(db, sampleAccount1);

			repository.updateStatus(sampleAccount1.id as any, AccountStatus.DISABLED);

			const account = repository.findById(sampleAccount1.id as any);
			expect(account?.status).toBe(AccountStatus.DISABLED);
			expect(account?.blacklistedUntil).toBeUndefined();
		});

		it('should update account status with blacklist time', () => {
			insertAccount(db, sampleAccount1);
			const blacklistTime = Date.now() + 86400000;

			repository.updateStatus(
				sampleAccount1.id as any,
				AccountStatus.BLACKLISTED,
				blacklistTime
			);

			const account = repository.findById(sampleAccount1.id as any);
			expect(account?.status).toBe(AccountStatus.BLACKLISTED);
			expect(account?.blacklistedUntil).toBe(blacklistTime);
		});

		it('should clear blacklist time when status changes to ACTIVE', () => {
			insertAccount(db, sampleAccountBlacklisted);

			repository.updateStatus(sampleAccountBlacklisted.id as any, AccountStatus.ACTIVE);

			const account = repository.findById(sampleAccountBlacklisted.id as any);
			expect(account?.status).toBe(AccountStatus.ACTIVE);
			expect(account?.blacklistedUntil).toBeUndefined();
		});

		it('should update the updatedAt timestamp', () => {
			insertAccount(db, sampleAccount1);
			const beforeUpdate = Date.now();

			repository.updateStatus(sampleAccount1.id as any, AccountStatus.EXPIRED);

			const account = repository.findById(sampleAccount1.id as any);
			expect(account?.updatedAt).toBeGreaterThanOrEqual(beforeUpdate);
		});
	});

	describe('blacklist', () => {
		it('should blacklist account with default 24-hour duration', () => {
			insertAccount(db, sampleAccount1);
			const beforeBlacklist = Date.now();

			repository.blacklist(sampleAccount1.id as any);

			const account = repository.findById(sampleAccount1.id as any);
			expect(account?.status).toBe(AccountStatus.BLACKLISTED);
			expect(account?.blacklistedUntil).toBeGreaterThan(beforeBlacklist);
			expect(account?.blacklistedUntil).toBeLessThanOrEqual(
				beforeBlacklist + 24 * 60 * 60 * 1000 + 1000
			);
		});

		it('should blacklist account with custom duration', () => {
			insertAccount(db, sampleAccount1);
			const customDuration = 2 * 60 * 60 * 1000; // 2 hours
			const beforeBlacklist = Date.now();

			repository.blacklist(sampleAccount1.id as any, customDuration);

			const account = repository.findById(sampleAccount1.id as any);
			expect(account?.blacklistedUntil).toBeGreaterThan(beforeBlacklist);
			expect(account?.blacklistedUntil).toBeLessThanOrEqual(
				beforeBlacklist + customDuration + 1000
			);
		});
	});

	describe('checkAndClearBlacklist', () => {
		it('should clear blacklist if expiry time has passed', () => {
			insertAccount(db, sampleAccountExpiredBlacklist);

			const cleared = repository.checkAndClearBlacklist(
				sampleAccountExpiredBlacklist.id as any
			);

			expect(cleared).toBe(true);
			const account = repository.findById(sampleAccountExpiredBlacklist.id as any);
			expect(account?.status).toBe(AccountStatus.ACTIVE);
		});

		it('should not clear blacklist if expiry time has not passed', () => {
			insertAccount(db, sampleAccountBlacklisted);

			const cleared = repository.checkAndClearBlacklist(
				sampleAccountBlacklisted.id as any
			);

			expect(cleared).toBe(false);
			const account = repository.findById(sampleAccountBlacklisted.id as any);
			expect(account?.status).toBe(AccountStatus.BLACKLISTED);
		});

		it('should return false for non-blacklisted account', () => {
			insertAccount(db, sampleAccount1);

			const cleared = repository.checkAndClearBlacklist(sampleAccount1.id as any);

			expect(cleared).toBe(false);
		});

		it('should return false for non-existent account', () => {
			const cleared = repository.checkAndClearBlacklist(99999);

			expect(cleared).toBe(false);
		});
	});

	describe('updateCookie', () => {
		it('should update account cookie', () => {
			insertAccount(db, sampleAccount1);
			const newCookie = 'new-cookie-value';

			repository.updateCookie(sampleAccount1.id as any, newCookie);

			const account = repository.findById(sampleAccount1.id as any);
			expect(account?.cookie).toBe(newCookie);
		});

		it('should update the updatedAt timestamp', () => {
			insertAccount(db, sampleAccount1);
			const beforeUpdate = Date.now();

			repository.updateCookie(sampleAccount1.id as any, 'new-cookie');

			const account = repository.findById(sampleAccount1.id as any);
			expect(account?.updatedAt).toBeGreaterThanOrEqual(beforeUpdate);
		});
	});

	describe('updateName', () => {
		it('should update account name', () => {
			insertAccount(db, sampleAccount1);
			const newName = 'updated_user_name';

			repository.updateName(sampleAccount1.id as any, newName);

			const account = repository.findById(sampleAccount1.id as any);
			expect(account?.name).toBe(newName);
		});

		it('should update the updatedAt timestamp', () => {
			insertAccount(db, sampleAccount1);
			const beforeUpdate = Date.now();

			repository.updateName(sampleAccount1.id as any, 'new_name');

			const account = repository.findById(sampleAccount1.id as any);
			expect(account?.updatedAt).toBeGreaterThanOrEqual(beforeUpdate);
		});
	});

	describe('delete', () => {
		it('should delete an existing account', () => {
			insertAccount(db, sampleAccount1);
			expect(countRows(db, 'accounts')).toBe(1);

			repository.delete(sampleAccount1.id as any);

			expect(countRows(db, 'accounts')).toBe(0);
		});

		it('should not throw error when deleting non-existent account', () => {
			expect(() => repository.delete(99999)).not.toThrow();
		});

		it('should only delete the specified account', () => {
			insertAccount(db, sampleAccount1);
			insertAccount(db, sampleAccount2);

			repository.delete(sampleAccount1.id as any);

			expect(countRows(db, 'accounts')).toBe(1);
			const remaining = repository.findById(sampleAccount2.id as any);
			expect(remaining).toBeDefined();
		});
	});

	describe('count', () => {
		it('should return 0 when no accounts exist', () => {
			const count = repository.count();

			expect(count).toBe(0);
		});

		it('should return correct count of accounts', () => {
			insertAccount(db, sampleAccount1);
			insertAccount(db, sampleAccount2);
			insertAccount(db, sampleAccountDisabled);

			const count = repository.count();

			expect(count).toBe(3);
		});

		it('should update count after adding/deleting accounts', () => {
			insertAccount(db, sampleAccount1);
			expect(repository.count()).toBe(1);

			insertAccount(db, sampleAccount2);
			expect(repository.count()).toBe(2);

			repository.delete(sampleAccount1.id as any);
			expect(repository.count()).toBe(1);
		});
	});

	describe('countByStatus', () => {
		it('should return 0 when no accounts match status', () => {
			insertAccount(db, sampleAccount1); // ACTIVE

			const count = repository.countByStatus(AccountStatus.DISABLED);

			expect(count).toBe(0);
		});

		it('should return correct count for each status', () => {
			seedDatabaseWith(db, {
				accounts: [
					sampleAccount1, // ACTIVE
					sampleAccount2, // ACTIVE
					sampleAccountBlacklisted, // BLACKLISTED
					sampleAccountDisabled, // DISABLED
					sampleAccountExpired, // EXPIRED
				],
			});

			expect(repository.countByStatus(AccountStatus.ACTIVE)).toBe(2);
			expect(repository.countByStatus(AccountStatus.BLACKLISTED)).toBe(1);
			expect(repository.countByStatus(AccountStatus.DISABLED)).toBe(1);
			expect(repository.countByStatus(AccountStatus.EXPIRED)).toBe(1);
		});

		it('should update count when status changes', () => {
			insertAccount(db, sampleAccount1);
			expect(repository.countByStatus(AccountStatus.ACTIVE)).toBe(1);

			repository.updateStatus(sampleAccount1.id as any, AccountStatus.DISABLED);
			expect(repository.countByStatus(AccountStatus.ACTIVE)).toBe(0);
			expect(repository.countByStatus(AccountStatus.DISABLED)).toBe(1);
		});
	});
});
