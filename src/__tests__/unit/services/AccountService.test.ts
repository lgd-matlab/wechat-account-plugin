/**
 * Unit tests for AccountService
 * Tests account lifecycle, authentication, and rotation
 */

import { AccountService } from '../../../services/AccountService';
import { AccountStatus } from '../../../types';
import { ApiErrorCode } from '../../../services/api/types';
import { BLACKLIST_DURATION } from '../../../utils/constants';
import {
	sampleAccount1,
	sampleAccount2,
	sampleAccountBlacklisted,
	sampleAccountExpiredBlacklist,
	sampleAccountDisabled,
	sampleAccountExpired,
} from '../../fixtures/sample-accounts';
import {
	mockCreateLoginUrlResponse,
	mockLoginSuccessResponse,
	mockLoginPendingResponse,
	mockError401Unauthorized,
	mockError429TooManyRequests,
	mockError400BadRequest,
} from '../../mocks/api-responses';

describe('AccountService', () => {
	let accountService: AccountService;
	let mockPlugin: any;
	let mockDatabaseService: any;
	let mockApiClient: any;

	beforeEach(() => {
		// Mock database service
		mockDatabaseService = {
			accounts: {
				create: jest.fn(),
				findAll: jest.fn(),
				findById: jest.fn(),
				findActive: jest.fn(),
				findByStatus: jest.fn(),
				updateStatus: jest.fn(),
				updateCookie: jest.fn(),
				updateName: jest.fn(),
				blacklist: jest.fn(),
				checkAndClearBlacklist: jest.fn(),
				delete: jest.fn(),
				count: jest.fn(),
				countByStatus: jest.fn(),
			},
		};

		// Mock API client
		mockApiClient = {
			createLoginUrl: jest.fn(),
			getLoginResult: jest.fn(),
			setPlatformUrl: jest.fn(),
		};

		// Mock plugin
		mockPlugin = {
			settings: {
				platformUrl: 'https://weread.111965.xyz',
			},
			databaseService: mockDatabaseService,
		};

		// Create service
		accountService = new AccountService(mockPlugin);
		(accountService as any).apiClient = mockApiClient;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('createAccount', () => {
		it('should create login URL and return QR code data', async () => {
			mockApiClient.createLoginUrl.mockResolvedValue(mockCreateLoginUrlResponse);

			const result = await accountService.createAccount();

			expect(result).toEqual({
				uuid: mockCreateLoginUrlResponse.uuid,
				scanUrl: mockCreateLoginUrlResponse.scanUrl,
			});
			expect(mockApiClient.createLoginUrl).toHaveBeenCalledTimes(1);
		});

		it('should throw error if login URL creation fails', async () => {
			mockApiClient.createLoginUrl.mockRejectedValue(new Error('API error'));

			await expect(accountService.createAccount()).rejects.toThrow('API error');
		});
	});

	describe('checkLoginStatus', () => {
		it('should return null when login is pending', async () => {
			mockApiClient.getLoginResult.mockResolvedValue(mockLoginPendingResponse);

			const result = await accountService.checkLoginStatus('test-uuid');

			expect(result).toBeNull();
			expect(mockDatabaseService.accounts.create).not.toHaveBeenCalled();
		});

		it('should create account when login succeeds', async () => {
			mockApiClient.getLoginResult.mockResolvedValue(mockLoginSuccessResponse);
			mockDatabaseService.accounts.create.mockResolvedValue(sampleAccount1);

			const result = await accountService.checkLoginStatus('test-uuid');

			expect(result).toEqual(sampleAccount1);
			expect(mockDatabaseService.accounts.create).toHaveBeenCalledWith(
				mockLoginSuccessResponse.username,
				mockLoginSuccessResponse.token
			);
		});

		it('should throw error if login check fails', async () => {
			mockApiClient.getLoginResult.mockRejectedValue(new Error('Network error'));

			await expect(accountService.checkLoginStatus('test-uuid')).rejects.toThrow(
				'Network error'
			);
		});
	});

	describe('getAvailableAccount', () => {
		it('should return null when no active accounts exist', async () => {
			mockDatabaseService.accounts.findActive.mockReturnValue([]);

			const result = await accountService.getAvailableAccount();

			expect(result).toBeNull();
		});

		it('should return first active account', async () => {
			mockDatabaseService.accounts.findActive.mockReturnValue([
				sampleAccount1,
				sampleAccount2,
			]);
			mockDatabaseService.accounts.findByStatus.mockReturnValue([
				sampleAccount1,
				sampleAccount2,
			]);

			const result = await accountService.getAvailableAccount();

			expect(result).toEqual(sampleAccount1);
		});

		it('should check and clear expired blacklists', async () => {
			mockDatabaseService.accounts.findActive.mockReturnValue([
				sampleAccountExpiredBlacklist,
			]);
			mockDatabaseService.accounts.checkAndClearBlacklist.mockReturnValue(true);
			mockDatabaseService.accounts.findByStatus.mockReturnValue([
				sampleAccountExpiredBlacklist,
			]);

			const result = await accountService.getAvailableAccount();

			expect(mockDatabaseService.accounts.checkAndClearBlacklist).toHaveBeenCalledWith(
				sampleAccountExpiredBlacklist.id
			);
			expect(result).toBeDefined();
		});

		it('should return null when all accounts are blacklisted', async () => {
			mockDatabaseService.accounts.findActive.mockReturnValue([
				sampleAccountBlacklisted,
			]);
			mockDatabaseService.accounts.checkAndClearBlacklist.mockReturnValue(false);
			mockDatabaseService.accounts.findByStatus.mockReturnValue([]);

			const result = await accountService.getAvailableAccount();

			expect(result).toBeNull();
		});
	});

	describe('handleApiError', () => {
		it('should mark account as EXPIRED on 401 error', async () => {
			await accountService.handleApiError(sampleAccount1.id!, mockError401Unauthorized);

			expect(mockDatabaseService.accounts.updateStatus).toHaveBeenCalledWith(
				sampleAccount1.id,
				AccountStatus.EXPIRED
			);
		});

		it('should blacklist account on 429 error', async () => {
			await accountService.handleApiError(sampleAccount1.id!, mockError429TooManyRequests);

			expect(mockDatabaseService.accounts.blacklist).toHaveBeenCalledWith(
				sampleAccount1.id,
				BLACKLIST_DURATION
			);
		});

		it('should not update status on 400 error', async () => {
			await accountService.handleApiError(sampleAccount1.id!, mockError400BadRequest);

			expect(mockDatabaseService.accounts.updateStatus).not.toHaveBeenCalled();
			expect(mockDatabaseService.accounts.blacklist).not.toHaveBeenCalled();
		});

		it('should skip status update for non-API errors', async () => {
			const genericError = new Error('Generic error');

			await accountService.handleApiError(sampleAccount1.id!, genericError);

			expect(mockDatabaseService.accounts.updateStatus).not.toHaveBeenCalled();
		});
	});

	describe('updateAccountToken', () => {
		it('should update account cookie', async () => {
			await accountService.updateAccountToken(sampleAccount1.id!, 'new-token');

			expect(mockDatabaseService.accounts.updateCookie).toHaveBeenCalledWith(
				sampleAccount1.id,
				'new-token'
			);
		});
	});

	describe('updateAccountName', () => {
		it('should update account name', async () => {
			await accountService.updateAccountName(sampleAccount1.id!, 'new_name');

			expect(mockDatabaseService.accounts.updateName).toHaveBeenCalledWith(
				sampleAccount1.id,
				'new_name'
			);
		});
	});

	describe('setAccountStatus', () => {
		it('should update account status', async () => {
			await accountService.setAccountStatus(sampleAccount1.id!, AccountStatus.DISABLED);

			expect(mockDatabaseService.accounts.updateStatus).toHaveBeenCalledWith(
				sampleAccount1.id,
				AccountStatus.DISABLED
			);
		});
	});

	describe('deleteAccount', () => {
		it('should delete account', async () => {
			await accountService.deleteAccount(sampleAccount1.id!);

			expect(mockDatabaseService.accounts.delete).toHaveBeenCalledWith(
				sampleAccount1.id
			);
		});
	});

	describe('getAllAccounts', () => {
		it('should return all accounts', () => {
			const accounts = [sampleAccount1, sampleAccount2];
			mockDatabaseService.accounts.findAll.mockReturnValue(accounts);

			const result = accountService.getAllAccounts();

			expect(result).toEqual(accounts);
		});
	});

	describe('getAccount', () => {
		it('should return account by ID', () => {
			mockDatabaseService.accounts.findById.mockReturnValue(sampleAccount1);

			const result = accountService.getAccount(sampleAccount1.id!);

			expect(result).toEqual(sampleAccount1);
		});

		it('should return null for non-existent account', () => {
			mockDatabaseService.accounts.findById.mockReturnValue(null);

			const result = accountService.getAccount(99999);

			expect(result).toBeNull();
		});
	});

	describe('getAccountStats', () => {
		it('should return account statistics', () => {
			mockDatabaseService.accounts.count.mockReturnValue(7);
			mockDatabaseService.accounts.countByStatus
				.mockReturnValueOnce(2) // ACTIVE
				.mockReturnValueOnce(1) // DISABLED
				.mockReturnValueOnce(1) // EXPIRED
				.mockReturnValueOnce(3); // BLACKLISTED

			const stats = accountService.getAccountStats();

			expect(stats).toEqual({
				total: 7,
				active: 2,
				disabled: 1,
				expired: 1,
				blacklisted: 3,
			});
		});
	});

	describe('setPlatformUrl', () => {
		it('should update platform URL in API client', () => {
			accountService.setPlatformUrl('https://new-platform.com');

			expect(mockApiClient.setPlatformUrl).toHaveBeenCalledWith(
				'https://new-platform.com'
			);
		});
	});
});
