#!/usr/bin/env node

/**
 * Configuration Validation Script
 * 
 * This script validates the application configuration before deployment.
 * It checks:
 * - All required environment variables are present
 * - Environment variables have valid formats
 * - Secrets meet security requirements
 * - Configuration is consistent (e.g., database mode requires auth)
 * 
 * Usage:
 *   npm run validate-config
 *   node scripts/validate-config.ts
 * 
 * Exit codes:
 *   0 - Configuration is valid
 *   1 - Configuration has errors
 */

import { validateConfig } from "../lib/config";
import {
  formatValidationErrors,
  formatValidationWarnings,
} from "../lib/config/env-schema";

function main() {
  console.log("=".repeat(70));
  console.log("Configuration Validation");
  console.log("=".repeat(70));
  console.log();

  const result = validateConfig();

  if (result.valid) {
    console.log("✅ Configuration is valid!");
    console.log();

    if (result.warnings.length > 0) {
      console.log(formatValidationWarnings(result.warnings));
      console.log();
    }

    console.log("All required environment variables are properly configured.");
    console.log("The application is ready to start.");
    process.exit(0);
  } else {
    console.log("❌ Configuration validation failed!");
    console.log();
    console.log(formatValidationErrors(result.errors));
    console.log();

    if (result.warnings.length > 0) {
      console.log(formatValidationWarnings(result.warnings));
      console.log();
    }

    console.log("Please fix the configuration errors before starting the application.");
    console.log("See .env.example for reference.");
    process.exit(1);
  }
}

// Run validation
try {
  main();
} catch (error) {
  console.error("❌ Unexpected error during validation:");
  console.error(error);
  process.exit(1);
}
