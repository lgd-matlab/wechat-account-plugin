/**
 * Sample account fixtures for testing
 * Provides realistic account data for authentication and rotation testing
 */

import { AccountStatus } from '../../types';

export interface AccountFixture {
	id?: number; // Optional for autoincrement
	name: string;
	cookie: string;
	status: AccountStatus;
	blacklisted_until: number | null;
	created_at: number;
	updated_at: number;
}

export const sampleAccount1: AccountFixture = {
	id: 1,
	name: 'test_user_1',
	cookie: JSON.stringify({
		vid: 12345678,
		token: 'test-token-abc123',
	}),
	status: AccountStatus.ACTIVE,
	blacklisted_until: null,
	created_at: 1704000000000,
	updated_at: 1704067200000,
};

export const sampleAccount2: AccountFixture = {
	id: 2,
	name: 'test_user_2',
	cookie: JSON.stringify({
		vid: 87654321,
		token: 'test-token-xyz789',
	}),
	status: AccountStatus.ACTIVE,
	blacklisted_until: null,
	created_at: 1704000000000,
	updated_at: 1704067200000,
};

export const sampleAccountBlacklisted: AccountFixture = {
	id: 3,
	name: 'blacklisted_user',
	cookie: JSON.stringify({
		vid: 11111111,
		token: 'test-token-blacklisted',
	}),
	status: AccountStatus.BLACKLISTED,
	blacklisted_until: Date.now() + 24 * 3600 * 1000, // 24 hours from now
	created_at: 1704000000000,
	updated_at: Date.now(),
};

export const sampleAccountExpiredBlacklist: AccountFixture = {
	id: 4,
	name: 'expired_blacklist_user',
	cookie: JSON.stringify({
		vid: 22222222,
		token: 'test-token-expired-blacklist',
	}),
	status: AccountStatus.BLACKLISTED,
	blacklisted_until: Date.now() - 3600 * 1000, // 1 hour ago (expired)
	created_at: 1704000000000,
	updated_at: Date.now() - 3600 * 1000,
};

export const sampleAccountDisabled: AccountFixture = {
	id: 5,
	name: 'disabled_user',
	cookie: JSON.stringify({
		vid: 33333333,
		token: 'test-token-disabled',
	}),
	status: AccountStatus.DISABLED,
	blacklisted_until: null,
	created_at: 1704000000000,
	updated_at: 1704067200000,
};

export const sampleAccountExpired: AccountFixture = {
	id: 6,
	name: 'expired_user',
	cookie: JSON.stringify({
		vid: 44444444,
		token: 'test-token-expired',
	}),
	status: AccountStatus.EXPIRED,
	blacklisted_until: null,
	created_at: 1704000000000,
	updated_at: 1704067200000,
};

export const sampleAccountNewlyCreated: AccountFixture = {
	id: 7,
	name: 'new_user',
	cookie: JSON.stringify({
		vid: 55555555,
		token: 'test-token-new',
	}),
	status: AccountStatus.ACTIVE,
	blacklisted_until: null,
	created_at: Date.now(),
	updated_at: Date.now(),
};

// Collection of all sample accounts
export const allSampleAccounts: AccountFixture[] = [
	sampleAccount1,
	sampleAccount2,
	sampleAccountBlacklisted,
	sampleAccountExpiredBlacklist,
	sampleAccountDisabled,
	sampleAccountExpired,
	sampleAccountNewlyCreated,
];

// Account groups for specific test scenarios
export const activeAccounts = [sampleAccount1, sampleAccount2, sampleAccountNewlyCreated];

export const blacklistedAccounts = [sampleAccountBlacklisted];

export const expiredBlacklistAccounts = [sampleAccountExpiredBlacklist];

export const disabledAccounts = [sampleAccountDisabled];

export const expiredAccounts = [sampleAccountExpired];

export const availableAccounts = [
	sampleAccount1,
	sampleAccount2,
	sampleAccountExpiredBlacklist, // Blacklist expired, should be available
	sampleAccountNewlyCreated,
];

// Helper function to create custom account
export function createSampleAccount(overrides?: Partial<AccountFixture>): AccountFixture {
	const now = Date.now();
	return {
		name: `test_user_${Date.now()}`,
		cookie: JSON.stringify({
			vid: Math.floor(Math.random() * 100000000),
			token: `test-token-${Date.now()}`,
		}),
		status: AccountStatus.ACTIVE,
		blacklisted_until: null,
		created_at: now,
		updated_at: now,
		...overrides,
	};
}

// Parse cookie helper (for testing cookie extraction)
export function parseCookie(cookie: string): { vid: number; token: string } {
	return JSON.parse(cookie);
}
