/**
 * Storage Adapter Interface
 * 
 * Defines the contract for storage implementations
 * Requirements: 8.4
 */

export interface CacheStorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
  size(): Promise<number>;
}

export interface RateLimitStorageAdapter {
  getLimit(identifier: string): Promise<RateLimitData | null>;
  setLimit(identifier: string, data: RateLimitData): Promise<void>;
  deleteLimit(identifier: string): Promise<void>;
  cleanup(): Promise<number>;
}

export interface RateLimitData {
  identifier: string;
  requests: number[];
  windowStart: number;
  windowEnd: number;
}

export interface SessionData {
  id: string;
  duration: number;
  notes: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  userId?: string;
}

export interface NotesData {
  content: string;
  lastModified: string;
  userId?: string;
}

export interface PreferencesData {
  notifications: {
    enabled: boolean;
    studyReminders: boolean;
    sessionComplete: boolean;
    dailySummary: boolean;
    breakInterval: number;
  };
  analytics: {
    enabled: boolean;
    consentGiven: boolean;
    consentDate: string | null;
  };
  theme: 'light' | 'dark' | 'system';
  userId?: string;
}

export interface AnalyticsEventData {
  type: string;
  timestamp: string;
  sessionId: string;
  metadata?: Record<string, any>;
  userId?: string;
}

/**
 * Main storage adapter interface for all data types
 */
export interface StorageAdapter {
  // Session management
  getSessions(userId?: string, startDate?: Date, endDate?: Date): Promise<SessionData[]>;
  getSession(id: string): Promise<SessionData | null>;
  saveSession(session: Omit<SessionData, 'id' | 'createdAt'>): Promise<SessionData>;
  deleteSession(id: string): Promise<boolean>;

  // Notes management
  getNotes(userId?: string): Promise<NotesData | null>;
  saveNotes(notes: NotesData): Promise<NotesData>;

  // Preferences management
  getPreferences(userId?: string): Promise<PreferencesData | null>;
  savePreferences(preferences: PreferencesData): Promise<PreferencesData>;

  // Analytics
  saveAnalyticsEvents(events: AnalyticsEventData[]): Promise<void>;
  getAnalyticsEvents(userId?: string | null, startDate?: Date, endDate?: Date): Promise<AnalyticsEventData[]>;
  deleteAnalyticsData(userId: string): Promise<number>;

  // Cache operations
  getCacheEntry<T>(key: string): Promise<T | null>;
  setCacheEntry<T>(key: string, value: T, ttl: number): Promise<void>;
  deleteCacheEntry(key: string): Promise<boolean>;

  // Rate limit operations
  getRateLimit(identifier: string): Promise<RateLimitData | null>;
  setRateLimit(identifier: string, data: RateLimitData): Promise<void>;
  deleteRateLimit(identifier: string): Promise<void>;
}
