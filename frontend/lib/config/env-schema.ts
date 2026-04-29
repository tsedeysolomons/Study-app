import { z } from "zod";

/**
 * Environment variable schema with comprehensive validation
 * Validates all configuration on application startup
 */

// Node Environment Schema
const nodeEnvSchema = z.enum(["development", "production", "test"]).default("development");

// AI Configuration Schema
const aiConfigSchema = z.object({
  provider: z.enum(["openai", "anthropic"]).optional(),
  apiKey: z.string().min(20, "AI API key must be at least 20 characters").optional(),
  model: z.string().optional(),
  maxInputTokens: z.number().int().positive().default(4000),
  maxOutputTokens: z.object({
    summary: z.number().int().positive().default(500),
    quiz: z.number().int().positive().default(1000),
  }),
  timeout: z.number().int().positive().default(15000), // milliseconds
});

// Storage Configuration Schema
const storageConfigSchema = z.object({
  mode: z.enum(["localStorage", "database"]).default("localStorage"),
  databaseUrl: z.string().url("Invalid database URL format").optional(),
});

// Authentication Configuration Schema
const authConfigSchema = z.object({
  required: z.boolean().default(false),
  jwtSecret: z.string().min(32, "JWT secret must be at least 32 characters").optional(),
  tokenExpiry: z.number().int().positive().default(86400), // 24 hours in seconds
});

// Rate Limiting Configuration Schema
const rateLimitConfigSchema = z.object({
  enabled: z.boolean().default(true),
  requestsPerHour: z.number().int().positive().default(20),
});

// Cache Configuration Schema
const cacheConfigSchema = z.object({
  enabled: z.boolean().default(true),
  ttl: z.number().int().positive().default(86400), // 24 hours in seconds
  maxEntries: z.number().int().positive().default(1000),
});

// Analytics Configuration Schema
const analyticsConfigSchema = z.object({
  vercelEnabled: z.boolean().default(true),
});

// CORS Configuration Schema
const corsConfigSchema = z.object({
  allowedOrigins: z.string().default("*"),
});

// Logging Configuration Schema
const loggingConfigSchema = z.object({
  level: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

// Monitoring Configuration Schema
const monitoringConfigSchema = z.object({
  sentryDsn: z.string().url("Invalid Sentry DSN URL format").optional(),
});

/**
 * Complete application configuration schema
 * Combines all sub-schemas with cross-field validation
 */
export const configSchema = z.object({
  nodeEnv: nodeEnvSchema,
  ai: aiConfigSchema,
  storage: storageConfigSchema,
  auth: authConfigSchema,
  rateLimit: rateLimitConfigSchema,
  cache: cacheConfigSchema,
  analytics: analyticsConfigSchema,
  cors: corsConfigSchema,
  logging: loggingConfigSchema,
  monitoring: monitoringConfigSchema,
}).refine(
  (config) => {
    // Validate: DATABASE_URL is required when STORAGE_MODE is 'database'
    if (config.storage.mode === "database" && !config.storage.databaseUrl) {
      return false;
    }
    return true;
  },
  {
    message: "DATABASE_URL is required when STORAGE_MODE is 'database'",
    path: ["storage", "databaseUrl"],
  }
).refine(
  (config) => {
    // Validate: JWT_SECRET is required when AUTH_REQUIRED is true
    if (config.auth.required && !config.auth.jwtSecret) {
      return false;
    }
    return true;
  },
  {
    message: "JWT_SECRET is required when AUTH_REQUIRED is true",
    path: ["auth", "jwtSecret"],
  }
).refine(
  (config) => {
    // Validate: AI provider and API key should be configured together
    if (config.ai.provider && !config.ai.apiKey) {
      return false;
    }
    return true;
  },
  {
    message: "AI_API_KEY is required when AI_PROVIDER is specified",
    path: ["ai", "apiKey"],
  }
);

/**
 * Inferred TypeScript type from the configuration schema
 */
export type AppConfig = z.infer<typeof configSchema>;

/**
 * Validation result type for configuration checks
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Parse raw environment variables into typed configuration object
 */
export function parseRawConfig(env: NodeJS.ProcessEnv): Record<string, any> {
  return {
    nodeEnv: env.NODE_ENV || "development",
    ai: {
      provider: env.AI_PROVIDER as "openai" | "anthropic" | undefined,
      apiKey: env.AI_API_KEY,
      model: env.AI_MODEL,
      maxInputTokens: parseInt(env.AI_MAX_INPUT_TOKENS || "4000", 10),
      maxOutputTokens: {
        summary: parseInt(env.AI_MAX_OUTPUT_TOKENS_SUMMARY || "500", 10),
        quiz: parseInt(env.AI_MAX_OUTPUT_TOKENS_QUIZ || "1000", 10),
      },
      timeout: parseInt(env.AI_REQUEST_TIMEOUT || "15000", 10),
    },
    storage: {
      mode: (env.STORAGE_MODE || "localStorage") as "localStorage" | "database",
      databaseUrl: env.DATABASE_URL,
    },
    auth: {
      required: env.AUTH_REQUIRED === "true",
      jwtSecret: env.JWT_SECRET,
      tokenExpiry: parseInt(env.JWT_EXPIRY || "86400", 10),
    },
    rateLimit: {
      enabled: env.RATE_LIMIT_ENABLED !== "false",
      requestsPerHour: parseInt(env.RATE_LIMIT_REQUESTS_PER_HOUR || "20", 10),
    },
    cache: {
      enabled: env.CACHE_ENABLED !== "false",
      ttl: parseInt(env.CACHE_TTL || "86400", 10),
      maxEntries: parseInt(env.CACHE_MAX_ENTRIES || "1000", 10),
    },
    analytics: {
      vercelEnabled: env.VERCEL_ANALYTICS_ENABLED !== "false",
    },
    cors: {
      allowedOrigins: env.ALLOWED_ORIGINS || "*",
    },
    logging: {
      level: (env.LOG_LEVEL || "info") as "debug" | "info" | "warn" | "error",
    },
    monitoring: {
      sentryDsn: env.SENTRY_DSN,
    },
  };
}

/**
 * Validate configuration and return detailed validation result
 */
export function validateConfiguration(rawConfig: Record<string, any>): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  try {
    configSchema.parse(rawConfig);

    // Additional warnings (non-blocking)
    if (rawConfig.storage.mode === "database" && !rawConfig.auth.required) {
      result.warnings.push(
        "Warning: Database mode is enabled but authentication is not required. " +
        "Consider enabling AUTH_REQUIRED for better security."
      );
    }

    if (rawConfig.nodeEnv === "production" && rawConfig.logging.level === "debug") {
      result.warnings.push(
        "Warning: Debug logging is enabled in production. " +
        "Consider using 'info' or 'warn' level for better performance."
      );
    }

    if (rawConfig.cors.allowedOrigins === "*" && rawConfig.nodeEnv === "production") {
      result.warnings.push(
        "Warning: CORS is configured to allow all origins in production. " +
        "Consider restricting to specific domains for better security."
      );
    }

  } catch (error) {
    result.valid = false;
    
    if (error instanceof z.ZodError) {
      result.errors = error.errors.map((err) => {
        const path = err.path.join(".");
        return `${path}: ${err.message}`;
      });
    } else if (error instanceof Error) {
      result.errors.push(error.message);
    } else {
      result.errors.push("Unknown configuration validation error");
    }
  }

  return result;
}

/**
 * Format validation errors for console output
 */
export function formatValidationErrors(errors: string[]): string {
  if (errors.length === 0) return "";
  
  return "Configuration validation failed:\n" + 
    errors.map(err => `  - ${err}`).join("\n");
}

/**
 * Format validation warnings for console output
 */
export function formatValidationWarnings(warnings: string[]): string {
  if (warnings.length === 0) return "";
  
  return "Configuration warnings:\n" + 
    warnings.map(warn => `  - ${warn}`).join("\n");
}
