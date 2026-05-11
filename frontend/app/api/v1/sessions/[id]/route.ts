/**
 * Individual Session API Endpoint
 * DELETE /api/v1/sessions/:id - Delete a study session
 * 
 * Requirements: 8.6
 */

import { NextRequest, NextResponse } from 'next/server';
import type { APIResponse } from '@/lib/api-types';
import { handleAPIError } from '@/lib/errors';
import { getStorageAdapter } from '@/lib/storage';

/**
 * DELETE /api/v1/sessions/:id
 * Delete a specific study session
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      const response: APIResponse = {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Session ID is required',
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Get storage adapter
    const storage = getStorageAdapter();

    // Delete session
    const deleted = await storage.deleteSession(id);

    if (!deleted) {
      const response: APIResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Session not found',
        },
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: APIResponse = {
      success: true,
      data: {
        deleted: true,
        id,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const errorResponse = handleAPIError(error);
    return NextResponse.json(errorResponse, { status: errorResponse.status });
  }
}
