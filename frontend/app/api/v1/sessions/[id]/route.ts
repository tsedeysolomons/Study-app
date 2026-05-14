import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { APIResponse, StudySession } from "@/lib/api-types";
import { handleAPIError } from "@/lib/errors";
import { getStorageAdapter } from "@/lib/storage";
import { getRateLimiter } from "@/lib/rate-limit/rate-limiter";

/**
 * Individual Session Endpoint
 * GET /api/v1/sessions/:id - Get specific session
 * PATCH /api/v1/sessions/:id - Update session
 * DELETE /api/v1/sessions/:id - Delete session
 */

const UpdateSessionSchema = z.object({
  duration: z.number().int().positive().optional(),
  notes: z.string().max(5000).optional(),
  subject: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const storage = await getStorageAdapter();
    const session = await storage.getSession(id);

    if (!session) {
      const response: APIResponse = {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: `Session ${id} not found`,
        },
      };
      return NextResponse.json(response, { status: 404 });
    }

    const apiSession: StudySession = {
      id: session.id,
      duration: session.duration * 60,
      notes: session.notes || "",
      startTime: new Date(session.startTime).toISOString(),
      endTime: new Date(session.endTime).toISOString(),
      createdAt: new Date(session.createdAt).toISOString(),
      userId: session.userId,
    };

    const response: APIResponse<StudySession> = {
      success: true,
      data: apiSession,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const errorResponse = handleAPIError(error);
    return NextResponse.json(errorResponse, {
      status: errorResponse.status || 500,
    });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const body = await request.json();
    const validatedData = UpdateSessionSchema.parse(body);

    const storage = await getStorageAdapter();

    // Check if session exists
    const existing = await storage.getSession(id);
    if (!existing) {
      const response: APIResponse = {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: `Session ${id} not found`,
        },
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Update session
    const updated = await storage.updateSession(id, {
      duration: validatedData.duration
        ? validatedData.duration / 60
        : undefined,
      notes: validatedData.notes,
      subject: validatedData.subject,
    });

    const apiSession: StudySession = {
      id: updated.id,
      duration: updated.duration * 60,
      notes: updated.notes || "",
      startTime: new Date(updated.startTime).toISOString(),
      endTime: new Date(updated.endTime).toISOString(),
      createdAt: new Date(updated.createdAt).toISOString(),
      userId: updated.userId,
    };

    const response: APIResponse<StudySession> = {
      success: true,
      data: apiSession,
    };

    return NextResponse.json(response, { status: 200 });
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const storage = await getStorageAdapter();

    // Check if session exists
    const existing = await storage.getSession(id);
    if (!existing) {
      const response: APIResponse = {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: `Session ${id} not found`,
        },
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Delete session
    await storage.deleteSession(id);

    const response: APIResponse = {
      success: true,
      data: { message: "Session deleted successfully" },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const errorResponse = handleAPIError(error);
    return NextResponse.json(errorResponse, {
      status: errorResponse.status || 500,
    });
  }
}
