import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { APIResponse } from "@/lib/api-types";
import { handleAPIError } from "@/lib/errors";
import { getStorageAdapter } from "@/lib/storage";
import { getRateLimiter } from "@/lib/rate-limit/rate-limiter";
import type { AnalyticsEvent as StorageEvent } from "@/lib/storage/types";

/**
 * Analytics Events Endpoint
 * POST /api/v1/analytics/events - Submit analytics events (batched)
 * GET /api/v1/analytics/events - Retrieve analytics events
 */

const EventSchema = z.object({
  type: z.string(),
  timestamp: z.string().datetime(),
  sessionId: z.string(),
  metadata: z.record(z.any()).optional(),
});

const SubmitEventsSchema = z.object({
  events: z.array(EventSchema),
});

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
    const validatedData = SubmitEventsSchema.parse(body);

    const storage = await getStorageAdapter();
    let processed = 0;

    // Record events
    for (const event of validatedData.events) {
      const storageEvent: StorageEvent = {
        eventType: event.type,
        timestamp: new Date(event.timestamp).getTime(),
        eventData: {
          sessionId: event.sessionId,
          ...event.metadata,
        },
      };

      await storage.recordEvent(storageEvent);
      processed++;
    }

    const response: APIResponse = {
      success: true,
      data: {
        received: validatedData.events.length,
        processed,
      },
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

export async function GET(request: NextRequest) {
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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const eventType = searchParams.get("eventType");

    const storage = await getStorageAdapter();

    const filters = {
      startDate: startDate ? new Date(startDate).getTime() : undefined,
      endDate: endDate ? new Date(endDate).getTime() : undefined,
    };

    const result = await storage.getEvents(filters, { page, limit });

    const events = result.items
      .filter((e) => !eventType || e.eventType === eventType)
      .map((event) => ({
        id: event.id,
        type: event.eventType,
        timestamp: new Date(event.timestamp).toISOString(),
        metadata: event.eventData,
      }));

    const response: APIResponse = {
      success: true,
      data: {
        events,
        pagination: {
          total: result.total,
          limit: result.limit,
          page,
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
