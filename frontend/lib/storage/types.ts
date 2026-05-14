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
