BEGIN;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT table_schema, table_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'clerk_user_id'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I RENAME COLUMN clerk_user_id TO auth_user_id',
      r.table_schema,
      r.table_name
    );
  END LOOP;

  FOR r IN
    SELECT table_schema, table_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'requested_by_clerk_user_id'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I RENAME COLUMN requested_by_clerk_user_id TO requested_by_auth_user_id',
      r.table_schema,
      r.table_name
    );
  END LOOP;

  FOR r IN
    SELECT table_schema, table_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'read_by_clerk_user_id'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I RENAME COLUMN read_by_clerk_user_id TO read_by_auth_user_id',
      r.table_schema,
      r.table_name
    );
  END LOOP;
END $$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT table_schema, table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name IN (
        'auth_user_id',
        'requested_by_auth_user_id',
        'read_by_auth_user_id',
        'created_by',
        'updated_by'
      )
      AND column_default IS NOT NULL
      AND (
        column_default ILIKE '%clerk_user_id%'
        OR column_default ILIKE '%get_clerk_user_id%'
        OR column_default ILIKE '%auth_user_id%'
      )
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ALTER COLUMN %I DROP DEFAULT',
      r.table_schema,
      r.table_name,
      r.column_name
    );
  END LOOP;
END $$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT table_schema, table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name IN ('auth_user_id', 'requested_by_auth_user_id', 'read_by_auth_user_id')
      AND udt_name <> 'uuid'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ALTER COLUMN %I TYPE uuid USING NULLIF(%I::text, '''')::uuid',
      r.table_schema,
      r.table_name,
      r.column_name,
      r.column_name
    );
  END LOOP;
END $$;

ALTER TABLE IF EXISTS public.profiles
  ALTER COLUMN email DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false;

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS phone varchar(20);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_key
  ON public.profiles (phone)
  WHERE phone IS NOT NULL;

ALTER TABLE IF EXISTS public.tenant_users
  ALTER COLUMN auth_user_id DROP NOT NULL,
  ALTER COLUMN email DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS phone varchar(20),
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS users_phone_key
  ON public.tenant_users (phone)
  WHERE phone IS NOT NULL;

DROP FUNCTION IF EXISTS public.clerk_user_id();
DROP FUNCTION IF EXISTS public.get_clerk_user_id();

DROP POLICY IF EXISTS pos_reorder_requests_insert_own ON public.pos_reorder_requests;
DROP POLICY IF EXISTS pos_reorder_requests_select_admin ON public.pos_reorder_requests;
DROP POLICY IF EXISTS pos_reorder_requests_select_own ON public.pos_reorder_requests;
DROP POLICY IF EXISTS pos_reorder_requests_update_admin ON public.pos_reorder_requests;

CREATE POLICY pos_reorder_requests_insert_own
  ON public.pos_reorder_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_user_id = auth.uid()
    AND requested_by_auth_user_id = auth.uid()
  );

CREATE POLICY pos_reorder_requests_select_own
  ON public.pos_reorder_requests
  FOR SELECT
  TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR requested_by_auth_user_id = auth.uid()
  );

CREATE POLICY pos_reorder_requests_update_own
  ON public.pos_reorder_requests
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

COMMIT;
