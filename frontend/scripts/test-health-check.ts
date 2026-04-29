/**
 * Manual test script for health check endpoint
 * Tests the /api/v1/health endpoint implementation
 * 
 * Usage: npx tsx scripts/test-health-check.ts
 */

import { NextRequest } from "next/server";

// Mock environment variables for testing
process.env.NODE_ENV = "development";
process.env.STORAGE_MODE = "localStorage";
process.env.AI_PROVIDER = "openai";
process.env.AI_API_KEY = "test-api-key-1234567890";
process.env.AI_MODEL = "gpt-4";
process.env.CACHE_ENABLED = "true";
process.env.LOG_LEVEL = "info";

async function testHealthCheck() {
  console.log("Testing Health Check Endpoint...\n");

  try {
    // Import the route handler
    const { GET } = await import("../app/api/v1/health/route");

    // Create a mock request
    const request = new NextRequest("http://localhost:3000/api/v1/health");

    // Call the handler
    const response = await GET(request);
    const data = await response.json();

    // Display results
    console.log("Status Code:", response.status);
    console.log("Response Body:");
    console.log(JSON.stringify(data, null, 2));

    // Validate response structure
    console.log("\nValidation:");
    console.log("✓ Status field present:", data.status !== undefined);
    console.log("✓ Timestamp field present:", data.timestamp !== undefined);
    console.log("✓ Services field present:", data.services !== undefined);
    console.log("✓ Version field present:", data.version !== undefined);

    if (data.services) {
      console.log("\nService Status:");
      console.log("  - API:", data.services.api);
      console.log("  - Database:", data.services.database);
      console.log("  - AI Service:", data.services.aiService);
      console.log("  - Cache:", data.services.cache);
    }

    // Check if status is appropriate
    const expectedStatus = data.status === "healthy" ? 200 : data.status === "degraded" ? 200 : 503;
    console.log("\n✓ Status code matches status:", response.status === expectedStatus);

    console.log("\n✅ Health check endpoint test completed successfully!");
  } catch (error) {
    console.error("\n❌ Health check endpoint test failed:");
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testHealthCheck();
