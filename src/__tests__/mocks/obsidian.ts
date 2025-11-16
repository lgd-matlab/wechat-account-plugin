/**
 * Mock Obsidian API for testing
 * Provides mock implementations of Obsidian's App, Vault, Notice, Modal, and Plugin classes
 */

export class MockApp {
	vault: MockVault;
	workspace: MockWorkspace;

	constructor() {
		this.vault = new MockVault();
		this.workspace = new MockWorkspace();
	}
}

export class MockVault {
	private files: Map<string, MockFile> = new Map();
	private folders: Set<string> = new Set();

	async create(path: string, data: string): Promise<MockFile> {
		const file = new MockFile(path, data);
		this.files.set(path, file);
		return file;
	}

	async read(file: MockFile): Promise<string> {
		const stored = this.files.get(file.path);
		if (!stored) {
			throw new Error(`File not found: ${file.path}`);
		}
		return stored.content;
	}

	async modify(file: MockFile, data: string): Promise<void> {
		const stored = this.files.get(file.path);
		if (!stored) {
			throw new Error(`File not found: ${file.path}`);
		}
		stored.content = data;
	}

	async delete(file: MockFile): Promise<void> {
		this.files.delete(file.path);
	}

	getAbstractFileByPath(path: string): MockFile | MockFolder | null {
		if (this.files.has(path)) {
			return this.files.get(path)!;
		}
		if (this.folders.has(path)) {
			return new MockFolder(path);
		}
		return null;
	}

	getMarkdownFiles(): MockFile[] {
		return Array.from(this.files.values()).filter(f => f.path.endsWith('.md'));
	}

	async createFolder(path: string): Promise<void> {
		this.folders.add(path);
	}

	// Test helper methods
	clear() {
		this.files.clear();
		this.folders.clear();
	}

	getAllFiles() {
		return Array.from(this.files.values());
	}
}

export class MockFile {
	path: string;
	content: string;
	extension: string;

	constructor(path: string, content: string = '') {
		this.path = path;
		this.content = content;
		const parts = path.split('.');
		this.extension = parts.length > 1 ? parts[parts.length - 1] : '';
	}
}

export class MockFolder {
	path: string;

	constructor(path: string) {
		this.path = path;
	}
}

export class MockWorkspace {
	private leaves: MockWorkspaceLeaf[] = [];

	getLeavesOfType(type: string): MockWorkspaceLeaf[] {
		return this.leaves.filter(leaf => leaf.view?.getViewType() === type);
	}

	getLeaf(): MockWorkspaceLeaf {
		const leaf = new MockWorkspaceLeaf();
		this.leaves.push(leaf);
		return leaf;
	}

	getRightLeaf(split: boolean): MockWorkspaceLeaf | null {
		return this.getLeaf();
	}

	revealLeaf(leaf: MockWorkspaceLeaf): void {
		// Mock implementation
	}

	// Test helper
	clear() {
		this.leaves = [];
	}
}

export class MockWorkspaceLeaf {
	view: any = null;

	async setViewState(state: any): Promise<void> {
		// Mock implementation
	}

	async openFile(file: MockFile): Promise<void> {
		// Mock implementation
	}
}

export class MockNotice {
	message: string;
	timeout?: number;

	constructor(message: string, timeout?: number) {
		this.message = message;
		this.timeout = timeout;
	}
}

export class MockModal {
	app: MockApp;
	contentEl: HTMLDivElement;

	constructor(app: MockApp) {
		this.app = app;
		this.contentEl = document.createElement('div');
	}

	open(): void {
		// Mock implementation
	}

	close(): void {
		// Mock implementation
	}

	onOpen(): void {
		// Override in subclass
	}

	onClose(): void {
		// Override in subclass
	}
}

export class MockPlugin {
	app: MockApp;
	manifest: any;

	constructor(app: MockApp, manifest: any) {
		this.app = app;
		this.manifest = manifest;
	}

	async loadData(): Promise<any> {
		return {};
	}

	async saveData(data: any): Promise<void> {
		// Mock implementation
	}

	addRibbonIcon(icon: string, title: string, callback: () => void): any {
		return {};
	}

	addCommand(command: any): any {
		return {};
	}

	addSettingTab(tab: any): void {
		// Mock implementation
	}

	registerView(type: string, viewCreator: any): void {
		// Mock implementation
	}

	addStatusBarItem(): HTMLElement {
		return document.createElement('div');
	}
}

// Mock requestUrl for API calls
export const mockRequestUrl = jest.fn();
export const requestUrl = mockRequestUrl;

// Mock normalizePath function
export function normalizePath(path: string): string {
	// Simple mock implementation - just normalize separators
	return path.replace(/\\/g, '/');
}

// Helper to reset all mocks
export function resetAllMocks() {
	mockRequestUrl.mockReset();
}
