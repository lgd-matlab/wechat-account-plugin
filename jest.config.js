module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'jsdom', // Changed from 'node' to support DOMParser for ContentParser tests
	roots: ['<rootDir>/src'],
	testMatch: ['**/__tests__/**/*.test.ts', '**/*.spec.ts'],
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
		'^obsidian$': '<rootDir>/src/__tests__/mocks/obsidian.ts'
	},
	collectCoverageFrom: [
		'src/**/*.ts',
		'!src/**/*.d.ts',
		'!src/__tests__/**',
		'!src/types/**',
		'!src/main.ts' // Plugin entry point, hard to test in isolation
	],
	coverageThreshold: {
		global: {
			branches: 60,
			functions: 65,
			lines: 70,
			statements: 70
		}
	},
	coverageDirectory: 'coverage',
	verbose: true,
	// Handle sql.js WebAssembly
	globals: {
		'ts-jest': {
			tsconfig: {
				esModuleInterop: true,
				allowSyntheticDefaultImports: true
			}
		}
	}
};
