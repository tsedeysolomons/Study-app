import { v4 as uuidv4 } from "uuid";
import type {
  IStorageAdapter,
  StudySession,
  Note,
  UserPreferences,
  AnalyticsEvent,
  PaginationOptions,
  FilterOptions,
  PaginatedResult,
} from "./types";

/**
 * In-memory storage adapter for development
 * Stores all data in memory - data is lost on server restart
 * **Validates: Requirements 8.4, 7.7**
 */
export class InMemoryStorageAdapter implements IStorageAdapter {
  private sessions: Map<string, StudySession> = new Map();
  private notes: Map<string, Note> = new Map();
  private preferences: Map<string, UserPreferences> = new Map();
  private events: Map<string, AnalyticsEvent> = new Map();

  /**
   * Apply pagination to array
   */
  private paginate<T>(
    items: T[],
    options?: PaginationOptions,
  ): PaginatedResult<T> {
    const limit = options?.limit || 10;
    const page = options?.page || 1;
    const offset = options?.offset || (page - 1) * limit;

    const paginatedItems = items.slice(offset, offset + limit);
    const totalPages = Math.ceil(items.length / limit);

    return {
      items: paginatedItems,
      total: items.length,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Filter sessions by criteria
   */
  private filterSessions(
    sessions: StudySession[],
    filters?: FilterOptions,
  ): StudySession[] {
    return sessions.filter((session) => {
      if (filters?.startDate && session.startTime < filters.startDate)
        return false;
      if (filters?.endDate && session.endTime > filters.endDate) return false;
      if (filters?.subject && session.subject !== filters.subject) return false;
      if (filters?.userId && session.userId !== filters.userId) return false;
      return true;
    });
  }

  /**
   * Filter notes by criteria
   */
  private filterNotes(notes: Note[], filters?: FilterOptions): Note[] {
    return notes.filter((note) => {
      if (filters?.startDate && note.createdAt < filters.startDate)
        return false;
      if (filters?.endDate && note.updatedAt > filters.endDate) return false;
      if (filters?.subject && note.subject !== filters.subject) return false;
      if (filters?.userId && note.userId !== filters.userId) return false;
      return true;
    });
  }

  /**
   * Create study session
   * **Validates: 8.2, 8.6**
   */
  async createSession(session: StudySession): Promise<StudySession> {
    const id = session.id || uuidv4();
    const now = Date.now();
    const newSession: StudySession = {
      ...session,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.set(id, newSession);
    return newSession;
  }

  /**
   * Get session by ID
   */
  async getSession(id: string): Promise<StudySession | null> {
    return this.sessions.get(id) || null;
  }

  /**
   * Update session
   */
  async updateSession(
    id: string,
    updates: Partial<StudySession>,
  ): Promise<StudySession> {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`Session ${id} not found`);
    }
    const updated: StudySession = {
      ...session,
      ...updates,
      id,
      createdAt: session.createdAt,
      updatedAt: Date.now(),
    };
    this.sessions.set(id, updated);
    return updated;
  }

  /**
   * Delete session
   */
  async deleteSession(id: string): Promise<boolean> {
    return this.sessions.delete(id);
  }

  /**
   * List sessions with filtering and pagination
   * **Validates: 8.6**
   */
  async listSessions(
    filters?: FilterOptions,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<StudySession>> {
    let sessions = Array.from(this.sessions.values());
    sessions = this.filterSessions(sessions, filters);
    sessions.sort((a, b) => b.createdAt - a.createdAt);
    return this.paginate(sessions, pagination);
  }

  /**
   * Create note
   * **Validates: 8.2, 8.7**
   */
  async createNote(note: Note): Promise<Note> {
    const id = note.id || uuidv4();
    const now = Date.now();
    const newNote: Note = {
      ...note,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.notes.set(id, newNote);
    return newNote;
  }

  /**
   * Get note by ID
   */
  async getNote(id: string): Promise<Note | null> {
    return this.notes.get(id) || null;
  }

  /**
   * Update note
   */
  async updateNote(id: string, updates: Partial<Note>): Promise<Note> {
    const note = this.notes.get(id);
    if (!note) {
      throw new Error(`Note ${id} not found`);
    }
    const updated: Note = {
      ...note,
      ...updates,
      id,
      createdAt: note.createdAt,
      updatedAt: Date.now(),
    };
    this.notes.set(id, updated);
    return updated;
  }

  /**
   * Delete note
   */
  async deleteNote(id: string): Promise<boolean> {
    return this.notes.delete(id);
  }

  /**
   * List notes with filtering and pagination
   * **Validates: 8.7**
   */
  async listNotes(
    filters?: FilterOptions,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Note>> {
    let notes = Array.from(this.notes.values());
    notes = this.filterNotes(notes, filters);
    notes.sort((a, b) => b.createdAt - a.createdAt);
    return this.paginate(notes, pagination);
  }

  /**
   * Get user preferences
   * **Validates: 9.6, 10.7**
   */
  async getPreferences(userId: string): Promise<UserPreferences | null> {
    return this.preferences.get(userId) || null;
  }

  /**
   * Upsert (create or update) user preferences
   * **Validates: 9.6, 10.7**
   */
  async upsertPreferences(
    preferences: UserPreferences,
  ): Promise<UserPreferences> {
    const now = Date.now();
    const prefs: UserPreferences = {
      ...preferences,
      updatedAt: now,
      createdAt: preferences.createdAt || now,
    };
    this.preferences.set(preferences.userId, prefs);
    return prefs;
  }

  /**
   * Record analytics event
   */
  async recordEvent(event: AnalyticsEvent): Promise<AnalyticsEvent> {
    const id = event.id || uuidv4();
    const newEvent: AnalyticsEvent = {
      ...event,
      id,
    };
    this.events.set(id, newEvent);
    return newEvent;
  }

  /**
   * Get analytics events with filtering and pagination
   */
  async getEvents(
    filters?: FilterOptions,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<AnalyticsEvent>> {
    let events = Array.from(this.events.values());

    // Filter by userId and time range
    if (filters?.userId) {
      events = events.filter((e) => e.userId === filters.userId);
    }
    if (filters?.startDate) {
      events = events.filter((e) => e.timestamp >= filters.startDate!);
    }
    if (filters?.endDate) {
      events = events.filter((e) => e.timestamp <= filters.endDate!);
    }

    events.sort((a, b) => b.timestamp - a.timestamp);
    return this.paginate(events, pagination);
  }

  /**
   * Health check - always passes for in-memory storage
   */
  async healthCheck(): Promise<boolean> {
    return true;
  }

  /**
   * Clear all data (for testing)
   */
  async clear(): Promise<void> {
    this.sessions.clear();
    this.notes.clear();
    this.preferences.clear();
    this.events.clear();
  }

  /**
   * Get storage statistics
   */
  getStats(): {
    sessions: number;
    notes: number;
    preferences: number;
    events: number;
  } {
    return {
      sessions: this.sessions.size,
      notes: this.notes.size,
      preferences: this.preferences.size,
      events: this.events.size,
    };
  }
}
