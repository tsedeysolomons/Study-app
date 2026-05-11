import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { APIResponse, SummarizeRequest, SummarizeResponse } from "@/lib/api-types";
import { handleAPIError } from "@/lib/errors";
import { AIServiceAdapter, OpenAIProvider, AnthropicProvider } from "@/lib/ai";
import { TokenManager } from "@/lib/ai/token-manager";
import { CacheManager } from "@/lib/cache/cache-manager";
import type { AIConfig } from "@/lib/ai/types";

/**
 * AI Text Summarization Endpoint
 * POST /api/v1/ai/summarize
 * 
 * Generates a summary and key points from input text
 * 
 * **Validates: Requirements 2.1, 2.2, 3.1, 3.2, 3.3**
 */

// Zod schema for request validation
const SummarizeRequestSchema = z.object({
  text: z.string().min(1, "Text cannot be empty").max(50000, "Text is too long"),
  options: z.object({
    maxKeyPoints: z.number().int().min(3).max(7).optional(),
    temperature: z.number().min(0).max(1).optional(),
  }).optional(),
});

/**
 * Initialize AI service adapter with environment configuration
 */
function initializeAIService(): { adapter: AIServiceAdapter; tokenManager: TokenManager; cacheManager: CacheManager } {
  // Get configuration from environment variables
  const provider = process.env.AI_PROVIDER as "openai" | "anthropic" | undefined;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;

  // Validate required configuration
  if (!provider || !apiKey || !model) {
    throw new Error("AI service not configured. Missing AI_PROVIDER, AI_API_KEY, or AI_MODEL environment variables.");
  }

  // Create AI configuration
  const config: AIConfig = {
    provider,
    apiKey,
    model,
    maxInputTokens: parseInt(process.env.AI_MAX_INPUT_TOKENS || "4000", 10),
    maxOutputTokens: {
      summary: parseInt(process.env.AI_MAX_OUTPUT_TOKENS_SUMMARY || "500", 10),
      quiz: parseInt(process.env.AI_MAX_OUTPUT_TOKENS_QUIZ || "1000", 10),
    },
    timeout: parseInt(process.env.AI_REQUEST_TIMEOUT || "15000", 10),
    cacheEnabled: process.env.CACHE_ENABLED !== "false",
  };

  // Initialize provider
  const providerInstance = provider === "openai" 
    ? new OpenAIProvider(config)
    : new AnthropicProvider(config);

  // Initialize adapter
  const adapter = new AIServiceAdapter(providerInstance, config);

  // Initialize token manager
  const tokenManager = new TokenManager({
    maxInputTokens: config.maxInputTokens,
    maxOutputTokens: config.maxOutputTokens,
    dailyBudget: process.env.AI_DAILY_TOKEN_BUDGET 
      ? parseInt(process.env.AI_DAILY_TOKEN_BUDGET, 10) 
      : undefined,
  });

  // Initialize cache manager
  const cacheManager = new CacheManager({
    enabled: process.env.CACHE_ENABLED !== "false",
    ttl: parseInt(process.env.CACHE_TTL || "86400", 10), // 24 hours default
    maxEntries: parseInt(process.env.CACHE_MAX_ENTRIES || "1000", 10),
  });

  return { adapter, tokenManager, cacheManager };
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = SummarizeRequestSchema.parse(body);

    // Initialize AI service
    const { adapter, tokenManager, cacheManager } = initializeAIService();

    // Generate cache key
    const cacheKey = cacheManager.generateKey("summary", {
      text: validatedData.text,
      options: validatedData.options
    });

    // Check cache first
    const cachedResult = await cacheManager.get<SummarizeResponse>(cacheKey);
    if (cachedResult) {
      const response: APIResponse<SummarizeResponse> = {
        success: true,
        data: {
          ...cachedResult,
          metadata: {
            ...cachedResult.metadata,
            cached: true
          }
        },
      };
      return NextResponse.json(response, { status: 200 });
    }

    // Validate token budget
    tokenManager.validateRequest(validatedData.text, "summary");

    // Generate summary
    const result = await adapter.summarize(validatedData.text, validatedData.options);

    // Track token usage
    tokenManager.trackUsage(
      result.metadata.inputTokens,
      result.metadata.outputTokens
    );

    // Store in cache
    await cacheManager.set(cacheKey, result);

    // Return success response
    const response: APIResponse<SummarizeResponse> = {
      success: true,
      data: {
        ...result,
        metadata: {
          ...result.metadata,
          cached: false
        }
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      const response: APIResponse = {
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Request validation failed",
          details: error.errors.map(e => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Handle all other errors using centralized error handler
    const errorResponse = handleAPIError(error);
    return NextResponse.json(errorResponse, { status: errorResponse.status });
  }
}
