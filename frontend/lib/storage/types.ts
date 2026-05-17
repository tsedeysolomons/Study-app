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
/**
 * Study Session data type
 */
export interface StudySession {
  id: string;
  userId?: string;
  subject: string;
  duration: number; // minutes
  startTime: number; // timestamp
  endTime: number; // timestamp
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Note data type
 */
export interface Note {
  id: string;
  userId?: string;
  title: string;
  content: string;
  subject?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

/**
 * User Preferences data type
 */
export interface UserPreferences {
  userId: string;
  theme: "light" | "dark" | "system";
  notificationsEnabled: boolean;
  language: string;
  studyGoalMinutes: number;
  defaultAIProvider: "openai" | "anthropic";
  createdAt: number;
  updatedAt: number;
}

/**
 * Analytics Event data type
 */
export interface AnalyticsEvent {
  id: string;
  userId?: string;
  eventType: string;
  eventData: Record<string, any>;
  timestamp: number;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Filter options for queries
 */
export interface FilterOptions {
  startDate?: number;
  endDate?: number;
  subject?: string;
  userId?: string;
}

/**
 * Query result with pagination
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Storage Adapter interface for data persistence
 * Supports both in-memory and database backends
 * **Validates: Requirement 8.4**
 */
export interface IStorageAdapter {
  // Session operations
  createSession(session: StudySession): Promise<StudySession>;
  getSession(id: string): Promise<StudySession | null>;
  updateSession(
    id: string,
    updates: Partial<StudySession>,
  ): Promise<StudySession>;
  deleteSession(id: string): Promise<boolean>;
  listSessions(
    filters?: FilterOptions,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<StudySession>>;

  // Note operations
  createNote(note: Note): Promise<Note>;
  getNote(id: string): Promise<Note | null>;
  updateNote(id: string, updates: Partial<Note>): Promise<Note>;
  deleteNote(id: string): Promise<boolean>;
  listNotes(
    filters?: FilterOptions,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Note>>;

  // Preferences operations
  getPreferences(userId: string): Promise<UserPreferences | null>;
  upsertPreferences(preferences: UserPreferences): Promise<UserPreferences>;

  // Analytics operations
  recordEvent(event: AnalyticsEvent): Promise<AnalyticsEvent>;
  getEvents(
    filters?: FilterOptions,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<AnalyticsEvent>>;

  // Health check
  healthCheck(): Promise<boolean>;
}
