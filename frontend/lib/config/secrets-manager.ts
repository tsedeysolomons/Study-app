/**
 * SecretsManager - Secure credential handling for sensitive configuration
 * 
 * This class provides secure storage and retrieval of sensitive credentials
 * like API keys, JWT secrets, and database URLs. It ensures:
 * - Credentials are never exposed in logs or error messages
 * - Validation of credential format and strength
 * - Masked display for debugging purposes
 * - Runtime-only access (never persisted to disk)
 */

export interface SecretMetadata {
  name: string;
  required: boolean;
  minLength?: number;
  pattern?: RegExp;
  description?: string;
}

export interface SecretValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * SecretsManager class for handling sensitive credentials
 */
export class SecretsManager {
  private secrets: Map<string, string>;
  private metadata: Map<string, SecretMetadata>;

  constructor() {
    this.secrets = new Map();
    this.metadata = new Map();
  }

  /**
   * Register a secret with its metadata
   */
  registerSecret(name: string, metadata: SecretMetadata): void {
    this.metadata.set(name, metadata);
  }

  /**
   * Store a secret value securely
   */
  setSecret(name: string, value: string | undefined): void {
    if (value !== undefined && value !== null && value !== "") {
      this.secrets.set(name, value);
    }
  }

  /**
   * Retrieve a secret value
   * @throws Error if secret is required but not found
   */
  getSecret(name: string): string | undefined {
    const value = this.secrets.get(name);
    const meta = this.metadata.get(name);

    if (!value && meta?.required) {
      throw new Error(
        `Required secret '${name}' is not configured. ` +
        (meta.description ? `Description: ${meta.description}` : "")
      );
    }

    return value;
  }

  /**
   * Check if a secret exists
   */
  hasSecret(name: string): boolean {
    return this.secrets.has(name);
  }

  /**
   * Validate a specific secret against its metadata
   */
  validateSecret(name: string): SecretValidationResult {
    const result: SecretValidationResult = {
      valid: true,
      errors: [],
    };

    const meta = this.metadata.get(name);
    if (!meta) {
      result.valid = false;
      result.errors.push(`Secret '${name}' is not registered`);
      return result;
    }

    const value = this.secrets.get(name);

    // Check if required secret is missing
    if (meta.required && !value) {
      result.valid = false;
      result.errors.push(
        `Required secret '${name}' is missing. ` +
        (meta.description ? `Description: ${meta.description}` : "")
      );
      return result;
    }

    // Skip further validation if secret is optional and not provided
    if (!value) {
      return result;
    }

    // Validate minimum length
    if (meta.minLength && value.length < meta.minLength) {
      result.valid = false;
      result.errors.push(
        `Secret '${name}' must be at least ${meta.minLength} characters long`
      );
    }

    // Validate pattern
    if (meta.pattern && !meta.pattern.test(value)) {
      result.valid = false;
      result.errors.push(
        `Secret '${name}' does not match required format`
      );
    }

    return result;
  }

  /**
   * Validate all registered secrets
   */
  validateAll(): SecretValidationResult {
    const result: SecretValidationResult = {
      valid: true,
      errors: [],
    };

    for (const [name] of this.metadata) {
      const secretResult = this.validateSecret(name);
      if (!secretResult.valid) {
        result.valid = false;
        result.errors.push(...secretResult.errors);
      }
    }

    return result;
  }

  /**
   * Get a masked version of a secret for safe logging
   * Shows only the last 4 characters
   */
  getMaskedSecret(name: string): string {
    const value = this.secrets.get(name);
    if (!value) {
      return "<not set>";
    }

    if (value.length <= 4) {
      return "***";
    }

    return "***" + value.slice(-4);
  }

  /**
   * Get all secrets in masked form for safe logging
   */
  getMaskedSecrets(): Record<string, string> {
    const masked: Record<string, string> = {};
    
    for (const [name] of this.metadata) {
      masked[name] = this.getMaskedSecret(name);
    }

    return masked;
  }

  /**
   * Clear all secrets from memory
   * Useful for cleanup or testing
   */
  clear(): void {
    this.secrets.clear();
  }

  /**
   * Get count of stored secrets
   */
  getSecretCount(): number {
    return this.secrets.size;
  }

  /**
   * Check if all required secrets are present
   */
  hasAllRequiredSecrets(): boolean {
    for (const [name, meta] of this.metadata) {
      if (meta.required && !this.secrets.has(name)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get list of missing required secrets
   */
  getMissingRequiredSecrets(): string[] {
    const missing: string[] = [];
    
    for (const [name, meta] of this.metadata) {
      if (meta.required && !this.secrets.has(name)) {
        missing.push(name);
      }
    }

    return missing;
  }

  /**
   * Create a safe configuration object with masked secrets
   * Useful for logging configuration on startup
   */
  createSafeConfig(config: any): any {
    const safeConfig = JSON.parse(JSON.stringify(config));

    // Mask AI API key
    if (safeConfig.ai?.apiKey) {
      safeConfig.ai.apiKey = this.getMaskedSecret("AI_API_KEY");
    }

    // Mask database URL
    if (safeConfig.storage?.databaseUrl) {
      safeConfig.storage.databaseUrl = this.getMaskedSecret("DATABASE_URL");
    }

    // Mask JWT secret
    if (safeConfig.auth?.jwtSecret) {
      safeConfig.auth.jwtSecret = this.getMaskedSecret("JWT_SECRET");
    }

    // Mask Sentry DSN
    if (safeConfig.monitoring?.sentryDsn) {
      safeConfig.monitoring.sentryDsn = this.getMaskedSecret("SENTRY_DSN");
    }

    return safeConfig;
  }
}

/**
 * Initialize SecretsManager with standard application secrets
 */
export function initializeSecretsManager(env: NodeJS.ProcessEnv): SecretsManager {
  const manager = new SecretsManager();

  // Register AI API Key
  manager.registerSecret("AI_API_KEY", {
    name: "AI_API_KEY",
    required: false, // Optional because AI features might not be used immediately
    minLength: 20,
    description: "API key for OpenAI or Anthropic AI service",
  });

  // Register Database URL
  manager.registerSecret("DATABASE_URL", {
    name: "DATABASE_URL",
    required: false, // Required only when STORAGE_MODE=database
    pattern: /^(postgres|postgresql|mongodb|mysql):\/\/.+/,
    description: "Database connection URL (required when STORAGE_MODE=database)",
  });

  // Register JWT Secret
  manager.registerSecret("JWT_SECRET", {
    name: "JWT_SECRET",
    required: false, // Required only when AUTH_REQUIRED=true
    minLength: 32,
    description: "Secret key for JWT token signing (required when AUTH_REQUIRED=true)",
  });

  // Register Sentry DSN (optional)
  manager.registerSecret("SENTRY_DSN", {
    name: "SENTRY_DSN",
    required: false,
    pattern: /^https:\/\/.+@.+\.ingest\.sentry\.io\/.+/,
    description: "Sentry DSN for error tracking (optional)",
  });

  // Store secrets from environment
  manager.setSecret("AI_API_KEY", env.AI_API_KEY);
  manager.setSecret("DATABASE_URL", env.DATABASE_URL);
  manager.setSecret("JWT_SECRET", env.JWT_SECRET);
  manager.setSecret("SENTRY_DSN", env.SENTRY_DSN);

  return manager;
}

/**
 * Validate secrets based on configuration requirements
 * Performs conditional validation based on storage mode and auth settings
 */
export function validateSecretsForConfig(
  manager: SecretsManager,
  config: { storage: { mode: string }; auth: { required: boolean } }
): SecretValidationResult {
  const result: SecretValidationResult = {
    valid: true,
    errors: [],
  };

  // Validate DATABASE_URL if database mode is enabled
  if (config.storage.mode === "database") {
    if (!manager.hasSecret("DATABASE_URL")) {
      result.valid = false;
      result.errors.push(
        "DATABASE_URL is required when STORAGE_MODE is 'database'"
      );
    } else {
      const dbValidation = manager.validateSecret("DATABASE_URL");
      if (!dbValidation.valid) {
        result.valid = false;
        result.errors.push(...dbValidation.errors);
      }
    }
  }

  // Validate JWT_SECRET if authentication is required
  if (config.auth.required) {
    if (!manager.hasSecret("JWT_SECRET")) {
      result.valid = false;
      result.errors.push(
        "JWT_SECRET is required when AUTH_REQUIRED is true"
      );
    } else {
      const jwtValidation = manager.validateSecret("JWT_SECRET");
      if (!jwtValidation.valid) {
        result.valid = false;
        result.errors.push(...jwtValidation.errors);
      }
    }
  }

  // Validate AI_API_KEY if AI provider is configured
  if (manager.hasSecret("AI_API_KEY")) {
    const aiValidation = manager.validateSecret("AI_API_KEY");
    if (!aiValidation.valid) {
      result.valid = false;
      result.errors.push(...aiValidation.errors);
    }
  }

  // Validate SENTRY_DSN if provided
  if (manager.hasSecret("SENTRY_DSN")) {
    const sentryValidation = manager.validateSecret("SENTRY_DSN");
    if (!sentryValidation.valid) {
      result.valid = false;
      result.errors.push(...sentryValidation.errors);
    }
  }

  return result;
}
