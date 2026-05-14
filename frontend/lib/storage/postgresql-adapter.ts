import { Pool, PoolClient } from "pg";
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
 * PostgreSQL storage adapter for production
 * Stores all data in PostgreSQL database
 * **Validates: Requirements 8.3, 8.6, 8.7, 8.8**
 */
export class PostgreSQLStorageAdapter implements IStorageAdapter {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 10, // connection pool size
    });
  }

  /**
   * Initialize database schema
   * Creates tables if they don't exist
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Study sessions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS study_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(255),
          subject VARCHAR(255) NOT NULL,
          duration INTEGER NOT NULL,
          start_time BIGINT NOT NULL,
          end_time BIGINT NOT NULL,
          notes TEXT,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL,
          created_at_idx TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_created_at (created_at)
        );
      `);

      // Notes table
      await client.query(`
        CREATE TABLE IF NOT EXISTS notes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(255),
          title VARCHAR(500) NOT NULL,
          content TEXT NOT NULL,
          subject VARCHAR(255),
          tags TEXT[],
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL,
          created_at_idx TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_created_at (created_at)
        );
      `);

      // User preferences table
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_preferences (
          user_id VARCHAR(255) PRIMARY KEY,
          theme VARCHAR(50) NOT NULL DEFAULT 'system',
          notifications_enabled BOOLEAN NOT NULL DEFAULT true,
          language VARCHAR(10) NOT NULL DEFAULT 'en',
          study_goal_minutes INTEGER NOT NULL DEFAULT 60,
          default_ai_provider VARCHAR(50) NOT NULL DEFAULT 'openai',
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL
        );
      `);

      // Analytics events table
      await client.query(`
        CREATE TABLE IF NOT EXISTS analytics_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(255),
          event_type VARCHAR(255) NOT NULL,
          event_data JSONB,
          timestamp BIGINT NOT NULL,
          created_at_idx TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_event_type (event_type),
          INDEX idx_timestamp (timestamp)
        );
      `);

      console.log("Database schema initialized successfully");
    } finally {
      client.release();
    }
  }

  /**
   * Helper to build WHERE clause from filters
   */
  private buildWhereClause(
    filters?: FilterOptions,
    tablePrefix?: string,
  ): { clause: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    const prefix = tablePrefix ? `${tablePrefix}.` : "";

    if (filters?.startDate) {
      conditions.push(`${prefix}created_at >= $${paramIndex}`);
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters?.endDate) {
      conditions.push(`${prefix}updated_at <= $${paramIndex}`);
      params.push(filters.endDate);
      paramIndex++;
    }

    if (filters?.subject) {
      conditions.push(`${prefix}subject = $${paramIndex}`);
      params.push(filters.subject);
      paramIndex++;
    }

    if (filters?.userId) {
      conditions.push(`${prefix}user_id = $${paramIndex}`);
      params.push(filters.userId);
      paramIndex++;
    }

    return {
      clause: conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "",
      params,
    };
  }

  /**
   * Create study session
   * **Validates: 8.2, 8.6**
   */
  async createSession(session: StudySession): Promise<StudySession> {
    const id = session.id || uuidv4();
    const now = Date.now();

    const query = `
      INSERT INTO study_sessions 
      (id, user_id, subject, duration, start_time, end_time, notes, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;

    const result = await this.pool.query(query, [
      id,
      session.userId || null,
      session.subject,
      session.duration,
      session.startTime,
      session.endTime,
      session.notes || null,
      now,
      now,
    ]);

    return this.mapSessionRow(result.rows[0]);
  }

  /**
   * Get session by ID
   */
  async getSession(id: string): Promise<StudySession | null> {
    const query = "SELECT * FROM study_sessions WHERE id = $1;";
    const result = await this.pool.query(query, [id]);
    return result.rows[0] ? this.mapSessionRow(result.rows[0]) : null;
  }

  /**
   * Update session
   */
  async updateSession(
    id: string,
    updates: Partial<StudySession>,
  ): Promise<StudySession> {
    const now = Date.now();
    const fields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.subject) {
      fields.push(`subject = $${paramIndex}`);
      params.push(updates.subject);
      paramIndex++;
    }
    if (updates.duration) {
      fields.push(`duration = $${paramIndex}`);
      params.push(updates.duration);
      paramIndex++;
    }
    if (updates.notes) {
      fields.push(`notes = $${paramIndex}`);
      params.push(updates.notes);
      paramIndex++;
    }

    fields.push(`updated_at = $${paramIndex}`);
    params.push(now);
    paramIndex++;

    params.push(id);

    const query = `
      UPDATE study_sessions 
      SET ${fields.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *;
    `;

    const result = await this.pool.query(query, params);
    if (result.rows.length === 0) {
      throw new Error(`Session ${id} not found`);
    }

    return this.mapSessionRow(result.rows[0]);
  }

  /**
   * Delete session
   */
  async deleteSession(id: string): Promise<boolean> {
    const query = "DELETE FROM study_sessions WHERE id = $1;";
    const result = await this.pool.query(query, [id]);
    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * List sessions with filtering and pagination
   * **Validates: 8.6**
   */
  async listSessions(
    filters?: FilterOptions,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<StudySession>> {
    const { clause, params } = this.buildWhereClause(filters);
    const limit = pagination?.limit || 10;
    const page = pagination?.page || 1;
    const offset = (page - 1) * limit;

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM study_sessions ${clause};`;
    const countResult = await this.pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated data
    const dataQuery = `
      SELECT * FROM study_sessions 
      ${clause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;

    const dataResult = await this.pool.query(dataQuery, [
      ...params,
      limit,
      offset,
    ]);

    return {
      items: dataResult.rows.map((row) => this.mapSessionRow(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Create note
   * **Validates: 8.2, 8.7**
   */
  async createNote(note: Note): Promise<Note> {
    const id = note.id || uuidv4();
    const now = Date.now();

    const query = `
      INSERT INTO notes 
      (id, user_id, title, content, subject, tags, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;

    const result = await this.pool.query(query, [
      id,
      note.userId || null,
      note.title,
      note.content,
      note.subject || null,
      note.tags || [],
      now,
      now,
    ]);

    return this.mapNoteRow(result.rows[0]);
  }

  /**
   * Get note by ID
   */
  async getNote(id: string): Promise<Note | null> {
    const query = "SELECT * FROM notes WHERE id = $1;";
    const result = await this.pool.query(query, [id]);
    return result.rows[0] ? this.mapNoteRow(result.rows[0]) : null;
  }

  /**
   * Update note
   */
  async updateNote(id: string, updates: Partial<Note>): Promise<Note> {
    const now = Date.now();
    const fields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.title) {
      fields.push(`title = $${paramIndex}`);
      params.push(updates.title);
      paramIndex++;
    }
    if (updates.content) {
      fields.push(`content = $${paramIndex}`);
      params.push(updates.content);
      paramIndex++;
    }
    if (updates.subject) {
      fields.push(`subject = $${paramIndex}`);
      params.push(updates.subject);
      paramIndex++;
    }
    if (updates.tags) {
      fields.push(`tags = $${paramIndex}`);
      params.push(updates.tags);
      paramIndex++;
    }

    fields.push(`updated_at = $${paramIndex}`);
    params.push(now);
    paramIndex++;

    params.push(id);

    const query = `
      UPDATE notes 
      SET ${fields.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *;
    `;

    const result = await this.pool.query(query, params);
    if (result.rows.length === 0) {
      throw new Error(`Note ${id} not found`);
    }

    return this.mapNoteRow(result.rows[0]);
  }

  /**
   * Delete note
   */
  async deleteNote(id: string): Promise<boolean> {
    const query = "DELETE FROM notes WHERE id = $1;";
    const result = await this.pool.query(query, [id]);
    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * List notes with filtering and pagination
   * **Validates: 8.7**
   */
  async listNotes(
    filters?: FilterOptions,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Note>> {
    const { clause, params } = this.buildWhereClause(filters);
    const limit = pagination?.limit || 10;
    const page = pagination?.page || 1;
    const offset = (page - 1) * limit;

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM notes ${clause};`;
    const countResult = await this.pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated data
    const dataQuery = `
      SELECT * FROM notes 
      ${clause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;

    const dataResult = await this.pool.query(dataQuery, [
      ...params,
      limit,
      offset,
    ]);

    return {
      items: dataResult.rows.map((row) => this.mapNoteRow(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get user preferences
   * **Validates: 9.6, 10.7**
   */
  async getPreferences(userId: string): Promise<UserPreferences | null> {
    const query = "SELECT * FROM user_preferences WHERE user_id = $1;";
    const result = await this.pool.query(query, [userId]);
    return result.rows[0] ? this.mapPreferencesRow(result.rows[0]) : null;
  }

  /**
   * Upsert user preferences
   * **Validates: 9.6, 10.7**
   */
  async upsertPreferences(
    preferences: UserPreferences,
  ): Promise<UserPreferences> {
    const now = Date.now();

    const query = `
      INSERT INTO user_preferences 
      (user_id, theme, notifications_enabled, language, study_goal_minutes, default_ai_provider, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id) DO UPDATE SET
        theme = $2,
        notifications_enabled = $3,
        language = $4,
        study_goal_minutes = $5,
        default_ai_provider = $6,
        updated_at = $8
      RETURNING *;
    `;

    const result = await this.pool.query(query, [
      preferences.userId,
      preferences.theme,
      preferences.notificationsEnabled,
      preferences.language,
      preferences.studyGoalMinutes,
      preferences.defaultAIProvider,
      preferences.createdAt || now,
      now,
    ]);

    return this.mapPreferencesRow(result.rows[0]);
  }

  /**
   * Record analytics event
   */
  async recordEvent(event: AnalyticsEvent): Promise<AnalyticsEvent> {
    const id = event.id || uuidv4();

    const query = `
      INSERT INTO analytics_events 
      (id, user_id, event_type, event_data, timestamp)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const result = await this.pool.query(query, [
      id,
      event.userId || null,
      event.eventType,
      JSON.stringify(event.eventData || {}),
      event.timestamp,
    ]);

    return this.mapEventRow(result.rows[0]);
  }

  /**
   * Get analytics events with filtering and pagination
   */
  async getEvents(
    filters?: FilterOptions,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<AnalyticsEvent>> {
    const { clause, params } = this.buildWhereClause(filters);
    const limit = pagination?.limit || 10;
    const page = pagination?.page || 1;
    const offset = (page - 1) * limit;

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM analytics_events ${clause};`;
    const countResult = await this.pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated data
    const dataQuery = `
      SELECT * FROM analytics_events 
      ${clause}
      ORDER BY timestamp DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;

    const dataResult = await this.pool.query(dataQuery, [
      ...params,
      limit,
      offset,
    ]);

    return {
      items: dataResult.rows.map((row) => this.mapEventRow(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Health check - verify database connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.pool.query("SELECT 1;");
      return result.rows.length > 0;
    } catch (error) {
      console.error("Database health check failed:", error);
      return false;
    }
  }

  /**
   * Close connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Map database row to StudySession
   */
  private mapSessionRow(row: any): StudySession {
    return {
      id: row.id,
      userId: row.user_id,
      subject: row.subject,
      duration: row.duration,
      startTime: row.start_time,
      endTime: row.end_time,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Map database row to Note
   */
  private mapNoteRow(row: any): Note {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      content: row.content,
      subject: row.subject,
      tags: row.tags || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Map database row to UserPreferences
   */
  private mapPreferencesRow(row: any): UserPreferences {
    return {
      userId: row.user_id,
      theme: row.theme,
      notificationsEnabled: row.notifications_enabled,
      language: row.language,
      studyGoalMinutes: row.study_goal_minutes,
      defaultAIProvider: row.default_ai_provider,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Map database row to AnalyticsEvent
   */
  private mapEventRow(row: any): AnalyticsEvent {
    return {
      id: row.id,
      userId: row.user_id,
      eventType: row.event_type,
      eventData:
        typeof row.event_data === "string"
          ? JSON.parse(row.event_data)
          : row.event_data || {},
      timestamp: row.timestamp,
    };
  }
}
