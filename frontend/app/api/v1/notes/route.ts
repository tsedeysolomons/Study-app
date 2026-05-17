import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { APIResponse } from "@/lib/api-types";
import { handleAPIError } from "@/lib/errors";
import { getStorageAdapter } from "@/lib/storage";
import { getRateLimiter } from "@/lib/rate-limit/rate-limiter";
import { getCacheManager } from "@/lib/cache/cache-manager";
import type { Note as StorageNote } from "@/lib/storage/types";

/**
 * Notes Endpoint
 * POST /api/v1/notes - Create or update note
 * GET /api/v1/notes - Retrieve notes
 *
 * **Validates: Requirements 8.2, 8.7, 7.1, 7.5, 7.6**
 */

const CreateNoteSchema = z.object({
  title: z.string().min(1, "Title required").max(500),
  content: z.string().max(50000),
  subject: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const UpdateNoteSchema = CreateNoteSchema.partial();

export async function POST(request: NextRequest) {
  try {
    const clientId = request.headers.get("x-forwarded-for") || "anonymous";
    const rateLimiter = getRateLimiter();
    const rateLimitResult = rateLimiter.checkLimit(clientId);

    if (!rateLimitResult.allowed) {
      const response: APIResponse = {
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests",
          retryAfter: rateLimitResult.retryAfter,
        },
      };
      return NextResponse.json(response, { status: 429 });
    }

    const body = await request.json();
    const validatedData = CreateNoteSchema.parse(body);

    const storage = await getStorageAdapter();

    const note: StorageNote = {
      id: "",
      title: validatedData.title,
      content: validatedData.content,
      subject: validatedData.subject,
      tags: validatedData.tags,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const created = await storage.createNote(note);

    const response: APIResponse = {
      success: true,
      data: {
        id: created.id,
        title: created.title,
        content: created.content,
        subject: created.subject,
        tags: created.tags,
        createdAt: new Date(created.createdAt).toISOString(),
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const response: APIResponse = {
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Request validation failed",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    const errorResponse = handleAPIError(error);
    return NextResponse.json(errorResponse, {
      status: errorResponse.status || 500,
    });
  }
}

/**
 * POST /api/v1/notes
 * Save or update notes
 */
export async function POST(request: NextRequest) {
  try {
    const clientId = request.headers.get("x-forwarded-for") || "anonymous";
    const rateLimiter = getRateLimiter();
    const rateLimitResult = rateLimiter.checkLimit(clientId);

    if (!rateLimitResult.allowed) {
      const response: APIResponse = {
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests",
          retryAfter: rateLimitResult.retryAfter,
        },
      };
      return NextResponse.json(response, { status: 429 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const subject = searchParams.get("subject");

    // Check cache first
    const cacheKey = `notes:${page}:${limit}:${subject || "all"}`;
    const cache = getCacheManager();
    const cached = cache.get<any>(cacheKey);
    if (cached) {
      const response: APIResponse = {
        success: true,
        data: {
          ...cached,
          cached: true,
        },
      };
      return NextResponse.json(response, { status: 200 });
    }

    const storage = await getStorageAdapter();
    const filters = subject ? { subject } : undefined;

    const result = await storage.listNotes(filters, { page, limit });

    const notes = result.items.map((note) => ({
      id: note.id,
      title: note.title,
      content: note.content,
      subject: note.subject,
      tags: note.tags,
      createdAt: new Date(note.createdAt).toISOString(),
      updatedAt: new Date(note.updatedAt).toISOString(),
    }));

    const data = {
      notes,
      pagination: {
        total: result.total,
        limit: result.limit,
        page,
        hasMore: page < result.totalPages,
      },
    };

    // Cache the result for 1 hour
    cache.set(cacheKey, data, 3600);

    const response: APIResponse = {
      success: true,
      data,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const errorResponse = handleAPIError(error);
    return NextResponse.json(errorResponse, {
      status: errorResponse.status || 500,
    });
  }
}
