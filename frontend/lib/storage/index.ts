/**
 * Storage module exports
 */

export * from './types';
export * from './memory-storage-adapter';

import { MemoryStorageAdapter } from './memory-storage-adapter';
import type { StorageAdapter } from './types';

/**
 * Get storage adapter instance based on configuration
 */
export function getStorageAdapter(): StorageAdapter {
  const storageMode = process.env.STORAGE_MODE || 'localStorage';

  // For now, always use memory storage adapter
  // Database adapter can be implemented later
  return new MemoryStorageAdapter();
}
