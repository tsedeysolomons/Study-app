import { describe, it, expect } from "@jest/globals";
import {
  parseRawConfig,
  validateConfiguration,
  formatValidationErrors,
  formatValidationWarnings,
  AppConfig,
} from "../config/env-schema";

describe("parseRawConfig", () => {
  it("should parse defaults when env variables are missing", () => {
    const env = {} as NodeJS.ProcessEnv;
    const config = parseRawConfig(env) as AppConfig;

    expect(config.nodeEnv).toBe("development");
    expect(config.ai.provider).toBeUndefined();
    expect(config.ai.apiKey).toBeUndefined();
    expect(config.ai.model).toBeUndefined();
    expect(config.ai.maxInputTokens).toBe(4000);
    expect(config.ai.maxOutputTokens.summary).toBe(500);
    expect(config.ai.maxOutputTokens.quiz).toBe(1000);
    expect(config.ai.timeout).toBe(15000);
    expect(config.storage.mode).toBe("localStorage");
    expect(config.auth.required).toBe(false);
    expect(config.auth.tokenExpiry).toBe(86400);
    expect(config.rateLimit.enabled).toBe(true);
    expect(config.rateLimit.requestsPerHour).toBe(20);
    expect(config.cache.enabled).toBe(true);
    expect(config.cache.ttl).toBe(86400);
    expect(config.cache.maxEntries).toBe(1000);
    expect(config.analytics.vercelEnabled).toBe(true);
    expect(config.cors.allowedOrigins).toBe("*");
    expect(config.logging.level).toBe("info");
  });

  it("should parse booleans and numbers correctly", () => {
    const env = {
      NODE_ENV: "production",
      AI_PROVIDER: "openai",
      AI_API_KEY: "super-secret-key-0000000000",
      AI_MODEL: "gpt-4",
      AI_MAX_INPUT_TOKENS: "1234",
      AI_MAX_OUTPUT_TOKENS_SUMMARY: "321",
      AI_MAX_OUTPUT_TOKENS_QUIZ: "654",
      AI_REQUEST_TIMEOUT: "20000",
      STORAGE_MODE: "database",
      DATABASE_URL: "https://example.com/db",
      AUTH_REQUIRED: "true",
      JWT_SECRET: "abcdefghijklmnopqrstuvwxyz123456",
      JWT_EXPIRY: "7200",
      RATE_LIMIT_ENABLED: "false",
      RATE_LIMIT_REQUESTS_PER_HOUR: "10",
      CACHE_ENABLED: "false",
      CACHE_TTL: "3600",
      CACHE_MAX_ENTRIES: "50",
      VERCEL_ANALYTICS_ENABLED: "false",
      ALLOWED_ORIGINS: "https://example.com",
      LOG_LEVEL: "debug",
      SENTRY_DSN: "https://sentry.example.com/project-id",
    } as NodeJS.ProcessEnv;

    const config = parseRawConfig(env) as AppConfig;
    expect(config.nodeEnv).toBe("production");
    expect(config.ai.provider).toBe("openai");
    expect(config.ai.apiKey).toBe("super-secret-key-0000000000");
    expect(config.ai.model).toBe("gpt-4");
    expect(config.ai.maxInputTokens).toBe(1234);
    expect(config.ai.maxOutputTokens.summary).toBe(321);
    expect(config.ai.maxOutputTokens.quiz).toBe(654);
    expect(config.ai.timeout).toBe(20000);
    expect(config.storage.mode).toBe("database");
    expect(config.storage.databaseUrl).toBe("https://example.com/db");
    expect(config.auth.required).toBe(true);
    expect(config.auth.jwtSecret).toBe("abcdefghijklmnopqrstuvwxyz123456");
    expect(config.auth.tokenExpiry).toBe(7200);
    expect(config.rateLimit.enabled).toBe(false);
    expect(config.rateLimit.requestsPerHour).toBe(10);
    expect(config.cache.enabled).toBe(false);
    expect(config.cache.ttl).toBe(3600);
    expect(config.cache.maxEntries).toBe(50);
    expect(config.analytics.vercelEnabled).toBe(false);
    expect(config.cors.allowedOrigins).toBe("https://example.com");
    expect(config.logging.level).toBe("debug");
    expect(config.monitoring.sentryDsn).toBe("https://sentry.example.com/project-id");
  });
});

describe("validateConfiguration", () => {
  it("should validate a correct config without errors", () => {
    const config = parseRawConfig({
      STORAGE_MODE: "database",
      DATABASE_URL: "postgresql://localhost:5432/studyapp",
      AUTH_REQUIRED: "true",
      JWT_SECRET: "abcdefghijklmnopqrstuvwxyz123456",
      AI_PROVIDER: "openai",
      AI_API_KEY: "super-secret-key-0000000000",
    } as NodeJS.ProcessEnv);

    const result = validateConfiguration(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should flag missing database URL when database mode is enabled", () => {
    const config = parseRawConfig({
      STORAGE_MODE: "database",
      AUTH_REQUIRED: "false",
    } as NodeJS.ProcessEnv);

    const result = validateConfiguration(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      "storage.databaseUrl: DATABASE_URL is required when STORAGE_MODE is 'database'",
    ]);
  });

  it("should flag missing JWT_SECRET when auth is required", () => {
    const config = parseRawConfig({
      AUTH_REQUIRED: "true",
      STORAGE_MODE: "localStorage",
    } as NodeJS.ProcessEnv);

    const result = validateConfiguration(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      "auth.jwtSecret: JWT_SECRET is required when AUTH_REQUIRED is true",
    ]);
  });

  it("should flag missing AI_API_KEY when AI_PROVIDER is specified", () => {
    const config = parseRawConfig({
      AI_PROVIDER: "openai",
    } as NodeJS.ProcessEnv);

    const result = validateConfiguration(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      "ai.apiKey: AI_API_KEY is required when AI_PROVIDER is specified",
    ]);
  });

  it("should return warnings for database mode without auth", () => {
    const config = parseRawConfig({
      STORAGE_MODE: "database",
      DATABASE_URL: "postgresql://localhost:5432/studyapp",
      AUTH_REQUIRED: "false",
    } as NodeJS.ProcessEnv);

    const result = validateConfiguration(config);
    expect(result.valid).toBe(true);
    expect(result.warnings).toContain(
      "Warning: Database mode is enabled but authentication is not required. Consider enabling AUTH_REQUIRED for better security."
    );
  });

  it("should warn when production uses debug logging", () => {
    const config = parseRawConfig({
      NODE_ENV: "production",
      LOG_LEVEL: "debug",
      STORAGE_MODE: "localStorage",
    } as NodeJS.ProcessEnv);

    const result = validateConfiguration(config);
    expect(result.valid).toBe(true);
    expect(result.warnings).toContain(
      "Warning: Debug logging is enabled in production. Consider using 'info' or 'warn' level for better performance."
    );
  });

  it("should warn when production allows all CORS origins", () => {
    const config = parseRawConfig({
      NODE_ENV: "production",
      ALLOWED_ORIGINS: "*",
      STORAGE_MODE: "localStorage",
    } as NodeJS.ProcessEnv);

    const result = validateConfiguration(config);
    expect(result.valid).toBe(true);
    expect(result.warnings).toContain(
      "Warning: CORS is configured to allow all origins in production. Consider restricting to specific domains for better security."
    );
  });
});

describe("formatValidationErrors", () => {
  it("should return an empty string when there are no errors", () => {
    expect(formatValidationErrors([])).toBe("");
  });

  it("should format errors with bullets", () => {
    const output = formatValidationErrors([
      "auth.jwtSecret: JWT_SECRET is required when AUTH_REQUIRED is true",
      "storage.databaseUrl: DATABASE_URL is required when STORAGE_MODE is 'database'",
    ]);

    expect(output).toContain("Configuration validation failed:");
    expect(output).toContain("- auth.jwtSecret: JWT_SECRET is required when AUTH_REQUIRED is true");
    expect(output).toContain("- storage.databaseUrl: DATABASE_URL is required when STORAGE_MODE is 'database'");
  });
});

describe("formatValidationWarnings", () => {
  it("should return an empty string when there are no warnings", () => {
    expect(formatValidationWarnings([])).toBe("");
  });

  it("should format warnings with bullets", () => {
    const output = formatValidationWarnings([
      "Warning 1",
      "Warning 2",
    ]);

    expect(output).toContain("Configuration warnings:");
    expect(output).toContain("- Warning 1");
    expect(output).toContain("- Warning 2");
  });
});
