/**
 * Vitest Test Setup
 */

import { vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise during tests
const originalConsole = { ...console };

beforeAll(() => {
  // Silence console during tests unless DEBUG is set
  if (!process.env.DEBUG) {
    console.log = vi.fn();
    console.info = vi.fn();
    console.debug = vi.fn();
    console.warn = vi.fn();
  }
});

afterAll(() => {
  // Restore console
  Object.assign(console, originalConsole);
});

// Global test timeout
vi.setConfig({ testTimeout: 10000 });

// Mock timers for consistent tests
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

// Global fetch mock
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Global crypto mock for Node.js environment
if (typeof global.crypto === 'undefined') {
  Object.defineProperty(global, 'crypto', {
    value: {
      randomUUID: () => 'test-uuid-' + Math.random().toString(36).substring(2),
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      },
    },
  });
}

// Extend expect matchers (if needed)
expect.extend({
  toBeValidDate(received: unknown) {
    const pass = received instanceof Date && !isNaN(received.getTime());
    return {
      pass,
      message: () => `expected ${received} to be a valid Date`,
    };
  },
  toBeUUID(received: unknown) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = typeof received === 'string' && uuidRegex.test(received);
    return {
      pass,
      message: () => `expected ${received} to be a valid UUID`,
    };
  },
});

// Type definitions for custom matchers
declare module 'vitest' {
  interface Assertion<T> {
    toBeValidDate(): T;
    toBeUUID(): T;
  }
  interface AsymmetricMatchersContaining {
    toBeValidDate(): unknown;
    toBeUUID(): unknown;
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection during tests:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception during tests:', error);
});
