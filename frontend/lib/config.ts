import { z } from "zod";
import {
  configSchema,
  parseRawConfig,
  validateConfiguration,
  formatValidationErrors,
  formatValidationWarnings,
  type AppConfig,
  type ValidationResult,
} from "./config/env-schema";
import {
  SecretsManager,
  initializeSecretsManager,
  validateSecretsForConfig,
} from "./config/secrets-manager";

/**
 * Parse and validate configuration from environment variables
 * Includes secrets management and comprehensive validation
 */
function parseConfig(): AppConfig {
  // Initialize secrets manager
  const secretsManager = initializeSecretsManager(process.env);

  // Parse raw configuration
  const rawConfig = parseRawConfig(process.env);

  // Validate configuration schema
  const validationResult = validateConfiguration(rawConfig);

  if (!validationResult.valid) {
    console.error(formatValidationErrors(validationResult.errors));
    throw new Error("Invalid configuration. Please check your environment variables.");
  }

  // Parse with Zod to get typed config
  const config = configSchema.parse(rawConfig);

  // Validate secrets based on configuration requirements
  const secretsValidation = validateSecretsForConfig(secretsManager, config);

  if (!secretsValidation.valid) {
    console.error("Secrets validation failed:");
    secretsValidation.errors.forEach((err) => {
      console.error(`  - ${err}`);
    });
    throw new Error("Invalid secrets configuration. Please check your environment variables.");
  }

  // Display warnings if any
  if (validationResult.warnings.length > 0) {
    console.warn(formatValidationWarnings(validationResult.warnings));
  }

  // Store secrets manager in config for later use
  (config as any)._secretsManager = secretsManager;

  return config;
}

/**
 * Log configuration on startup (masking sensitive values)
 */
function logConfig(config: AppConfig): void {
  const secretsManager = (config as any)._secretsManager as SecretsManager;
  const safeConfig = secretsManager.createSafeConfig(config);

  console.log("Application Configuration:");
  console.log(JSON.stringify(safeConfig, null, 2));
  
  // Log secrets status
  console.log("\nSecrets Status:");
  const maskedSecrets = secretsManager.getMaskedSecrets();
  Object.entries(maskedSecrets).forEach(([name, value]) => {
    console.log(`  ${name}: ${value}`);
  });
}

// Singleton configuration instance
let configInstance: AppConfig | null = null;

/**
 * Get the application configuration
 * Parses and validates on first call, returns cached instance on subsequent calls
 */
export function getConfig(): AppConfig {
  if (!configInstance) {
    configInstance = parseConfig();
    
    // Log configuration in development
    if (configInstance.nodeEnv === "development") {
      logConfig(configInstance);
    }
  }

  return configInstance;
}

/**
 * Validate configuration without throwing
 * Useful for pre-deployment checks
 */
export function validateConfig(): ValidationResult {
  try {
    const rawConfig = parseRawConfig(process.env);
    const validationResult = validateConfiguration(rawConfig);
    
    if (!validationResult.valid) {
      return validationResult;
    }

    // Additional secrets validation
    const secretsManager = initializeSecretsManager(process.env);
    const config = configSchema.parse(rawConfig);
    const secretsValidation = validateSecretsForConfig(secretsManager, config);

    if (!secretsValidation.valid) {
      return {
        valid: false,
        errors: secretsValidation.errors,
        warnings: validationResult.warnings,
      };
    }

    return validationResult;
  } catch (error) {
    if (error instanceof Error) {
      return { valid: false, errors: [error.message], warnings: [] };
    }
    return { valid: false, errors: ["Unknown configuration error"], warnings: [] };
  }
}

/**
 * Reset configuration instance (useful for testing)
 */
export function resetConfig(): void {
  configInstance = null;
}

/**
 * Get the secrets manager from the current configuration
 * Useful for accessing secrets in a secure way
 */
export function getSecretsManager(): SecretsManager {
  const config = getConfig();
  return (config as any)._secretsManager as SecretsManager;
}

/**
 * Export types and utilities for external use
 */
export type { AppConfig, ValidationResult };
export { SecretsManager } from "./config/secrets-manager";
