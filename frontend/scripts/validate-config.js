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
 *   node scripts/validate-config.js
 * 
 * Exit codes:
 *   0 - Configuration is valid
 *   1 - Configuration has errors
 */

// Load environment variables from .env.local if it exists
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

async function main() {
  console.log("=".repeat(70));
  console.log("Configuration Validation");
  console.log("=".repeat(70));
  console.log();

  try {
    // Dynamic import for ESM module
    const { validateConfig } = await import('../lib/config.js');
    const { formatValidationErrors, formatValidationWarnings } = await import('../lib/config/env-schema.js');

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
  } catch (error) {
    console.error("❌ Unexpected error during validation:");
    console.error(error);
    process.exit(1);
  }
}

// Run validation
main();
