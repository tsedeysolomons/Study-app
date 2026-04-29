/**
 * Configuration System Tests
 * 
 * These tests verify the configuration parser, validator, and secrets manager
 * work correctly with various environment variable configurations.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  parseRawConfig,
  validateConfiguration,
  configSchema,
} from '../env-schema';
import {
  SecretsManager,
  initializeSecretsManager,
  validateSecretsForConfig,
} from '../secrets-manager';

describe('Configuration System', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('parseRawConfig', () => {
    it('should parse environment variables with defaults', () => {
      const env = {
        NODE_ENV: 'development',
      };

      const config = parseRawConfig(env);

      expect(config.nodeEnv).toBe('development');
      expect(config.storage.mode).toBe('localStorage');
      expect(config.rateLimit.enabled).toBe(true);
      expect(config.cache.enabled).toBe(true);
    });

    it('should parse AI configuration', () => {
      const env = {
        AI_PROVIDER: 'openai',
        AI_API_KEY: 'sk-test1234567890abcdef',
        AI_MODEL: 'gpt-4',
        AI_MAX_INPUT_TOKENS: '5000',
      };

      const config = parseRawConfig(env);

      expect(config.ai.provider).toBe('openai');
      expect(config.ai.apiKey).toBe('sk-test1234567890abcdef');
      expect(config.ai.model).toBe('gpt-4');
      expect(config.ai.maxInputTokens).toBe(5000);
    });

    it('should parse boolean values correctly', () => {
      const env = {
        AUTH_REQUIRED: 'true',
        RATE_LIMIT_ENABLED: 'false',
        CACHE_ENABLED: 'false',
      };

      const config = parseRawConfig(env);

      expect(config.auth.required).toBe(true);
      expect(config.rateLimit.enabled).toBe(false);
      expect(config.cache.enabled).toBe(false);
    });
  });

  describe('validateConfiguration', () => {
    it('should validate valid configuration', () => {
      const config = {
        nodeEnv: 'development',
        ai: {
          provider: 'openai',
          apiKey: 'sk-test1234567890abcdef',
          model: 'gpt-4',
          maxInputTokens: 4000,
          maxOutputTokens: { summary: 500, quiz: 1000 },
          timeout: 15000,
        },
        storage: { mode: 'localStorage' },
        auth: { required: false, tokenExpiry: 86400 },
        rateLimit: { enabled: true, requestsPerHour: 20 },
        cache: { enabled: true, ttl: 86400, maxEntries: 1000 },
        analytics: { vercelEnabled: true },
        cors: { allowedOrigins: '*' },
        logging: { level: 'info' },
        monitoring: {},
      };

      const result = validateConfiguration(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when database mode lacks DATABASE_URL', () => {
      const config = {
        nodeEnv: 'development',
        ai: { maxInputTokens: 4000, maxOutputTokens: { summary: 500, quiz: 1000 }, timeout: 15000 },
        storage: { mode: 'database' }, // Missing databaseUrl
        auth: { required: false, tokenExpiry: 86400 },
        rateLimit: { enabled: true, requestsPerHour: 20 },
        cache: { enabled: true, ttl: 86400, maxEntries: 1000 },
        analytics: { vercelEnabled: true },
        cors: { allowedOrigins: '*' },
        logging: { level: 'info' },
        monitoring: {},
      };

      const result = validateConfiguration(config);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('DATABASE_URL'))).toBe(true);
    });

    it('should fail when auth required lacks JWT_SECRET', () => {
      const config = {
        nodeEnv: 'development',
        ai: { maxInputTokens: 4000, maxOutputTokens: { summary: 500, quiz: 1000 }, timeout: 15000 },
        storage: { mode: 'localStorage' },
        auth: { required: true, tokenExpiry: 86400 }, // Missing jwtSecret
        rateLimit: { enabled: true, requestsPerHour: 20 },
        cache: { enabled: true, ttl: 86400, maxEntries: 1000 },
        analytics: { vercelEnabled: true },
        cors: { allowedOrigins: '*' },
        logging: { level: 'info' },
        monitoring: {},
      };

      const result = validateConfiguration(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('JWT_SECRET'))).toBe(true);
    });

    it('should warn when database mode without auth', () => {
      const config = {
        nodeEnv: 'development',
        ai: { maxInputTokens: 4000, maxOutputTokens: { summary: 500, quiz: 1000 }, timeout: 15000 },
        storage: { mode: 'database', databaseUrl: 'postgresql://localhost/test' },
        auth: { required: false, tokenExpiry: 86400 },
        rateLimit: { enabled: true, requestsPerHour: 20 },
        cache: { enabled: true, ttl: 86400, maxEntries: 1000 },
        analytics: { vercelEnabled: true },
        cors: { allowedOrigins: '*' },
        logging: { level: 'info' },
        monitoring: {},
      };

      const result = validateConfiguration(config);

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('authentication'))).toBe(true);
    });
  });

  describe('SecretsManager', () => {
    it('should store and retrieve secrets', () => {
      const manager = new SecretsManager();
      
      manager.registerSecret('TEST_SECRET', {
        name: 'TEST_SECRET',
        required: true,
        minLength: 10,
      });

      manager.setSecret('TEST_SECRET', 'my-secret-value-123');

      expect(manager.hasSecret('TEST_SECRET')).toBe(true);
      expect(manager.getSecret('TEST_SECRET')).toBe('my-secret-value-123');
    });

    it('should mask secrets for safe logging', () => {
      const manager = new SecretsManager();
      
      manager.registerSecret('API_KEY', {
        name: 'API_KEY',
        required: false,
      });

      manager.setSecret('API_KEY', 'sk-1234567890abcdef');

      const masked = manager.getMaskedSecret('API_KEY');
      expect(masked).toBe('***cdef');
      expect(masked).not.toContain('1234567890');
    });

    it('should validate secret length', () => {
      const manager = new SecretsManager();
      
      manager.registerSecret('SHORT_SECRET', {
        name: 'SHORT_SECRET',
        required: true,
        minLength: 20,
      });

      manager.setSecret('SHORT_SECRET', 'short');

      const result = manager.validateSecret('SHORT_SECRET');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('20 characters'))).toBe(true);
    });

    it('should validate secret pattern', () => {
      const manager = new SecretsManager();
      
      manager.registerSecret('URL_SECRET', {
        name: 'URL_SECRET',
        required: true,
        pattern: /^https:\/\/.+/,
      });

      manager.setSecret('URL_SECRET', 'http://invalid.com');

      const result = manager.validateSecret('URL_SECRET');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('format'))).toBe(true);
    });

    it('should throw when required secret is missing', () => {
      const manager = new SecretsManager();
      
      manager.registerSecret('REQUIRED_SECRET', {
        name: 'REQUIRED_SECRET',
        required: true,
      });

      expect(() => manager.getSecret('REQUIRED_SECRET')).toThrow();
    });

    it('should return undefined for optional missing secret', () => {
      const manager = new SecretsManager();
      
      manager.registerSecret('OPTIONAL_SECRET', {
        name: 'OPTIONAL_SECRET',
        required: false,
      });

      expect(manager.getSecret('OPTIONAL_SECRET')).toBeUndefined();
    });

    it('should create safe config with masked secrets', () => {
      const manager = new SecretsManager();
      
      manager.registerSecret('AI_API_KEY', {
        name: 'AI_API_KEY',
        required: false,
      });

      manager.setSecret('AI_API_KEY', 'sk-1234567890abcdef');

      const config = {
        ai: {
          apiKey: 'sk-1234567890abcdef',
          provider: 'openai',
        },
      };

      const safeConfig = manager.createSafeConfig(config);

      expect(safeConfig.ai.apiKey).toBe('***cdef');
      expect(safeConfig.ai.provider).toBe('openai');
    });
  });

  describe('initializeSecretsManager', () => {
    it('should initialize with environment variables', () => {
      const env = {
        AI_API_KEY: 'sk-test1234567890abcdef',
        DATABASE_URL: 'postgresql://localhost/test',
        JWT_SECRET: 'my-super-secret-jwt-key-12345678',
      };

      const manager = initializeSecretsManager(env);

      expect(manager.hasSecret('AI_API_KEY')).toBe(true);
      expect(manager.hasSecret('DATABASE_URL')).toBe(true);
      expect(manager.hasSecret('JWT_SECRET')).toBe(true);
    });
  });

  describe('validateSecretsForConfig', () => {
    it('should validate secrets for database mode', () => {
      const manager = new SecretsManager();
      manager.registerSecret('DATABASE_URL', {
        name: 'DATABASE_URL',
        required: false,
        pattern: /^postgres/,
      });

      const config = {
        storage: { mode: 'database' },
        auth: { required: false },
      };

      const result = validateSecretsForConfig(manager, config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('DATABASE_URL'))).toBe(true);
    });

    it('should validate secrets for auth mode', () => {
      const manager = new SecretsManager();
      manager.registerSecret('JWT_SECRET', {
        name: 'JWT_SECRET',
        required: false,
        minLength: 32,
      });

      const config = {
        storage: { mode: 'localStorage' },
        auth: { required: true },
      };

      const result = validateSecretsForConfig(manager, config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('JWT_SECRET'))).toBe(true);
    });

    it('should pass when all required secrets are present', () => {
      const manager = new SecretsManager();
      
      manager.registerSecret('DATABASE_URL', {
        name: 'DATABASE_URL',
        required: false,
        pattern: /^postgres/,
      });
      manager.setSecret('DATABASE_URL', 'postgresql://localhost/test');

      manager.registerSecret('JWT_SECRET', {
        name: 'JWT_SECRET',
        required: false,
        minLength: 32,
      });
      manager.setSecret('JWT_SECRET', 'my-super-secret-jwt-key-12345678901234567890');

      const config = {
        storage: { mode: 'database' },
        auth: { required: true },
      };

      const result = validateSecretsForConfig(manager, config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
