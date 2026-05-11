/**
 * Study Sessions API Endpoints
 * GET /api/v1/sessions - Retrieve study sessions
 * POST /api/v1/sessions - Create a new study session
 * 
 * Requirements: 8.6
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { APIResponse } from '@/lib/api-types';
import { handleAPIError } from '@/lib/errors';
import { getStorageAdapter } from '@/lib/storage';

// Validation schemas
const CreateSessionSchema = z.object({
  duration: z.number().int().positive(),
  notes: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
});

const GetSessionsQuerySchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 50),
  offset: z.string().optional().transform(val => val ? parseInt(val, 10) : 0),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * GET /api/v1/sessions
 * Retrieve study sessions with optional filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = GetSessionsQuerySchema.parse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    });

    // Validate limits
    const limit = Math.min(query.limit, 100);
    const offset = query.offset;

    // Get storage adapter
    const storage = getStorageAdapter();

    // Parse date filters
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    // Retrieve sessions
    const allSessions = await storage.getSessions(undefined, startDate, endDate);
    
    // Apply pagination
    const paginatedSessions = allSessions.slice(offset, offset + limit);
    const hasMore = allSessions.length > offset + limit;

    const response: APIResponse = {
      success: true,
      data: {
        sessions: paginatedSessions,
        pagination: {
          total: allSessions.length,
          limit,
          offset,
          hasMore,
        },
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const response: APIResponse = {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid query parameters',
          details: error.errors,
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    const errorResponse = handleAPIError(error);
    return NextResponse.json(errorResponse, { status: errorResponse.status });
  }
}

/**
 * POST /api/v1/sessions
 * Create a new study session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = CreateSessionSchema.parse(body);

    // Get storage adapter
    const storage = getStorageAdapter();

    // Save session
    const session = await storage.saveSession(validatedData);

    const response: APIResponse = {
      success: true,
      data: session,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const response: APIResponse = {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Request validation failed',
          details: error.errors,
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    const errorResponse = handleAPIError(error);
    return NextResponse.json(errorResponse, { status: errorResponse.status });
  }
}
