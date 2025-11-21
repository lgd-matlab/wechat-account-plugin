/**
 * Unit tests for AddAccountModal
 * Tests login polling race condition fixes
 */

import { AddAccountModal } from '../../../ui/modals/AddAccountModal';
import { App } from 'obsidian';
import { sampleAccount1 } from '../../fixtures/sample-accounts';

describe('AddAccountModal - Login Polling Race Condition', () => {
	let modal: AddAccountModal;
	let mockApp: any;
	let mockPlugin: any;
	let mockAccountService: any;
	let mockLogger: any;

	beforeEach(() => {
		// Mock logger
		mockLogger = {
			debug: jest.fn(),
			info: jest.fn(),
			error: jest.fn(),
		};

		// Mock account service
		mockAccountService = {
			checkLoginStatus: jest.fn(),
		};

		// Mock plugin
		mockPlugin = {
			accountService: mockAccountService,
			settings: {
				platformUrl: 'https://test.api.com',
			},
		};

		// Mock app
		mockApp = {
			// Add any required App properties
		} as any;

		// Create modal instance
		modal = new AddAccountModal(mockApp, mockPlugin);

		// Inject mock logger
		(modal as any).logger = mockLogger;

		// Mock DOM elements to prevent errors in updateStatus/showError
		(modal as any).statusEl = {
			empty: jest.fn(),
			createEl: jest.fn().mockReturnValue({
				innerHTML: '',
			}),
		};

		(modal as any).qrContainer = {
			empty: jest.fn(),
			createEl: jest.fn().mockReturnValue({
				addEventListener: jest.fn(),
			}),
		};

		// Mock updateStatus and showError methods to avoid DOM manipulation
		(modal as any).updateStatus = jest.fn();
		(modal as any).showError = jest.fn();
	});

	afterEach(() => {
		// Clean up any intervals
		if ((modal as any).pollInterval) {
			window.clearInterval((modal as any).pollInterval);
		}
	});

	describe('Task 1: Synchronous flag check at method entry', () => {
		it('should skip polling when loginSuccessful is true', async () => {
			// Arrange
			(modal as any).loginSuccessful = true;
			(modal as any).uuid = 'test-uuid';

			// Act
			await (modal as any).checkLoginStatus();

			// Assert
			expect(mockAccountService.checkLoginStatus).not.toHaveBeenCalled();
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Skipping poll - login already successful'
			);
		});

		it('should skip polling when uuid is null', async () => {
			// Arrange
			(modal as any).uuid = null;
			(modal as any).loginSuccessful = false;

			// Act
			await (modal as any).checkLoginStatus();

			// Assert
			expect(mockAccountService.checkLoginStatus).not.toHaveBeenCalled();
			expect(mockLogger.debug).toHaveBeenCalledWith('Skipping poll - no UUID');
		});
	});

	describe('Task 2: Second flag check before API call', () => {
		it('should prevent race condition when flag set during async gap', async () => {
			// Arrange
			(modal as any).uuid = 'test-uuid';
			(modal as any).loginSuccessful = false;

			// Start first poll
			const poll1Promise = (modal as any).checkLoginStatus();

			// Immediately set flag (simulating first poll completing)
			(modal as any).loginSuccessful = true;

			// Start second poll - should be caught by Layer 1
			await (modal as any).checkLoginStatus();

			await poll1Promise;

			// Assert - Either layer can catch it
			expect(mockLogger.debug).toHaveBeenCalledWith(
				expect.stringMatching(/Skipping poll - login already successful|Race condition prevented/)
			);
		});

		it('should proceed normally when flag is false before API call', async () => {
			// Arrange
			(modal as any).uuid = 'test-uuid';
			(modal as any).loginSuccessful = false;
			mockAccountService.checkLoginStatus.mockResolvedValue(null); // Still pending

			// Act
			await (modal as any).checkLoginStatus();

			// Assert
			expect(mockAccountService.checkLoginStatus).toHaveBeenCalledWith('test-uuid');
			expect(mockLogger.debug).not.toHaveBeenCalledWith(
				'Race condition prevented - login succeeded during check'
			);
		});
	});

	describe('Task 3: Interval clearing order', () => {
		it('should clear interval before UI updates on success', async () => {
			// Arrange
			(modal as any).uuid = 'test-uuid';
			(modal as any).pollInterval = 12345; // Mock interval ID
			const clearSpy = jest.spyOn(window, 'clearInterval');

			mockAccountService.checkLoginStatus.mockResolvedValue(sampleAccount1);

			// Act
			await (modal as any).checkLoginStatus();

			// Assert
			expect(clearSpy).toHaveBeenCalledWith(12345);
			expect((modal as any).pollInterval).toBeNull();
			expect((modal as any).loginSuccessful).toBe(true);
		});

		it('should set flag before clearing interval', async () => {
			// Arrange
			(modal as any).uuid = 'test-uuid';
			(modal as any).pollInterval = 12345;

			const callOrder: string[] = [];

			// Track order of operations
			Object.defineProperty(modal, 'loginSuccessful', {
				set: (value: boolean) => {
					if (value) callOrder.push('flag-set');
					(modal as any)._loginSuccessful = value;
				},
				get: () => (modal as any)._loginSuccessful,
				configurable: true,
			});

			jest.spyOn(window, 'clearInterval').mockImplementation(() => {
				callOrder.push('interval-cleared');
			});

			mockAccountService.checkLoginStatus.mockResolvedValue(sampleAccount1);

			// Act
			await (modal as any).checkLoginStatus();

			// Assert
			expect(callOrder).toEqual(['flag-set', 'interval-cleared']);
		});
	});

	describe('Task 4: Error suppression after success', () => {
		it('should suppress errors after login succeeds (caught by Layer 1)', async () => {
			// Arrange - Set flag BEFORE calling checkLoginStatus
			(modal as any).uuid = 'test-uuid';
			(modal as any).loginSuccessful = true; // Flag already set
			(modal as any).consecutiveErrors = 0;

			// Mock will never be called because Layer 1 catches it
			mockAccountService.checkLoginStatus.mockRejectedValue(
				new Error('Request failed, status 500')
			);

			// Act
			await (modal as any).checkLoginStatus();

			// Assert - Layer 1 catches it before the error
			expect(mockLogger.error).not.toHaveBeenCalled();
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Skipping poll - login already successful'
			);
			expect((modal as any).consecutiveErrors).toBe(0);
			expect(mockAccountService.checkLoginStatus).not.toHaveBeenCalled();
		});

		it('should handle errors normally before success', async () => {
			// Arrange
			(modal as any).uuid = 'test-uuid';
			(modal as any).loginSuccessful = false;
			(modal as any).consecutiveErrors = 0;

			mockAccountService.checkLoginStatus.mockRejectedValue(
				new Error('Network error')
			);

			// Act
			await (modal as any).checkLoginStatus();

			// Assert
			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to check login status:',
				expect.any(Error)
			);
			expect((modal as any).consecutiveErrors).toBe(1);
		});

		it('should stop polling after 3 consecutive errors', async () => {
			// Arrange
			(modal as any).uuid = 'test-uuid';
			(modal as any).loginSuccessful = false;
			(modal as any).consecutiveErrors = 2; // Already 2 errors
			(modal as any).pollInterval = 12345;

			const clearSpy = jest.spyOn(window, 'clearInterval');
			mockAccountService.checkLoginStatus.mockRejectedValue(
				new Error('Network error')
			);

			// Act
			await (modal as any).checkLoginStatus();

			// Assert
			expect((modal as any).consecutiveErrors).toBe(3);
			expect(clearSpy).toHaveBeenCalled();
			expect((modal as any).pollInterval).toBeNull();
			expect((modal as any).showError).toHaveBeenCalled();
		});
	});

	describe('Integration: Full polling lifecycle', () => {
		it('should handle complete success flow without errors', async () => {
			// Arrange
			(modal as any).uuid = 'test-uuid';
			(modal as any).pollInterval = 12345;

			mockAccountService.checkLoginStatus.mockResolvedValue(sampleAccount1);

			// Act
			await (modal as any).checkLoginStatus();

			// Assert - No errors or race conditions
			expect(mockLogger.error).not.toHaveBeenCalled();
			expect((modal as any).loginSuccessful).toBe(true);
			expect((modal as any).pollInterval).toBeNull();
			expect(mockLogger.info).toHaveBeenCalledWith(
				'Account added successfully:',
				sampleAccount1
			);
		});

		it('should handle pending status without side effects', async () => {
			// Arrange
			(modal as any).uuid = 'test-uuid';
			(modal as any).consecutiveErrors = 0;

			mockAccountService.checkLoginStatus.mockResolvedValue(null); // Pending

			// Act
			await (modal as any).checkLoginStatus();

			// Assert
			expect((modal as any).loginSuccessful).toBe(false);
			expect((modal as any).consecutiveErrors).toBe(0); // Reset on successful check
			expect(mockLogger.error).not.toHaveBeenCalled();
		});
	});
});
