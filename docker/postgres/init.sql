-- init.sql - Initial PostgreSQL setup for KeyJay Online v2
-- This script runs on first container initialization

-- Create extensions commonly used by Directus
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'KeyJay Online v2 database initialized at %', NOW();
END
$$;
