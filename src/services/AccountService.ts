import WeWeRssPlugin from '../main';
import { Account, AccountStatus } from '../types';
import { WeChatApiClient } from './api/WeChatApiClient';
import { ApiErrorCode } from './api/types';
import { logger } from '../utils/logger';
import { BLACKLIST_DURATION } from '../utils/constants';

/**
 * AccountService - Manages WeChat Reading accounts
 *
 * Handles account lifecycle, authentication, and rotation
 */
export class AccountService {
	private plugin: WeWeRssPlugin;
	private apiClient: WeChatApiClient;

	constructor(plugin: WeWeRssPlugin) {
		this.plugin = plugin;
		this.apiClient = new WeChatApiClient(plugin.settings.platformUrl);
	}

	/**
	 * Create a new account with login flow
	 */
	async createAccount(): Promise<{ uuid: string; scanUrl: string }> {
		try {
			logger.info('Starting account creation...');

			// Create login URL
			const loginData = await this.apiClient.createLoginUrl();

			logger.info('Login QR code generated:', loginData.scanUrl);
			return {
				uuid: loginData.uuid,
				scanUrl: loginData.scanUrl,
			};
		} catch (error) {
			logger.error('Failed to create account:', error);
			throw error;
		}
	}

	/**
	 * Check server health before initiating login flow
	 * Returns true if API is operational, false otherwise
	 */
	async checkServerHealth(): Promise<boolean> {
		try {
			return await this.apiClient.checkHealth();
		} catch (error) {
			logger.error('Server health check failed:', error);
			return false;
		}
	}

	/**
	 * Poll for login completion
	 * Returns account data when login succeeds
	 */
	async checkLoginStatus(uuid: string): Promise<Account | null> {
		try {
			const result = await this.apiClient.getLoginResult(uuid);

			if (result.token && result.vid && result.username) {
				// Login successful - create account in database
				const account = await this.plugin.databaseService.accounts.create(
					result.username,
					result.token
				);

				logger.info('Account created successfully:', account.name);
				return account;
			}

			// Login still pending
			return null;
		} catch (error) {
			logger.error('Failed to check login status:', error);
			throw error;
		}
	}

	/**
	 * Get an available account for API calls
	 * Implements account rotation and blacklist management
	 */
	async getAvailableAccount(): Promise<Account | null> {
		// Get active accounts
		const accounts = this.plugin.databaseService.accounts.findActive();

		if (accounts.length === 0) {
			logger.warn('No active accounts available');
			return null;
		}

		// Check and clear expired blacklists
		for (const account of accounts) {
			if (account.status === AccountStatus.BLACKLISTED) {
				this.plugin.databaseService.accounts.checkAndClearBlacklist(account.id);
			}
		}

		// Refresh list after blacklist check
		const activeAccounts = this.plugin.databaseService.accounts.findByStatus(
			AccountStatus.ACTIVE
		);

		if (activeAccounts.length === 0) {
			logger.warn('No active accounts (all blacklisted or disabled)');
			return null;
		}

		// Return first active account (simple rotation)
		// TODO: Implement round-robin or least-recently-used strategy
		const selectedAccount = activeAccounts[0];
		logger.debug('Selected account:', selectedAccount.id);

		return selectedAccount;
	}

	/**
	 * Handle API error and update account status
	 */
	async handleApiError(accountId: number, error: any): Promise<void> {
		const apiError = error as { code?: string; message?: string };

		if (!apiError.code) {
			logger.debug('Non-API error, skipping account status update');
			return;
		}

		switch (apiError.code) {
			case ApiErrorCode.UNAUTHORIZED:
				// Account authentication expired
				logger.warn(`Account ${accountId} expired, marking as invalid`);
				this.plugin.databaseService.accounts.updateStatus(
					accountId,
					AccountStatus.EXPIRED
				);
				break;

			case ApiErrorCode.TOO_MANY_REQUESTS:
				// Rate limited - blacklist for 24 hours
				logger.warn(`Account ${accountId} rate limited, blacklisting`);
				this.plugin.databaseService.accounts.blacklist(
					accountId,
					BLACKLIST_DURATION
				);
				break;

			case ApiErrorCode.BAD_REQUEST:
				// Invalid parameters - log but don't change status
				logger.error(`Bad request with account ${accountId}:`, apiError.message);
				break;

			default:
				logger.error(`Unhandled API error for account ${accountId}:`, apiError);
		}
	}

	/**
	 * Update account cookie/token
	 */
	async updateAccountToken(accountId: number, token: string): Promise<void> {
		this.plugin.databaseService.accounts.updateCookie(accountId, token);
		logger.info('Account token updated:', accountId);
	}

	/**
	 * Update account name
	 */
	async updateAccountName(accountId: number, name: string): Promise<void> {
		this.plugin.databaseService.accounts.updateName(accountId, name);
		logger.info('Account name updated:', accountId);
	}

	/**
	 * Enable/disable account
	 */
	async setAccountStatus(accountId: number, status: AccountStatus): Promise<void> {
		this.plugin.databaseService.accounts.updateStatus(accountId, status);
		logger.info(`Account ${accountId} status updated to:`, status);
	}

	/**
	 * Delete account
	 */
	async deleteAccount(accountId: number): Promise<void> {
		this.plugin.databaseService.accounts.delete(accountId);
		logger.info('Account deleted:', accountId);
	}

	/**
	 * Get all accounts
	 */
	getAllAccounts(): Account[] {
		return this.plugin.databaseService.accounts.findAll();
	}

	/**
	 * Get account by ID
	 */
	getAccount(accountId: number): Account | null {
		return this.plugin.databaseService.accounts.findById(accountId);
	}

	/**
	 * Get account statistics
	 */
	getAccountStats(): {
		total: number;
		active: number;
		disabled: number;
		expired: number;
		blacklisted: number;
	} {
		return {
			total: this.plugin.databaseService.accounts.count(),
			active: this.plugin.databaseService.accounts.countByStatus(AccountStatus.ACTIVE),
			disabled: this.plugin.databaseService.accounts.countByStatus(AccountStatus.DISABLED),
			expired: this.plugin.databaseService.accounts.countByStatus(AccountStatus.EXPIRED),
			blacklisted: this.plugin.databaseService.accounts.countByStatus(AccountStatus.BLACKLISTED),
		};
	}

	/**
	 * Update platform URL
	 */
	setPlatformUrl(url: string): void {
		this.apiClient.setPlatformUrl(url);
		logger.info('Platform URL updated in AccountService');
	}
}
