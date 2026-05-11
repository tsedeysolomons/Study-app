/**
 * Notes API Endpoints
 * GET /api/v1/notes - Retrieve notes
 * POST /api/v1/notes - Save or update notes
 * 
 * Requirements: 8.7
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { APIResponse } from '@/lib/api-types';
import { handleAPIError } from '@/lib/errors';
import { getStorageAdapter } from '@/lib/storage';

// Validation schema
const SaveNotesSchema = z.object({
  content: z.string(),
  lastModified: z.string().datetime(),
});

/**
 * GET /api/v1/notes
 * Retrieve current notes
 */
export async function GET(request: NextRequest) {
  try {
    // Get storage adapter
    const storage = getStorageAdapter();

    // Retrieve notes
    const notes = await storage.getNotes();

    if (!notes) {
      // Return empty notes if none exist
      const response: APIResponse = {
        success: true,
        data: {
          content: '',
          lastModified: new Date().toISOString(),
        },
      };
      return NextResponse.json(response, { status: 200 });
    }

    const response: APIResponse = {
      success: true,
      data: notes,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const errorResponse = handleAPIError(error);
    return NextResponse.json(errorResponse, { status: errorResponse.status });
  }
}

/**
 * POST /api/v1/notes
 * Save or update notes
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = SaveNotesSchema.parse(body);

    // Get storage adapter
    const storage = getStorageAdapter();

    // Save notes
    const savedNotes = await storage.saveNotes({
      content: validatedData.content,
      lastModified: validatedData.lastModified,
    });

    const response: APIResponse = {
      success: true,
      data: {
        ...savedNotes,
        savedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json(response, { status: 200 });
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
