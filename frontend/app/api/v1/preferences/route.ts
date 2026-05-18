import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { APIResponse } from "@/lib/api-types";
import { handleAPIError } from "@/lib/errors";
import { getStorageAdapter } from "@/lib/storage";
import { getRateLimiter } from "@/lib/rate-limit/rate-limiter";
import type { UserPreferences as StoragePreferences } from "@/lib/storage/types";

/**
 * User Preferences Endpoint
 * GET /api/v1/preferences - Get user preferences
 * PUT /api/v1/preferences - Update user preferences
 *
 * **Validates: Requirements 9.6, 10.7**
 */

const UpdatePreferencesSchema = z.object({
  userId: z.string(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  notificationsEnabled: z.boolean().optional(),
  language: z.string().optional(),
  studyGoalMinutes: z.number().int().positive().optional(),
  defaultAIProvider: z.enum(["openai", "anthropic"]).optional(),
});

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

    const userId = request.headers.get("x-user-id");
    if (!userId) {
      const response: APIResponse = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "x-user-id header is required",
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    const storage = await getStorageAdapter();
    const prefs = await storage.getPreferences(userId);

    if (!prefs) {
      // Return default preferences
      const defaults: StoragePreferences = {
        userId,
        theme: "system",
        notificationsEnabled: true,
        language: "en",
        studyGoalMinutes: 60,
        defaultAIProvider: "openai",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const response: APIResponse = {
        success: true,
        data: defaults,
      };
      return NextResponse.json(response, { status: 200 });
    }

    const response: APIResponse = {
      success: true,
      data: prefs,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const errorResponse = handleAPIError(error);
    return NextResponse.json(errorResponse, {
      status: errorResponse.status || 500,
    });
  }
}

export async function PUT(request: NextRequest) {
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

    const userId = request.headers.get("x-user-id");
    if (!userId) {
      const response: APIResponse = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "x-user-id header is required",
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    const body = await request.json();
    const validatedData = UpdatePreferencesSchema.parse(body);

    const storage = await getStorageAdapter();

    // Get existing or create defaults
    let existing = await storage.getPreferences(userId);
    if (!existing) {
      existing = {
        userId,
        theme: "system",
        notificationsEnabled: true,
        language: "en",
        studyGoalMinutes: 60,
        defaultAIProvider: "openai",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }

    // Merge updates
    const updated: StoragePreferences = {
      ...existing,
      ...validatedData,
      userId,
      updatedAt: Date.now(),
    };

    const result = await storage.upsertPreferences(updated);

    const response: APIResponse = {
      success: true,
      data: result,
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
