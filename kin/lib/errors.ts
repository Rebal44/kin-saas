/**
 * API Error Handler
 * Standardized error responses
 */

import { NextResponse } from 'next/server';

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export function handleError(error: unknown): NextResponse {
  if (error instanceof APIError) {
    return NextResponse.json(
      { 
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  console.error('Unhandled error:', error);
  
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}

export function successResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}
