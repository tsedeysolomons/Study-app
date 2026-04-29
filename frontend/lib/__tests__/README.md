# Error Handling Tests

This directory contains unit tests for the error handling infrastructure.

## Setup

To run these tests, you need to install Jest and its dependencies:

```bash
npm install --save-dev jest @jest/globals @types/jest ts-jest
```

## Jest Configuration

Create a `jest.config.js` file in the `frontend` directory:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/lib'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'lib/**/*.ts',
    '!lib/**/*.d.ts',
    '!lib/**/__tests__/**',
  ],
};
```

## Running Tests

Add the following script to `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

Then run:

```bash
npm test
```

## Test Coverage

The tests cover:

### errors.test.ts
- APIError class creation and serialization
- Error code definitions
- HTTP status code mapping
- Error categorization (temporary vs permanent)
- Error handler middleware
- Error formatting for display

### retry-handler.test.ts
- Basic retry functionality
- Exponential and linear backoff
- Retry limits
- Error categorization for retry logic
- Custom retry functions
- Fetch wrappers with retry
- Retry wrapper creation

## Manual Testing

If you want to test the error handling without Jest, you can create a simple test file:

```typescript
// test-errors.ts
import { APIError, ErrorCodes, handleAPIError } from './errors';

// Test APIError creation
const error = new APIError(ErrorCodes.INVALID_INPUT, 'Test error');
console.log('APIError:', error.toJSON());

// Test error handler
const result = handleAPIError(error);
console.log('Handler result:', result);
```

Run with:
```bash
npx tsx test-errors.ts
```
