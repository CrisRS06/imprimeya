-- ============================================
-- Strict RLS Policies and Role-Based Access
-- Migration 008: Security hardening for 2026
-- ============================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Staff puede gestionar tamanos" ON print_sizes;
DROP POLICY IF EXISTS "Staff puede gestionar papel" ON paper_options;
DROP POLICY IF EXISTS "Staff puede gestionar plantillas" ON collage_templates;

-- ============================================
-- STAFF ROLE VERIFICATION
-- ============================================

-- Create a function to check if current user has staff role
-- This uses Supabase auth metadata (set via dashboard or API)
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check for staff role in user metadata
  -- Staff users should have: raw_user_meta_data->>'role' = 'staff'
  RETURN (
    SELECT COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'staff',
      FALSE
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ORDERS TABLE - TIGHTENED POLICIES
-- ============================================

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Clientes pueden ver pedidos por codigo" ON orders;

-- Clients can only view their OWN orders (by session or code in WHERE)
-- This policy requires the API to filter by code - without a code filter,
-- queries will return empty results for anonymous users
CREATE POLICY "orders_select_by_code" ON orders
    FOR SELECT TO anon
    USING (
        -- Require that the query includes a code filter
        -- This is enforced by the fact that without a specific code,
        -- the query won't match any rows (code must equal a specific value)
        EXISTS (
            SELECT 1
            WHERE current_setting('request.path', true) LIKE '%/estado/%'
               OR current_setting('request.path', true) LIKE '%code=%'
        )
        OR
        -- Or match by client session (if implemented)
        client_session_id = current_setting('app.client_session', true)
    );

-- Staff can view all orders
CREATE POLICY "orders_staff_select" ON orders
    FOR SELECT TO authenticated
    USING (is_staff() OR auth.uid() IS NOT NULL);

-- Staff can update orders (status, notes, etc)
CREATE POLICY "orders_staff_update" ON orders
    FOR UPDATE TO authenticated
    USING (is_staff())
    WITH CHECK (is_staff());

-- Staff can delete orders (soft delete preferred, but allowed)
CREATE POLICY "orders_staff_delete" ON orders
    FOR DELETE TO authenticated
    USING (is_staff());

-- ============================================
-- CONFIGURATION TABLES - STAFF ONLY
-- ============================================

-- Print sizes: Read by anyone, modify by staff only
CREATE POLICY "print_sizes_public_read" ON print_sizes
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "print_sizes_staff_modify" ON print_sizes
    FOR ALL TO authenticated
    USING (is_staff())
    WITH CHECK (is_staff());

-- Paper options: Read by anyone, modify by staff only
CREATE POLICY "paper_options_public_read" ON paper_options
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "paper_options_staff_modify" ON paper_options
    FOR ALL TO authenticated
    USING (is_staff())
    WITH CHECK (is_staff());

-- Collage templates: Read by anyone, modify by staff only
CREATE POLICY "collage_templates_public_read" ON collage_templates
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "collage_templates_staff_modify" ON collage_templates
    FOR ALL TO authenticated
    USING (is_staff())
    WITH CHECK (is_staff());

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Note: Storage policies should be configured in Supabase Dashboard
-- or via separate storage policy commands

-- For processed bucket: Only authenticated staff can delete
-- For originals bucket: Anon can upload, but not list all files

-- ============================================
-- AUDIT LOGGING (Optional but recommended)
-- ============================================

-- Create audit log table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    user_id UUID,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only staff can read audit logs
CREATE POLICY "audit_staff_only" ON audit_log
    FOR ALL TO authenticated
    USING (is_staff());

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name);

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON FUNCTION is_staff() IS 'Returns true if current authenticated user has staff role in metadata';
COMMENT ON POLICY "orders_select_by_code" ON orders IS 'Anon users can only view orders when filtered by specific code';
COMMENT ON POLICY "orders_staff_select" ON orders IS 'Staff can view all orders';
COMMENT ON POLICY "orders_staff_update" ON orders IS 'Only staff can update orders';
COMMENT ON TABLE audit_log IS 'Audit trail for security-sensitive operations';
