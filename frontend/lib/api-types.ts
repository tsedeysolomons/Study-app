/**
 * Core TypeScript interfaces for API requests and responses
 */

// ============================================================================
// API Response Types
// ============================================================================

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
}

export interface APIError {
  code: string;
  message: string;
  retryAfter?: number; // seconds
  details?: any;
}

// ============================================================================
// AI Service Types
// ============================================================================

export interface SummarizeRequest {
  text: string;
  options?: {
    maxKeyPoints?: number; // 3-7, default: 5
    temperature?: number; // 0-1, default: 0.3
  };
}

export interface SummarizeResponse {
  summary: string;
  keyPoints: string[];
  metadata: AIMetadata;
}

export interface QuizRequest {
  text: string;
  options?: {
    questionCount?: number; // 3-5, default: 4
    difficulty?: "easy" | "medium" | "hard"; // default: "medium"
    temperature?: number; // 0-1, default: 0.5
  };
}

export interface QuizResponse {
  questions: QuizQuestion[];
  metadata: AIMetadata;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: [string, string, string, string]; // exactly 4
  correctAnswer: number; // 0-3
  explanation: string;
}

export interface AIMetadata {
  inputTokens: number;
  outputTokens: number;
  model: string;
  cached: boolean;
  processingTime: number; // milliseconds
}

// ============================================================================
// Study Session Types
// ============================================================================

export interface CreateSessionRequest {
  duration: number; // seconds
  notes: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
}

export interface StudySession {
  id: string;
  duration: number;
  notes: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  userId?: string; // optional, for database mode
}

export interface GetSessionsResponse {
  sessions: StudySession[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// ============================================================================
// Notes Types
// ============================================================================

export interface SaveNotesRequest {
  content: string;
  lastModified: string; // ISO 8601
}

export interface Notes {
  content: string;
  lastModified: string;
  savedAt?: string;
  userId?: string; // optional, for database mode
}

// ============================================================================
// Analytics Types
// ============================================================================

export type EventType =
  | "note_saved"
  | "summary_generated"
  | "quiz_generated"
  | "quiz_completed"
  | "session_started"
  | "session_completed";

export interface AnalyticsEvent {
  type: EventType;
  timestamp: string; // ISO 8601
  sessionId: string;
  metadata?: Record<string, any>;
  userId?: string; // optional, for database mode
}

export interface SubmitEventsRequest {
  events: AnalyticsEvent[];
}

export interface SubmitEventsResponse {
  received: number;
  processed: number;
}

export interface AnalyticsSummary {
  totalStudyTime: number; // seconds
  sessionCount: number;
  averageSessionDuration: number; // seconds
  studyStreak: number; // consecutive days
  mostProductiveHour: number; // 0-23
  mostProductiveDay: string; // "Monday" etc.
  featureUsage: FeatureUsage;
  dailyBreakdown: DailyBreakdown[];
}

export interface FeatureUsage {
  summariesGenerated: number;
  quizzesGenerated: number;
  quizzesCompleted: number;
  notesSaved: number;
}

export interface DailyBreakdown {
  date: string; // ISO 8601 date
  studyTime: number; // seconds
  sessionCount: number;
}

// ============================================================================
// User Preferences Types
// ============================================================================

export interface UserPreferences {
  notifications: NotificationPreferences;
  analytics: AnalyticsPreferences;
  theme: "light" | "dark" | "system";
  userId?: string; // optional, for database mode
}

export interface NotificationPreferences {
  enabled: boolean;
  studyReminders: boolean;
  sessionComplete: boolean;
  dailySummary: boolean;
  breakInterval: number; // minutes
}

export interface AnalyticsPreferences {
  enabled: boolean;
  consentGiven: boolean;
  consentDate: string | null;
}

export interface UpdatePreferencesRequest {
  notifications?: Partial<NotificationPreferences>;
  analytics?: Partial<AnalyticsPreferences>;
  theme?: "light" | "dark" | "system";
}

// ============================================================================
// Authentication Types (Database Mode)
// ============================================================================

export interface RegisterRequest {
  email: string;
  password: string; // min 8 chars
  name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  token: string; // JWT
  expiresAt: string; // ISO 8601
}

export interface RefreshTokenRequest {
  token: string; // current JWT
}

export interface RefreshTokenResponse {
  token: string; // new JWT
  expiresAt: string; // ISO 8601
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ResetPasswordResponse {
  message: string;
  resetLinkSent: boolean;
}

// ============================================================================
// Health Check Types
// ============================================================================

export interface HealthCheckResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  services: {
    api: "up" | "down";
    database: "up" | "down" | "not_configured";
    aiService: "up" | "down" | "not_configured";
    cache: "up" | "down" | "not_configured";
  };
  version: string;
}

// ============================================================================
// Error Codes
// ============================================================================

export const ErrorCodes = {
  // Client Errors (4xx)
  INVALID_INPUT: "INVALID_INPUT",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  TOKEN_LIMIT_EXCEEDED: "TOKEN_LIMIT_EXCEEDED",

  // Server Errors (5xx)
  AI_SERVICE_ERROR: "AI_SERVICE_ERROR",
  AI_RATE_LIMIT: "AI_RATE_LIMIT",
  AI_TIMEOUT: "AI_TIMEOUT",
  INVALID_AI_RESPONSE: "INVALID_AI_RESPONSE",
  DATABASE_ERROR: "DATABASE_ERROR",
  CACHE_ERROR: "CACHE_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  TIMEOUT: "TIMEOUT",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
