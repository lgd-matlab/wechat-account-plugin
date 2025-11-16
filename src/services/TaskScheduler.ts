import type WeWeRssPlugin from '../main';
import { Logger } from '../utils/logger';

export type ScheduledTaskCallback = () => void | Promise<void>;

export interface ScheduledTask {
	id: string;
	callback: ScheduledTaskCallback;
	intervalMinutes: number;
	lastRun: Date | null;
	nextRun: Date;
	enabled: boolean;
}

/**
 * Task scheduler for periodic operations
 * Supports cron-like scheduling with minute-level granularity
 */
export class TaskScheduler {
	private plugin: WeWeRssPlugin;
	private logger: Logger;
	private tasks: Map<string, ScheduledTask> = new Map();
	private tickInterval: number | null = null;
	private readonly TICK_INTERVAL_MS = 60000; // 1 minute

	constructor(plugin: WeWeRssPlugin) {
		this.plugin = plugin;
		this.logger = new Logger('TaskScheduler');
	}

	/**
	 * Start the scheduler
	 */
	start(): void {
		if (this.tickInterval !== null) {
			this.logger.warn('Scheduler already running');
			return;
		}

		this.logger.info('Starting task scheduler...');

		// Run immediately on start
		this.tick();

		// Set up periodic tick
		this.tickInterval = window.setInterval(() => {
			this.tick();
		}, this.TICK_INTERVAL_MS);

		this.logger.info('Task scheduler started');
	}

	/**
	 * Stop the scheduler
	 */
	stop(): void {
		if (this.tickInterval === null) {
			this.logger.warn('Scheduler not running');
			return;
		}

		this.logger.info('Stopping task scheduler...');

		window.clearInterval(this.tickInterval);
		this.tickInterval = null;

		this.logger.info('Task scheduler stopped');
	}

	/**
	 * Register a new scheduled task
	 */
	registerTask(
		id: string,
		callback: ScheduledTaskCallback,
		intervalMinutes: number
	): void {
		if (this.tasks.has(id)) {
			this.logger.warn(`Task ${id} already registered, updating...`);
		}

		const now = new Date();
		const nextRun = new Date(now.getTime() + intervalMinutes * 60000);

		const task: ScheduledTask = {
			id,
			callback,
			intervalMinutes,
			lastRun: null,
			nextRun,
			enabled: true
		};

		this.tasks.set(id, task);
		this.logger.info(`Registered task: ${id} (interval: ${intervalMinutes}m, next run: ${nextRun.toISOString()})`);
	}

	/**
	 * Unregister a task
	 */
	unregisterTask(id: string): boolean {
		const deleted = this.tasks.delete(id);
		if (deleted) {
			this.logger.info(`Unregistered task: ${id}`);
		}
		return deleted;
	}

	/**
	 * Enable a task
	 */
	enableTask(id: string): boolean {
		const task = this.tasks.get(id);
		if (!task) {
			this.logger.warn(`Task not found: ${id}`);
			return false;
		}

		task.enabled = true;
		this.logger.info(`Enabled task: ${id}`);
		return true;
	}

	/**
	 * Disable a task
	 */
	disableTask(id: string): boolean {
		const task = this.tasks.get(id);
		if (!task) {
			this.logger.warn(`Task not found: ${id}`);
			return false;
		}

		task.enabled = false;
		this.logger.info(`Disabled task: ${id}`);
		return true;
	}

	/**
	 * Update task interval
	 */
	updateTaskInterval(id: string, intervalMinutes: number): boolean {
		const task = this.tasks.get(id);
		if (!task) {
			this.logger.warn(`Task not found: ${id}`);
			return false;
		}

		task.intervalMinutes = intervalMinutes;

		// Recalculate next run time
		const now = new Date();
		if (task.lastRun) {
			task.nextRun = new Date(task.lastRun.getTime() + intervalMinutes * 60000);
		} else {
			task.nextRun = new Date(now.getTime() + intervalMinutes * 60000);
		}

		this.logger.info(`Updated task interval: ${id} (new interval: ${intervalMinutes}m, next run: ${task.nextRun.toISOString()})`);
		return true;
	}

	/**
	 * Run a task immediately (manual trigger)
	 */
	async runTaskNow(id: string): Promise<void> {
		const task = this.tasks.get(id);
		if (!task) {
			throw new Error(`Task not found: ${id}`);
		}

		this.logger.info(`Running task immediately: ${id}`);
		await this.executeTask(task);
	}

	/**
	 * Get task status
	 */
	getTaskStatus(id: string): ScheduledTask | null {
		return this.tasks.get(id) || null;
	}

	/**
	 * Get all tasks
	 */
	getAllTasks(): ScheduledTask[] {
		return Array.from(this.tasks.values());
	}

	/**
	 * Check if scheduler is running
	 */
	isRunning(): boolean {
		return this.tickInterval !== null;
	}

	/**
	 * Tick - check and run due tasks
	 */
	private async tick(): Promise<void> {
		const now = new Date();
		const dueTasks: ScheduledTask[] = [];

		// Find all due tasks
		for (const task of this.tasks.values()) {
			if (task.enabled && now >= task.nextRun) {
				dueTasks.push(task);
			}
		}

		if (dueTasks.length === 0) {
			return;
		}

		this.logger.debug(`Found ${dueTasks.length} due tasks`);

		// Execute all due tasks
		for (const task of dueTasks) {
			await this.executeTask(task);
		}
	}

	/**
	 * Execute a single task
	 */
	private async executeTask(task: ScheduledTask): Promise<void> {
		const startTime = Date.now();

		try {
			this.logger.info(`Executing task: ${task.id}`);
			await task.callback();

			const duration = Date.now() - startTime;
			this.logger.info(`Task ${task.id} completed in ${duration}ms`);
		} catch (error) {
			this.logger.error(`Task ${task.id} failed:`, error);
		} finally {
			// Update task timing
			const now = new Date();
			task.lastRun = now;
			task.nextRun = new Date(now.getTime() + task.intervalMinutes * 60000);

			this.logger.debug(`Task ${task.id} next run: ${task.nextRun.toISOString()}`);
		}
	}

	/**
	 * Clear all tasks
	 */
	clearAllTasks(): void {
		const count = this.tasks.size;
		this.tasks.clear();
		this.logger.info(`Cleared ${count} tasks`);
	}
}
