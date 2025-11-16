/**
 * Unit tests for Logger utility
 * Tests logging functionality and log levels
 */

import { Logger, LogLevel } from '../../../utils/logger';

describe('Logger', () => {
	let logger: Logger;
	let consoleDebugSpy: jest.SpyInstance;
	let consoleLogSpy: jest.SpyInstance;
	let consoleWarnSpy: jest.SpyInstance;
	let consoleErrorSpy: jest.SpyInstance;

	beforeEach(() => {
		logger = new Logger('TestLogger');

		// Spy on console methods
		consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
		consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
		consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
		consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
	});

	afterEach(() => {
		// Restore console methods
		consoleDebugSpy.mockRestore();
		consoleLogSpy.mockRestore();
		consoleWarnSpy.mockRestore();
		consoleErrorSpy.mockRestore();
	});

	describe('constructor', () => {
		it('should create logger with custom prefix', () => {
			const customLogger = new Logger('CustomPrefix');
			customLogger.info('test');

			expect(consoleLogSpy).toHaveBeenCalledWith('[CustomPrefix]', 'test');
		});

		it('should create logger with default prefix', () => {
			const defaultLogger = new Logger();
			defaultLogger.info('test');

			expect(consoleLogSpy).toHaveBeenCalledWith('[WeWe RSS]', 'test');
		});
	});

	describe('setLevel', () => {
		it('should set log level', () => {
			logger.setLevel(LogLevel.ERROR);
			logger.info('test');

			expect(consoleLogSpy).not.toHaveBeenCalled();
		});

		it('should allow changing log level', () => {
			logger.setLevel(LogLevel.ERROR);
			logger.info('test1');
			expect(consoleLogSpy).not.toHaveBeenCalled();

			logger.setLevel(LogLevel.INFO);
			logger.info('test2');
			expect(consoleLogSpy).toHaveBeenCalledWith('[TestLogger]', 'test2');
		});
	});

	describe('debug', () => {
		it('should log debug messages when level is DEBUG', () => {
			logger.setLevel(LogLevel.DEBUG);
			logger.debug('debug message');

			expect(consoleDebugSpy).toHaveBeenCalledWith('[TestLogger]', 'debug message');
		});

		it('should not log debug when level is INFO', () => {
			logger.setLevel(LogLevel.INFO);
			logger.debug('debug message');

			expect(consoleDebugSpy).not.toHaveBeenCalled();
		});

		it('should not log debug when level is WARN', () => {
			logger.setLevel(LogLevel.WARN);
			logger.debug('debug message');

			expect(consoleDebugSpy).not.toHaveBeenCalled();
		});

		it('should not log debug when level is ERROR', () => {
			logger.setLevel(LogLevel.ERROR);
			logger.debug('debug message');

			expect(consoleDebugSpy).not.toHaveBeenCalled();
		});

		it('should handle multiple arguments', () => {
			logger.setLevel(LogLevel.DEBUG);
			logger.debug('arg1', 'arg2', { key: 'value' });

			expect(consoleDebugSpy).toHaveBeenCalledWith(
				'[TestLogger]',
				'arg1',
				'arg2',
				{ key: 'value' }
			);
		});
	});

	describe('info', () => {
		it('should log info messages when level is DEBUG', () => {
			logger.setLevel(LogLevel.DEBUG);
			logger.info('info message');

			expect(consoleLogSpy).toHaveBeenCalledWith('[TestLogger]', 'info message');
		});

		it('should log info messages when level is INFO', () => {
			logger.setLevel(LogLevel.INFO);
			logger.info('info message');

			expect(consoleLogSpy).toHaveBeenCalledWith('[TestLogger]', 'info message');
		});

		it('should not log info when level is WARN', () => {
			logger.setLevel(LogLevel.WARN);
			logger.info('info message');

			expect(consoleLogSpy).not.toHaveBeenCalled();
		});

		it('should not log info when level is ERROR', () => {
			logger.setLevel(LogLevel.ERROR);
			logger.info('info message');

			expect(consoleLogSpy).not.toHaveBeenCalled();
		});

		it('should handle multiple arguments', () => {
			logger.setLevel(LogLevel.INFO);
			logger.info('message', 123, true);

			expect(consoleLogSpy).toHaveBeenCalledWith('[TestLogger]', 'message', 123, true);
		});
	});

	describe('warn', () => {
		it('should log warn messages when level is DEBUG', () => {
			logger.setLevel(LogLevel.DEBUG);
			logger.warn('warn message');

			expect(consoleWarnSpy).toHaveBeenCalledWith('[TestLogger]', 'warn message');
		});

		it('should log warn messages when level is INFO', () => {
			logger.setLevel(LogLevel.INFO);
			logger.warn('warn message');

			expect(consoleWarnSpy).toHaveBeenCalledWith('[TestLogger]', 'warn message');
		});

		it('should log warn messages when level is WARN', () => {
			logger.setLevel(LogLevel.WARN);
			logger.warn('warn message');

			expect(consoleWarnSpy).toHaveBeenCalledWith('[TestLogger]', 'warn message');
		});

		it('should not log warn when level is ERROR', () => {
			logger.setLevel(LogLevel.ERROR);
			logger.warn('warn message');

			expect(consoleWarnSpy).not.toHaveBeenCalled();
		});

		it('should handle multiple arguments', () => {
			logger.setLevel(LogLevel.WARN);
			logger.warn('warning:', new Error('test error'));

			expect(consoleWarnSpy).toHaveBeenCalledWith(
				'[TestLogger]',
				'warning:',
				expect.any(Error)
			);
		});
	});

	describe('error', () => {
		it('should log error messages when level is DEBUG', () => {
			logger.setLevel(LogLevel.DEBUG);
			logger.error('error message');

			expect(consoleErrorSpy).toHaveBeenCalledWith('[TestLogger]', 'error message');
		});

		it('should log error messages when level is INFO', () => {
			logger.setLevel(LogLevel.INFO);
			logger.error('error message');

			expect(consoleErrorSpy).toHaveBeenCalledWith('[TestLogger]', 'error message');
		});

		it('should log error messages when level is WARN', () => {
			logger.setLevel(LogLevel.WARN);
			logger.error('error message');

			expect(consoleErrorSpy).toHaveBeenCalledWith('[TestLogger]', 'error message');
		});

		it('should log error messages when level is ERROR', () => {
			logger.setLevel(LogLevel.ERROR);
			logger.error('error message');

			expect(consoleErrorSpy).toHaveBeenCalledWith('[TestLogger]', 'error message');
		});

		it('should handle Error objects', () => {
			logger.setLevel(LogLevel.ERROR);
			const error = new Error('test error');
			logger.error('Failed:', error);

			expect(consoleErrorSpy).toHaveBeenCalledWith('[TestLogger]', 'Failed:', error);
		});

		it('should handle multiple arguments', () => {
			logger.setLevel(LogLevel.ERROR);
			logger.error('error code:', 500, { details: 'server error' });

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'[TestLogger]',
				'error code:',
				500,
				{ details: 'server error' }
			);
		});
	});

	describe('log level hierarchy', () => {
		it('should respect DEBUG level (logs everything)', () => {
			logger.setLevel(LogLevel.DEBUG);

			logger.debug('debug');
			logger.info('info');
			logger.warn('warn');
			logger.error('error');

			expect(consoleDebugSpy).toHaveBeenCalled();
			expect(consoleLogSpy).toHaveBeenCalled();
			expect(consoleWarnSpy).toHaveBeenCalled();
			expect(consoleErrorSpy).toHaveBeenCalled();
		});

		it('should respect INFO level (no debug)', () => {
			logger.setLevel(LogLevel.INFO);

			logger.debug('debug');
			logger.info('info');
			logger.warn('warn');
			logger.error('error');

			expect(consoleDebugSpy).not.toHaveBeenCalled();
			expect(consoleLogSpy).toHaveBeenCalled();
			expect(consoleWarnSpy).toHaveBeenCalled();
			expect(consoleErrorSpy).toHaveBeenCalled();
		});

		it('should respect WARN level (only warn and error)', () => {
			logger.setLevel(LogLevel.WARN);

			logger.debug('debug');
			logger.info('info');
			logger.warn('warn');
			logger.error('error');

			expect(consoleDebugSpy).not.toHaveBeenCalled();
			expect(consoleLogSpy).not.toHaveBeenCalled();
			expect(consoleWarnSpy).toHaveBeenCalled();
			expect(consoleErrorSpy).toHaveBeenCalled();
		});

		it('should respect ERROR level (only errors)', () => {
			logger.setLevel(LogLevel.ERROR);

			logger.debug('debug');
			logger.info('info');
			logger.warn('warn');
			logger.error('error');

			expect(consoleDebugSpy).not.toHaveBeenCalled();
			expect(consoleLogSpy).not.toHaveBeenCalled();
			expect(consoleWarnSpy).not.toHaveBeenCalled();
			expect(consoleErrorSpy).toHaveBeenCalled();
		});
	});

	describe('edge cases', () => {
		it('should handle empty messages', () => {
			logger.info();

			expect(consoleLogSpy).toHaveBeenCalledWith('[TestLogger]');
		});

		it('should handle null and undefined', () => {
			logger.info(null, undefined);

			expect(consoleLogSpy).toHaveBeenCalledWith('[TestLogger]', null, undefined);
		});

		it('should handle complex objects', () => {
			logger.setLevel(LogLevel.INFO);
			const complexObj = { nested: { data: [1, 2, 3] }, circular: null as any };
			complexObj.circular = complexObj; // Create circular reference

			logger.info('Complex:', complexObj);

			expect(consoleLogSpy).toHaveBeenCalled();
		});

		it('should handle very long strings', () => {
			const longString = 'a'.repeat(10000);
			logger.info(longString);

			expect(consoleLogSpy).toHaveBeenCalledWith('[TestLogger]', longString);
		});
	});
});
