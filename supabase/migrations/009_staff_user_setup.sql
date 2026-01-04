-- =============================================
-- Staff User Setup for ImprimeYA
-- =============================================
-- This migration creates the necessary infrastructure for staff authentication.
-- After running this migration, create staff users through Supabase Dashboard
-- or using the SQL below.

-- =============================================
-- 1. Add staff tracking columns to orders table
-- =============================================

-- Add updated_by column to track who modified the order
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'updated_by'
    ) THEN
        ALTER TABLE orders ADD COLUMN updated_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Add cancelled_by column to track who cancelled the order
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'cancelled_by'
    ) THEN
        ALTER TABLE orders ADD COLUMN cancelled_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Add cancelled_at timestamp
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'cancelled_at'
    ) THEN
        ALTER TABLE orders ADD COLUMN cancelled_at TIMESTAMPTZ;
    END IF;
END $$;

-- =============================================
-- 2. Create staff_members table for role management
-- =============================================

CREATE TABLE IF NOT EXISTS staff_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'admin', 'manager')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_staff_members_user_id ON staff_members(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_active ON staff_members(is_active) WHERE is_active = true;

-- RLS for staff_members table
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can view staff members
CREATE POLICY IF NOT EXISTS "Staff can view staff list" ON staff_members
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff_members sm
            WHERE sm.user_id = auth.uid() AND sm.is_active = true
        )
    );

-- Only admins can insert/update staff members
CREATE POLICY IF NOT EXISTS "Admins can manage staff" ON staff_members
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff_members sm
            WHERE sm.user_id = auth.uid()
            AND sm.role = 'admin'
            AND sm.is_active = true
        )
    );

-- =============================================
-- 3. Function to check if user is staff
-- =============================================

CREATE OR REPLACE FUNCTION is_staff(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM staff_members
        WHERE staff_members.user_id = $1
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 4. Update orders RLS to allow staff access
-- =============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Staff can view all orders" ON orders;
DROP POLICY IF EXISTS "Staff can update orders" ON orders;

-- Staff can view all orders
CREATE POLICY "Staff can view all orders" ON orders
    FOR SELECT
    TO authenticated
    USING (
        is_staff(auth.uid())
    );

-- Staff can update orders
CREATE POLICY "Staff can update orders" ON orders
    FOR UPDATE
    TO authenticated
    USING (
        is_staff(auth.uid())
    )
    WITH CHECK (
        is_staff(auth.uid())
    );

-- =============================================
-- 5. Trigger to update updated_at on staff_members
-- =============================================

CREATE OR REPLACE FUNCTION update_staff_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_staff_members_updated_at ON staff_members;
CREATE TRIGGER trigger_staff_members_updated_at
    BEFORE UPDATE ON staff_members
    FOR EACH ROW
    EXECUTE FUNCTION update_staff_members_updated_at();

-- =============================================
-- INSTRUCTIONS FOR CREATING STAFF USERS
-- =============================================
--
-- Option 1: Via Supabase Dashboard
-- 1. Go to Authentication > Users
-- 2. Click "Add user" and create with email/password
-- 3. Run the SQL below to add them as staff
--
-- Option 2: Via SQL (after creating user in Dashboard)
-- Replace 'USER_UUID_HERE' with the actual user UUID from auth.users
--
-- INSERT INTO staff_members (user_id, role)
-- VALUES ('USER_UUID_HERE', 'staff');
--
-- Option 3: Create user with metadata (via Supabase Admin API)
-- The application also checks user_metadata.role = 'staff'
-- and user_metadata.is_staff = true
--
-- UPDATE auth.users
-- SET raw_user_meta_data = jsonb_set(
--     COALESCE(raw_user_meta_data, '{}'),
--     '{role}',
--     '"staff"'
-- )
-- WHERE id = 'USER_UUID_HERE';
-- =============================================
