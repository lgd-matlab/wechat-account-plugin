import { Modal, App, Notice } from 'obsidian';
import QRCode from 'qrcode';
import WeWeRssPlugin from '../../main';
import { Logger } from '../../utils/logger';

export class AddAccountModal extends Modal {
	private plugin: WeWeRssPlugin;
	private logger: Logger;
	private uuid: string | null = null;
	private pollInterval: number | null = null;
	private qrContainer: HTMLElement;
	private statusEl: HTMLElement;
	private consecutiveErrors: number = 0;

	constructor(app: App, plugin: WeWeRssPlugin) {
		super(app);
		this.plugin = plugin;
		this.logger = new Logger('AddAccountModal');
	}

	async onOpen() {
		const { contentEl } = this;

		contentEl.empty();
		contentEl.addClass('wewe-rss-add-account-modal');

		// Title
		contentEl.createEl('h2', { text: 'Add WeChat Account' });

		// Instructions
		const instructions = contentEl.createEl('div', { cls: 'wewe-rss-modal-instructions' });
		instructions.createEl('p', { text: 'Scan the QR code with WeChat to authorize access to your reading list.' });
		instructions.createEl('p', {
			text: 'Steps:',
			cls: 'wewe-rss-instructions-title'
		});

		const stepsList = instructions.createEl('ol', { cls: 'wewe-rss-steps-list' });
		stepsList.createEl('li', { text: 'Open WeChat on your phone' });
		stepsList.createEl('li', { text: 'Tap "Discover" → "Scan QR Code"' });
		stepsList.createEl('li', { text: 'Scan the code below' });
		stepsList.createEl('li', { text: 'Authorize the login on your phone' });

		// QR Code container
		this.qrContainer = contentEl.createEl('div', { cls: 'wewe-rss-qr-container' });
		this.qrContainer.createEl('div', {
			text: 'Generating QR code...',
			cls: 'wewe-rss-loading'
		});

		// Status message
		this.statusEl = contentEl.createEl('div', { cls: 'wewe-rss-status-message' });
		this.statusEl.createEl('p', {
			text: 'Waiting for scan...',
			cls: 'wewe-rss-status-text'
		});

		// Buttons
		const buttonContainer = contentEl.createEl('div', { cls: 'wewe-rss-modal-buttons' });

		const cancelBtn = buttonContainer.createEl('button', {
			text: 'Cancel',
			cls: 'wewe-rss-btn'
		});
		cancelBtn.addEventListener('click', () => {
			this.close();
		});

		const refreshBtn = buttonContainer.createEl('button', {
			text: 'Refresh QR Code',
			cls: 'wewe-rss-btn'
		});
		refreshBtn.addEventListener('click', async () => {
			await this.generateQRCode();
		});

		// Generate QR code
		await this.generateQRCode();
	}

	private async generateQRCode() {
		try {
			this.qrContainer.empty();
			this.qrContainer.createEl('div', {
				text: 'Checking server status...',
				cls: 'wewe-rss-loading'
			});

			// Health check before generating QR code
			const isHealthy = await this.plugin.accountService.checkServerHealth();
			if (!isHealthy) {
				throw new Error('WeChat Reading platform is currently unavailable. The server may be down or experiencing issues. Please try again later.');
			}

			this.qrContainer.empty();
			this.qrContainer.createEl('div', {
				text: 'Generating QR code...',
				cls: 'wewe-rss-loading'
			});

			// Create login URL
			const { uuid, scanUrl } = await this.plugin.accountService.createAccount();
			this.uuid = uuid;

			this.logger.info('QR code generated:', { uuid, scanUrl });

			// Generate QR code
			const qrCanvas = this.qrContainer.createEl('canvas', { cls: 'wewe-rss-qr-code' });
			await QRCode.toCanvas(qrCanvas, scanUrl, {
				width: 256,
				margin: 2,
				color: {
					dark: '#000000',
					light: '#FFFFFF'
				}
			});

			// Update status
			this.updateStatus('Please scan the QR code with WeChat', 'pending');

			// Reset error counter for new QR code
			this.consecutiveErrors = 0;

			// Start polling for login result
			this.startPolling();

		} catch (error) {
			this.logger.error('Failed to generate QR code:', error);
			this.showError(error.message || 'Failed to generate QR code. Please try again.');
		}
	}

	private startPolling() {
		// Clear existing interval
		if (this.pollInterval) {
			window.clearInterval(this.pollInterval);
		}

		// Poll every 2 seconds for login result
		this.pollInterval = window.setInterval(async () => {
			await this.checkLoginStatus();
		}, 2000);

		// Timeout after 5 minutes
		window.setTimeout(() => {
			if (this.pollInterval) {
				window.clearInterval(this.pollInterval);
				this.pollInterval = null;
				this.updateStatus('QR code expired. Please refresh to generate a new one.', 'error');
			}
		}, 5 * 60 * 1000);
	}

	private async checkLoginStatus() {
		if (!this.uuid) {
			return;
		}

		try {
			const account = await this.plugin.accountService.checkLoginStatus(this.uuid);

			if (account) {
				// Login successful
				this.logger.info('Account added successfully:', account);

				// Stop polling
				if (this.pollInterval) {
					window.clearInterval(this.pollInterval);
					this.pollInterval = null;
				}

				// Reset error counter
				this.consecutiveErrors = 0;

				// Update status
				this.updateStatus('Account added successfully!', 'success');

				// Show success message
				new Notice(`WeChat account "${account.name}" added successfully!`);

				// Close modal after 1 second
				window.setTimeout(() => {
					this.close();
				}, 1000);
			} else {
				// Login still pending, reset error counter on successful check
				this.consecutiveErrors = 0;
			}

		} catch (error) {
			this.logger.error('Failed to check login status:', error);

			// Track consecutive errors
			this.consecutiveErrors++;

			if (this.consecutiveErrors >= 3) {
				// Stop polling after 3 consecutive errors
				if (this.pollInterval) {
					window.clearInterval(this.pollInterval);
					this.pollInterval = null;
				}

				const errorMsg = error.message || 'Failed to connect to server after multiple attempts';
				this.showError(errorMsg);
			} else {
				// Show transient error but keep polling
				this.updateStatus(
					`Connection issue (${this.consecutiveErrors}/3). Retrying...`,
					'pending'
				);
			}
		}
	}

	private updateStatus(message: string, type: 'pending' | 'success' | 'error') {
		this.statusEl.empty();

		const statusText = this.statusEl.createEl('p', { cls: 'wewe-rss-status-text' });

		if (type === 'pending') {
			statusText.innerHTML = `<span class="wewe-rss-status-icon">⏳</span> ${message}`;
		} else if (type === 'success') {
			statusText.innerHTML = `<span class="wewe-rss-status-icon" style="color: var(--color-green)">✓</span> ${message}`;
		} else if (type === 'error') {
			statusText.innerHTML = `<span class="wewe-rss-status-icon" style="color: var(--color-red)">✗</span> ${message}`;
		}
	}

	private showError(message: string) {
		this.qrContainer.empty();

		const errorContainer = this.qrContainer.createEl('div', {
			cls: 'wewe-rss-error-container'
		});

		errorContainer.createEl('p', {
			text: message,
			cls: 'wewe-rss-error-message'
		});

		// Add helpful actions
		const actionsDiv = errorContainer.createEl('div', {
			cls: 'wewe-rss-error-actions'
		});

		const tryAgainBtn = actionsDiv.createEl('button', {
			text: 'Try Again',
			cls: 'wewe-rss-btn'
		});
		tryAgainBtn.addEventListener('click', async () => {
			await this.generateQRCode();
		});

		const checkStatusBtn = actionsDiv.createEl('button', {
			text: 'Check Server Status',
			cls: 'wewe-rss-btn-secondary'
		});
		checkStatusBtn.addEventListener('click', () => {
			window.open(`${this.plugin.settings.platformUrl}`, '_blank');
		});

		this.updateStatus(message, 'error');
	}

	onClose() {
		// Clear polling interval
		if (this.pollInterval) {
			window.clearInterval(this.pollInterval);
			this.pollInterval = null;
		}

		const { contentEl } = this;
		contentEl.empty();
	}
}
