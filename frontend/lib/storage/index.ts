import { InMemoryStorageAdapter } from "./in-memory-adapter";
import { PostgreSQLStorageAdapter } from "./postgresql-adapter";
import type { IStorageAdapter } from "./types";

/**
 * Storage factory for creating appropriate storage adapter
 * based on configuration
 */
export class StorageFactory {
  static async createAdapter(): Promise<IStorageAdapter> {
    const storageMode = process.env.STORAGE_MODE || "localStorage";
    const databaseUrl = process.env.DATABASE_URL;

    if (storageMode === "database") {
      if (!databaseUrl) {
        throw new Error(
          "DATABASE_URL environment variable is required when STORAGE_MODE=database",
        );
      }

      const adapter = new PostgreSQLStorageAdapter(databaseUrl);
      await adapter.initialize();
      return adapter;
    }

    // Default to in-memory storage for development
    return new InMemoryStorageAdapter();
  }
}

// Global storage adapter instance
let storageInstance: IStorageAdapter | null = null;

/**
 * Get or create global storage adapter instance
 */
export async function getStorageAdapter(): Promise<IStorageAdapter> {
  if (!storageInstance) {
    storageInstance = await StorageFactory.createAdapter();
  }
  return storageInstance;
}

/**
 * Reset storage instance (for testing)
 */
export function resetStorageInstance(): void {
  storageInstance = null;
}
