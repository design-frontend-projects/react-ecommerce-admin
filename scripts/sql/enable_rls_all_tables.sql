-- ==============================================================================
-- enable_rls_all_tables.sql
-- Description: Dynamic script to enable Row Level Security (RLS) on all public tables
-- Compatible with: Supabase / PostgreSQL
-- ==============================================================================

-- 1. Dynamically enable Row Level Security (RLS) on all tables in the 'public' schema
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
          -- Exclude internal migration & system tables if necessary
          AND tablename NOT IN ('_prisma_migrations', 'schema_migrations')
    LOOP
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY;', tbl.schemaname, tbl.tablename);
        RAISE NOTICE 'Row Level Security enabled for: %.%', tbl.schemaname, tbl.tablename;
    END LOOP;
END $$;

-- ==============================================================================
-- 2. Verification Query
-- Run this query to inspect RLS status for all public tables
-- ==============================================================================
SELECT 
    schemaname,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename ASC;
