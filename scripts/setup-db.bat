@echo off
REM Database Setup Script for Study App (Windows)
REM This script creates the PostgreSQL database and initializes the schema

setlocal enabledelayedexpansion

REM Configuration
set DB_USER=postgres
set DB_HOST=localhost
set DB_PORT=5432
set DB_NAME=studyapp

echo.
echo ===================================
echo Study App Database Setup (Windows)
echo ===================================
echo Database: %DB_NAME%
echo Host: %DB_HOST%
echo Port: %DB_PORT%
echo User: %DB_USER%
echo.

REM Check if psql is available
where psql >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] PostgreSQL client (psql) not found.
    echo Please install PostgreSQL or add it to your PATH.
    pause
    exit /b 1
)

echo [INFO] Testing PostgreSQL connection...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -c "SELECT 1" >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Failed to connect to PostgreSQL server.
    echo Please verify:
    echo   - PostgreSQL is running
    echo   - Host: %DB_HOST%
    echo   - Port: %DB_PORT%
    echo   - User: %DB_USER%
    pause
    exit /b 1
)
echo [OK] PostgreSQL connection successful

REM Check if database already exists
echo [INFO] Checking if database exists...
for /f %%A in ('psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -tAc "SELECT CASE WHEN EXISTS(SELECT 1 FROM pg_database WHERE datname='%DB_NAME%') THEN 1 ELSE 0 END;"') do set DB_EXISTS=%%A

if "%DB_EXISTS%"=="1" (
    echo [WARNING] Database '%DB_NAME%' already exists.
    set /p RESPONSE="Do you want to drop and recreate it? (y/n): "
    if /i "!RESPONSE!"=="y" (
        echo [INFO] Dropping existing database...
        psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -c "DROP DATABASE IF EXISTS %DB_NAME%;"
        echo [OK] Database dropped
    ) else (
        echo [INFO] Keeping existing database
        echo.
        echo Connection string:
        echo   postgresql://%DB_USER%@%DB_HOST%:%DB_PORT%/%DB_NAME%
        echo.
        echo Update your .env.local with:
        echo   DATABASE_URL=postgresql://%DB_USER%@%DB_HOST%:%DB_PORT%/%DB_NAME%
        pause
        exit /b 0
    )
) else (
    echo [OK] Database does not exist - will create new
)

REM Create database
echo [INFO] Creating database...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -c "CREATE DATABASE %DB_NAME%;"
if %errorlevel% neq 0 (
    echo [ERROR] Failed to create database
    pause
    exit /b 1
)
echo [OK] Database created

REM Create extensions
echo [INFO] Creating extensions...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "CREATE EXTENSION IF NOT EXISTS uuid-ossp;"
if %errorlevel% neq 0 (
    echo [WARNING] Could not create uuid-ossp extension (may already exist or not available)
)
echo [OK] Extensions checked

REM Create Study Sessions table
echo [INFO] Creating tables...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "CREATE TABLE IF NOT EXISTS study_sessions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id VARCHAR(255) NOT NULL, title VARCHAR(255) NOT NULL, subject VARCHAR(100), duration_seconds INTEGER NOT NULL DEFAULT 0, notes TEXT, completed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP); CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id); CREATE INDEX IF NOT EXISTS idx_study_sessions_subject ON study_sessions(subject); CREATE INDEX IF NOT EXISTS idx_study_sessions_created_at ON study_sessions(created_at);"

REM Create Notes table
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "CREATE TABLE IF NOT EXISTS notes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id VARCHAR(255) NOT NULL, title VARCHAR(255) NOT NULL, content TEXT NOT NULL, subject VARCHAR(100), tags TEXT[] DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP); CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id); CREATE INDEX IF NOT EXISTS idx_notes_subject ON notes(subject); CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);"

REM Create User Preferences table
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "CREATE TABLE IF NOT EXISTS user_preferences (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id VARCHAR(255) NOT NULL UNIQUE, theme VARCHAR(20) DEFAULT 'system', notifications_enabled BOOLEAN DEFAULT true, language VARCHAR(10) DEFAULT 'en', study_goal_minutes INTEGER DEFAULT 60, default_ai_provider VARCHAR(50) DEFAULT 'openai', created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP); CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);"

REM Create Analytics Events table
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "CREATE TABLE IF NOT EXISTS analytics_events (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id VARCHAR(255), event_type VARCHAR(100) NOT NULL, session_id UUID, event_data JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP); CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id); CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type); CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);"

echo [OK] Tables created

REM Verify tables
echo [INFO] Verifying tables...
for /f %%A in ('psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';"') do set TABLE_COUNT=%%A

echo [OK] %TABLE_COUNT% tables created

echo.
echo ===================================
echo Database setup complete!
echo ===================================
echo.
echo Connection Details:
echo   Host: %DB_HOST%
echo   Port: %DB_PORT%
echo   Database: %DB_NAME%
echo   User: %DB_USER%
echo.
echo Connection String:
echo   postgresql://%DB_USER%@%DB_HOST%:%DB_PORT%/%DB_NAME%
echo.
echo Update your .env.local:
echo   DATABASE_URL=postgresql://%DB_USER%@%DB_HOST%:%DB_PORT%/%DB_NAME%
echo   STORAGE_MODE=database
echo.
echo Next steps:
echo   1. Open frontend\.env.local
echo   2. Update DATABASE_URL with the connection string above
echo   3. Set STORAGE_MODE=database
echo   4. Run: pnpm dev
echo.
pause
