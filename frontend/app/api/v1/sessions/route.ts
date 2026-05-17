import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type {
  APIResponse,
  CreateSessionRequest,
  StudySession,
  GetSessionsResponse,
} from "@/lib/api-types";
import { handleAPIError } from "@/lib/errors";
import { getStorageAdapter } from "@/lib/storage";
import { getRateLimiter } from "@/lib/rate-limit/rate-limiter";
import { getCacheManager } from "@/lib/cache/cache-manager";
import type { StudySession as StorageSession } from "@/lib/storage/types";

/**
 * Study Sessions API Endpoints
 * GET /api/v1/sessions - Retrieve study sessions
 * POST /api/v1/sessions - Create a new study session
 * GET /api/v1/sessions - Retrieve study sessions
 *
 * **Validates: Requirements 8.2, 8.6**
 */

const CreateSessionSchema = z.object({
  duration: z.number().int().positive("Duration must be positive"),
  notes: z.string().max(5000, "Notes too long"),
  startTime: z.string().datetime("Invalid ISO 8601 datetime"),
  endTime: z.string().datetime("Invalid ISO 8601 datetime"),
  subject: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Get client identifier for rate limiting
    const clientId = request.headers.get("x-forwarded-for") || "anonymous";

    // Check rate limit
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

    const body: CreateSessionRequest = await request.json();
    const validatedData = CreateSessionSchema.parse(body);

    // Get storage adapter
    const storage = await getStorageAdapter();

    // Convert API request to storage format
    const storageSession: StorageSession = {
      id: "",
      subject: validatedData.subject || "General",
      duration: validatedData.duration / 60, // convert to minutes
      startTime: new Date(validatedData.startTime).getTime(),
      endTime: new Date(validatedData.endTime).getTime(),
      notes: validatedData.notes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Create session in storage
    const created = await storage.createSession(storageSession);

    // Convert back to API format
    const apiSession: StudySession = {
      id: created.id,
      duration: created.duration * 60, // convert back to seconds
      notes: created.notes || "",
      startTime: new Date(created.startTime).toISOString(),
      endTime: new Date(created.endTime).toISOString(),
      createdAt: new Date(created.createdAt).toISOString(),
      userId: created.userId,
    };

    const response: APIResponse<StudySession> = {
      success: true,
      data: apiSession,
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
 * POST /api/v1/sessions
 * Create a new study session
 */
export async function POST(request: NextRequest) {
  try {
    const clientId = request.headers.get("x-forwarded-for") || "anonymous";

    // Check rate limit
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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const subject = searchParams.get("subject");

    // Get storage adapter
    const storage = await getStorageAdapter();

    // Build filters
    const filters = {
      subject: subject || undefined,
      startDate: startDate ? new Date(startDate).getTime() : undefined,
      endDate: endDate ? new Date(endDate).getTime() : undefined,
    };

    // Get sessions
    const result = await storage.listSessions(filters, { page, limit });

    // Convert to API format
    const sessions: StudySession[] = result.items.map((session) => ({
      id: session.id,
      duration: session.duration * 60, // convert to seconds
      notes: session.notes || "",
      startTime: new Date(session.startTime).toISOString(),
      endTime: new Date(session.endTime).toISOString(),
      createdAt: new Date(session.createdAt).toISOString(),
      userId: session.userId,
    }));

    const response: APIResponse<GetSessionsResponse> = {
      success: true,
      data: {
        sessions,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: (page - 1) * limit,
          hasMore: page < result.totalPages,
        },
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const errorResponse = handleAPIError(error);
    return NextResponse.json(errorResponse, {
      status: errorResponse.status || 500,
    });
  }
}
