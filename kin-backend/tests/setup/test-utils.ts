/**
 * Test Utilities and Helpers
 */

import { vi } from 'vitest';
import type { Request, Response } from 'express';

// Mock Express Request factory
export function createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    cookies: {},
    ip: '127.0.0.1',
    method: 'GET',
    url: '/',
    path: '/',
    ...overrides,
  } as Partial<Request>;
}

// Mock Express Response factory
export function createMockResponse(): Response {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    sendStatus: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
    locals: {},
  };
  return res as Response;
}

// Mock Next function
export function createMockNext() {
  return vi.fn();
}

// Test database factory
export function createMockSupabaseClient() {
  const mockData: Record<string, unknown[]> = {};

  return {
    from: vi.fn((table: string) => ({
      select: vi.fn((columns = '*') => ({
        eq: vi.fn((column: string, value: unknown) => ({
          single: vi.fn(() => Promise.resolve({
            data: mockData[table]?.find((r: Record<string, unknown>) => r[column] === value) || null,
            error: null,
          })),
          order: vi.fn(() => Promise.resolve({
            data: mockData[table]?.filter((r: Record<string, unknown>) => r[column] === value) || [],
            error: null,
          })),
          limit: vi.fn((n: number) => Promise.resolve({
            data: (mockData[table]?.filter((r: Record<string, unknown>) => r[column] === value) || []).slice(0, n),
            error: null,
          })),
        })),
        neq: vi.fn(() => Promise.resolve({
          data: mockData[table] || [],
          error: null,
        })),
        gt: vi.fn(() => Promise.resolve({
          data: mockData[table] || [],
          error: null,
        })),
        lt: vi.fn(() => Promise.resolve({
          data: mockData[table] || [],
          error: null,
        })),
        order: vi.fn(() => Promise.resolve({
          data: mockData[table] || [],
          error: null,
        })),
        limit: vi.fn((n: number) => Promise.resolve({
          data: (mockData[table] || []).slice(0, n),
          error: null,
        })),
      })),
      insert: vi.fn((data: Record<string, unknown>) => ({
        select: vi.fn(() => Promise.resolve({
          data: [{ ...data, id: `mock_${Date.now()}`, created_at: new Date().toISOString() }],
          error: null,
        })),
        single: vi.fn(() => Promise.resolve({
          data: { ...data, id: `mock_${Date.now()}`, created_at: new Date().toISOString() },
          error: null,
        })),
      })),
      update: vi.fn((data: Record<string, unknown>) => ({
        eq: vi.fn((column: string, value: unknown) => Promise.resolve({
          data: { ...mockData[table]?.find((r: Record<string, unknown>) => r[column] === value), ...data },
          error: null,
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signInWithPassword: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      signUp: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
    },
    // Helper to seed mock data
    _seed: (table: string, data: unknown[]) => {
      mockData[table] = data;
    },
    _clear: () => {
      Object.keys(mockData).forEach((key) => delete mockData[key]);
    },
  };
}

// Async test helper - waits for promises to resolve
export async function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// Test timeout helper
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Mock date helper
export function mockDate(isoDate: string): () => void {
  const RealDate = global.Date;
  const mockDate = new RealDate(isoDate);

  global.Date = class extends RealDate {
    constructor();
    constructor(value: string | number | Date);
    constructor(value?: string | number | Date) {
      super();
      if (value) {
        return new RealDate(value) as unknown as Date;
      }
      return mockDate as unknown as Date;
    }

    static now() {
      return mockDate.getTime();
    }
  } as unknown as DateConstructor;

  return () => {
    global.Date = RealDate;
  };
}

// Random string generator for test data
export function generateTestId(prefix = 'test'): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 15)}`;
}

// Deep partial type helper
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Error matching helper
export function expectError(fn: () => unknown, expectedMessage?: string): void {
  try {
    fn();
    throw new Error('Expected function to throw');
  } catch (error) {
    if (expectedMessage && error instanceof Error) {
      if (!error.message.includes(expectedMessage)) {
        throw new Error(`Expected error message to include "${expectedMessage}", got "${error.message}"`);
      }
    }
  }
}

// Mock logger for testing
export function createMockLogger() {
  return {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    http: vi.fn(),
  };
}

// HTTP status code helpers
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Test environment setup
export function setupTestEnv(env: Record<string, string> = {}): () => void {
  const originalEnv = { ...process.env };

  Object.entries(env).forEach(([key, value]) => {
    process.env[key] = value;
  });

  return () => {
    process.env = originalEnv;
  };
}
