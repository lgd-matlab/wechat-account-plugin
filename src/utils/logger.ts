/**
 * Simple logger utility for WeWe RSS plugin
 */

export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
}

export class Logger {
	private level: LogLevel = LogLevel.INFO;
	private prefix: string;

	constructor(prefix: string = 'WeWe RSS') {
		this.prefix = prefix;
	}

	setLevel(level: LogLevel) {
		this.level = level;
	}

	debug(...args: any[]) {
		if (this.level <= LogLevel.DEBUG) {
			console.debug(`[${this.prefix}]`, ...args);
		}
	}

	info(...args: any[]) {
		if (this.level <= LogLevel.INFO) {
			console.log(`[${this.prefix}]`, ...args);
		}
	}

	warn(...args: any[]) {
		if (this.level <= LogLevel.WARN) {
			console.warn(`[${this.prefix}]`, ...args);
		}
	}

	error(...args: any[]) {
		if (this.level <= LogLevel.ERROR) {
			console.error(`[${this.prefix}]`, ...args);
		}
	}
}

export const logger = new Logger();
