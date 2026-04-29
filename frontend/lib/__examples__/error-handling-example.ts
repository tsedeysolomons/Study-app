/**
 * Error Handling Infrastructure Examples
 * 
 * This file demonstrates practical usage of the error handling infrastructure.
 * These examples can be adapted for use in API routes and frontend components.
 */

import { APIError, ErrorCodes, handleAPIError, formatErrorForDisplay } from '../errors';
import { withRetry, fetchWithRetry, createRetryWrapper } from '../retry-handler';

// ============================================================================
// Example 1: Basic API Error Creation
// ============================================================================

export function example1_BasicAPIError() {
  console.log('\n=== Example 1: Basic API Error ===\n');
  
  try {
    // Simulate validation error
    const text = '';
    if (!text || text.trim().length === 0) {
      throw new APIError(ErrorCodes.INVALID_INPUT, 'Text cannot be empty');
    }
  } catch (error) {
    console.log('Error caught:', error);
    console.log('Error JSON:', (error as APIError).toJSON());
  }
}

// ============================================================================
// Example 2: API Error with Details
// ============================================================================

export function example2_APIErrorWithDetails() {
  console.log('\n=== Example 2: API Error with Details ===\n');
  
  try {
    // Simulate rate limit error
    throw new APIError(
      ErrorCodes.RATE_LIMIT_EXCEEDED,
      'Too many requests',
      { retryAfter: 60, requestsRemaining: 0 }
    );
  } catch (error) {
    const errorResponse = handleAPIError(error);
    console.log('Error response:', JSON.stringify(errorResponse, null, 2));
  }
}

// ============================================================================
// Example 3: Error Handler Middleware
// ============================================================================

export function example3_ErrorHandlerMiddleware() {
  console.log('\n=== Example 3: Error Handler Middleware ===\n');
  
  // Simulate different error types
  const errors = [
    new APIError(ErrorCodes.INVALID_INPUT, 'Invalid data'),
    new APIError(ErrorCodes.AI_TIMEOUT, 'Request timed out'),
    { name: 'ValidationError', errors: ['Field required'] },
    new Error('Unknown error'),
  ];
  
  errors.forEach((error, index) => {
    console.log(`\nError ${index + 1}:`);
    const response = handleAPIError(error);
    console.log(`  Status: ${response.status}`);
    console.log(`  Code: ${response.error.code}`);
    console.log(`  Message: ${response.error.message}`);
  });
}

// ============================================================================
// Example 4: Basic Retry Logic
// ============================================================================

export async function example4_BasicRetry() {
  console.log('\n=== Example 4: Basic Retry Logic ===\n');
  
  let attempts = 0;
  
  const unreliableOperation = async () => {
    attempts++;
    console.log(`Attempt ${attempts}`);
    
    if (attempts < 3) {
      throw new Error('Temporary failure');
    }
    
    return 'Success!';
  };
  
  try {
    const result = await withRetry(unreliableOperation, {
      maxRetries: 2,
      initialDelay: 100,
      onRetry: (attempt, error, delay) => {
        console.log(`  Retrying after ${delay}ms...`);
      }
    });
    
    console.log(`Result: ${result}`);
    console.log(`Total attempts: ${attempts}`);
  } catch (error) {
    console.log('Failed after all retries:', error);
  }
}

// ============================================================================
// Example 5: Exponential Backoff
// ============================================================================

export async function example5_ExponentialBackoff() {
  console.log('\n=== Example 5: Exponential Backoff ===\n');
  
  let attempts = 0;
  const delays: number[] = [];
  
  const operation = async () => {
    attempts++;
    throw new Error('Always fails');
  };
  
  try {
    await withRetry(operation, {
      maxRetries: 3,
      backoff: 'exponential',
      initialDelay: 100,
      maxDelay: 1000,
      onRetry: (attempt, error, delay) => {
        delays.push(delay);
        console.log(`Attempt ${attempt}: delay = ${Math.round(delay)}ms`);
      }
    });
  } catch (error) {
    console.log('\nBackoff pattern (exponential):');
    delays.forEach((delay, i) => {
      console.log(`  Retry ${i + 1}: ~${Math.round(delay)}ms`);
    });
  }
}

// ============================================================================
// Example 6: Non-Retryable Errors
// ============================================================================

export async function example6_NonRetryableErrors() {
  console.log('\n=== Example 6: Non-Retryable Errors ===\n');
  
  let attempts = 0;
  
  const operation = async () => {
    attempts++;
    console.log(`Attempt ${attempts}`);
    throw new APIError(ErrorCodes.INVALID_INPUT, 'Invalid input');
  };
  
  try {
    await withRetry(operation, { maxRetries: 3 });
  } catch (error) {
    console.log(`Failed immediately (no retries for INVALID_INPUT)`);
    console.log(`Total attempts: ${attempts}`);
  }
}

// ============================================================================
// Example 7: Custom Retry Logic
// ============================================================================

export async function example7_CustomRetryLogic() {
  console.log('\n=== Example 7: Custom Retry Logic ===\n');
  
  let attempts = 0;
  
  const operation = async () => {
    attempts++;
    const error: any = new Error('Custom error');
    error.code = attempts < 2 ? 'RETRYABLE' : 'FATAL';
    throw error;
  };
  
  try {
    await withRetry(operation, {
      maxRetries: 3,
      shouldRetry: (error) => {
        const shouldRetry = error.code === 'RETRYABLE';
        console.log(`Error code: ${error.code}, shouldRetry: ${shouldRetry}`);
        return shouldRetry;
      }
    });
  } catch (error: any) {
    console.log(`Stopped retrying on: ${error.code}`);
  }
}

// ============================================================================
// Example 8: Retry Wrapper
// ============================================================================

export async function example8_RetryWrapper() {
  console.log('\n=== Example 8: Retry Wrapper ===\n');
  
  // Create a reusable wrapper
  let callCount = 0;
  
  const riskyOperation = async (input: string) => {
    callCount++;
    console.log(`Call ${callCount} with input: "${input}"`);
    
    if (callCount < 2) {
      throw new Error('Temporary failure');
    }
    
    return `Processed: ${input}`;
  };
  
  const safeOperation = createRetryWrapper(riskyOperation, {
    maxRetries: 2,
    initialDelay: 100
  });
  
  try {
    const result = await safeOperation('test data');
    console.log(`Result: ${result}`);
  } catch (error) {
    console.log('Failed:', error);
  }
}

// ============================================================================
// Example 9: Error Formatting for Display
// ============================================================================

export function example9_ErrorFormatting() {
  console.log('\n=== Example 9: Error Formatting for Display ===\n');
  
  const errors = [
    {
      error: {
        code: ErrorCodes.RATE_LIMIT_EXCEEDED,
        message: 'Too many requests',
        retryAfter: 120
      }
    },
    {
      error: {
        code: ErrorCodes.TOKEN_LIMIT_EXCEEDED,
        message: 'Text too long'
      }
    },
    {
      error: {
        code: ErrorCodes.AI_TIMEOUT,
        message: 'Timeout'
      }
    },
    {
      error: {
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Not authenticated'
      }
    }
  ];
  
  errors.forEach((error, index) => {
    const formatted = formatErrorForDisplay(error);
    console.log(`\nError ${index + 1}:`);
    console.log(`  Title: ${formatted.title}`);
    console.log(`  Description: ${formatted.description}`);
  });
}

// ============================================================================
// Example 10: Complete API Route Pattern
// ============================================================================

export async function example10_APIRoutePattern() {
  console.log('\n=== Example 10: Complete API Route Pattern ===\n');
  
  // Simulated API route handler
  const handleRequest = async (body: any) => {
    try {
      // 1. Validate input
      if (!body.text || body.text.trim().length === 0) {
        throw new APIError(
          ErrorCodes.INVALID_INPUT,
          'Text is required'
        );
      }
      
      // 2. Check token limit
      const tokenCount = body.text.length / 4; // Rough estimate
      if (tokenCount > 4000) {
        throw new APIError(
          ErrorCodes.TOKEN_LIMIT_EXCEEDED,
          'Text exceeds maximum token limit',
          { maxTokens: 4000, actualTokens: Math.ceil(tokenCount) }
        );
      }
      
      // 3. Process with retry
      const result = await withRetry(
        async () => {
          // Simulate AI service call
          console.log('  Calling AI service...');
          return {
            summary: 'This is a summary',
            keyPoints: ['Point 1', 'Point 2']
          };
        },
        {
          maxRetries: 1,
          initialDelay: 100
        }
      );
      
      // 4. Return success response
      return {
        success: true,
        data: result,
        status: 200
      };
      
    } catch (error) {
      // 5. Handle errors
      const errorResponse = handleAPIError(error);
      return errorResponse;
    }
  };
  
  // Test with valid input
  console.log('Test 1: Valid input');
  const result1 = await handleRequest({ text: 'Some valid text' });
  console.log('Response:', JSON.stringify(result1, null, 2));
  
  // Test with invalid input
  console.log('\nTest 2: Invalid input (empty)');
  const result2 = await handleRequest({ text: '' });
  console.log('Response:', JSON.stringify(result2, null, 2));
  
  // Test with token limit exceeded
  console.log('\nTest 3: Token limit exceeded');
  const longText = 'x'.repeat(20000);
  const result3 = await handleRequest({ text: longText });
  console.log('Response:', JSON.stringify(result3, null, 2));
}

// ============================================================================
// Run All Examples
// ============================================================================

export async function runAllExamples() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Error Handling Infrastructure Examples                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  example1_BasicAPIError();
  example2_APIErrorWithDetails();
  example3_ErrorHandlerMiddleware();
  await example4_BasicRetry();
  await example5_ExponentialBackoff();
  await example6_NonRetryableErrors();
  await example7_CustomRetryLogic();
  await example8_RetryWrapper();
  example9_ErrorFormatting();
  await example10_APIRoutePattern();
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  All examples completed!                                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

// Uncomment to run examples:
// runAllExamples().catch(console.error);
