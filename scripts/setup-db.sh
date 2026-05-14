#!/bin/bash
# Database Setup Script for Study App
# This script creates the PostgreSQL database and initializes the schema

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-studyapp}"
DB_PASSWORD="${DB_PASSWORD}"

echo -e "${YELLOW}Study App Database Setup${NC}"
echo "================================="
echo "Database: $DB_NAME"
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo "User: $DB_USER"
echo ""

# Check if PostgreSQL is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL client (psql) not found. Please install PostgreSQL.${NC}"
    exit 1
fi

# Prompt for password if not provided
if [ -z "$DB_PASSWORD" ]; then
    read -sp "PostgreSQL Password for $DB_USER: " DB_PASSWORD
    echo ""
fi

# Export password for psql
export PGPASSWORD=$DB_PASSWORD

# Test connection to PostgreSQL server
echo -e "${YELLOW}Testing PostgreSQL connection...${NC}"
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${RED}❌ Failed to connect to PostgreSQL server.${NC}"
    echo "Please verify:"
    echo "  - PostgreSQL is running"
    echo "  - Host: $DB_HOST"
    echo "  - Port: $DB_PORT"
    echo "  - User: $DB_USER"
    echo "  - Password is correct"
    exit 1
fi
echo -e "${GREEN}✓ PostgreSQL connection successful${NC}"

# Check if database already exists
echo -e "${YELLOW}Checking if database exists...${NC}"
DB_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -tAc "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname='$DB_NAME')")

if [ "$DB_EXISTS" = "t" ]; then
    echo -e "${YELLOW}Database '$DB_NAME' already exists.${NC}"
    read -p "Do you want to drop and recreate it? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Dropping existing database...${NC}"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c "DROP DATABASE IF EXISTS $DB_NAME;"
        echo -e "${GREEN}✓ Database dropped${NC}"
    else
        echo -e "${GREEN}Keeping existing database${NC}"
        echo ""
        echo -e "${YELLOW}Setup complete! Database details:${NC}"
        echo "Connection string:"
        echo "  postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
        exit 0
    fi
else
    echo -e "${GREEN}✓ Database does not exist (will create new)${NC}"
fi

# Create database
echo -e "${YELLOW}Creating database...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c "CREATE DATABASE $DB_NAME;"
echo -e "${GREEN}✓ Database created${NC}"

# Create extensions
echo -e "${YELLOW}Creating extensions...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS uuid-ossp;"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\" SCHEMA public;"
echo -e "${GREEN}✓ Extensions created${NC}"

# Create tables
echo -e "${YELLOW}Creating tables...${NC}"

# Study Sessions table
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(100),
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_subject ON study_sessions(subject);
CREATE INDEX IF NOT EXISTS idx_study_sessions_created_at ON study_sessions(created_at);
"

# Notes table
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    subject VARCHAR(100),
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_subject ON notes(subject);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);
"

# User Preferences table
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL UNIQUE,
    theme VARCHAR(20) DEFAULT 'system',
    notifications_enabled BOOLEAN DEFAULT true,
    language VARCHAR(10) DEFAULT 'en',
    study_goal_minutes INTEGER DEFAULT 60,
    default_ai_provider VARCHAR(50) DEFAULT 'openai',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
"

# Analytics Events table
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255),
    event_type VARCHAR(100) NOT NULL,
    session_id UUID,
    event_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
"

echo -e "${GREEN}✓ Tables created${NC}"

# Verify tables
echo -e "${YELLOW}Verifying tables...${NC}"
TABLES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")
echo -e "${GREEN}✓ $TABLES tables created${NC}"

echo ""
echo -e "${GREEN}=================================${NC}"
echo -e "${GREEN}✓ Database setup complete!${NC}"
echo -e "${GREEN}=================================${NC}"
echo ""
echo -e "${YELLOW}Connection Details:${NC}"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""
echo -e "${YELLOW}Connection String:${NC}"
echo "  postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
echo ""
echo -e "${YELLOW}Update your .env.local:${NC}"
echo "  DATABASE_URL=postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Update DATABASE_URL in frontend/.env.local"
echo "  2. Set STORAGE_MODE=database in .env.local"
echo "  3. Start the application: pnpm dev"
echo ""
