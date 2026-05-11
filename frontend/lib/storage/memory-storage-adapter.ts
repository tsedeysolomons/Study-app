/**
 * In-Memory Storage Adapter
 * 
 * Implements storage adapter interface using in-memory storage
 * Suitable for development and testing
 * Requirements: 7.7, 8.4
 */

import type {
  StorageAdapter,
  SessionData,
  NotesData,
  PreferencesData,
  AnalyticsEventData,
  RateLimitData,
} from './types';

export class MemoryStorageAdapter implements StorageAdapter {
  private sessions: Map<string, SessionData> = new Map();
  private notes: Map<string, NotesData> = new Map();
  private preferences: Map<string, PreferencesData> = new Map();
  private analyticsEvents: AnalyticsEventData[] = [];
  private cache: Map<string, { value: any; expiresAt: number }> = new Map();
  private rateLimits: Map<string, RateLimitData> = new Map();

  // Session management
  async getSessions(
    userId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<SessionData[]> {
    let sessions = Array.from(this.sessions.values());

    if (userId) {
      sessions = sessions.filter((s) => s.userId === userId);
    }

    if (startDate) {
      sessions = sessions.filter(
        (s) => new Date(s.startTime) >= startDate
      );
    }

    if (endDate) {
      sessions = sessions.filter(
        (s) => new Date(s.endTime) <= endDate
      );
    }

    return sessions.sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }

  async getSession(id: string): Promise<SessionData | null> {
    return this.sessions.get(id) || null;
  }

  async saveSession(
    session: Omit<SessionData, 'id' | 'createdAt'>
  ): Promise<SessionData> {
    const newSession: SessionData = {
      ...session,
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };

    this.sessions.set(newSession.id, newSession);
    return newSession;
  }

  async deleteSession(id: string): Promise<boolean> {
    return this.sessions.delete(id);
  }

  // Notes management
  async getNotes(userId?: string): Promise<NotesData | null> {
    const key = userId || 'default';
    return this.notes.get(key) || null;
  }

  async saveNotes(notes: NotesData): Promise<NotesData> {
    const key = notes.userId || 'default';
    this.notes.set(key, notes);
    return notes;
  }

  // Preferences management
  async getPreferences(userId?: string): Promise<PreferencesData | null> {
    const key = userId || 'default';
    return this.preferences.get(key) || null;
  }

  async savePreferences(
    preferences: PreferencesData
  ): Promise<PreferencesData> {
    const key = preferences.userId || 'default';
    this.preferences.set(key, preferences);
    return preferences;
  }

  // Analytics
  async saveAnalyticsEvents(events: AnalyticsEventData[]): Promise<void> {
    this.analyticsEvents.push(...events);
  }

  async getAnalyticsEvents(
    userId?: string | null,
    startDate?: Date,
    endDate?: Date
  ): Promise<AnalyticsEventData[]> {
    let events = [...this.analyticsEvents];

    if (userId) {
      events = events.filter((e) => e.userId === userId);
    }

    if (startDate) {
      events = events.filter(
        (e) => new Date(e.timestamp) >= startDate
      );
    }

    if (endDate) {
      events = events.filter(
        (e) => new Date(e.timestamp) <= endDate
      );
    }

    return events;
  }

  async deleteAnalyticsData(userId: string): Promise<number> {
    const before = this.analyticsEvents.length;
    this.analyticsEvents = this.analyticsEvents.filter(
      (e) => e.userId !== userId
    );
    return before - this.analyticsEvents.length;
  }

  // Cache operations
  async getCacheEntry<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async setCacheEntry<T>(key: string, value: T, ttl: number): Promise<void> {
    const expiresAt = Date.now() + ttl * 1000;
    this.cache.set(key, { value, expiresAt });
  }

  async deleteCacheEntry(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  // Rate limit operations
  async getRateLimit(identifier: string): Promise<RateLimitData | null> {
    return this.rateLimits.get(identifier) || null;
  }

  async setRateLimit(
    identifier: string,
    data: RateLimitData
  ): Promise<void> {
    this.rateLimits.set(identifier, data);
  }

  async deleteRateLimit(identifier: string): Promise<void> {
    this.rateLimits.delete(identifier);
  }

  // Utility methods
  async clearAll(): Promise<void> {
    this.sessions.clear();
    this.notes.clear();
    this.preferences.clear();
    this.analyticsEvents = [];
    this.cache.clear();
    this.rateLimits.clear();
  }

  getStats() {
    return {
      sessions: this.sessions.size,
      notes: this.notes.size,
      preferences: this.preferences.size,
      analyticsEvents: this.analyticsEvents.length,
      cache: this.cache.size,
      rateLimits: this.rateLimits.size,
    };
  }
}
