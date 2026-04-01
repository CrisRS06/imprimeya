-- =============================================
-- Fix RLS Security - Migration 015
-- =============================================
-- This migration removes dangerously permissive RLS policies on the orders table
-- that were created in earlier migrations but never cleaned up.
--
-- PROBLEM 1: "Staff acceso completo a pedidos" (from 001) uses USING(true)
--   for ALL operations on authenticated role — any logged-in user has full CRUD.
--
-- PROBLEM 2: "orders_staff_select" (from 008) uses
--   is_staff() OR auth.uid() IS NOT NULL — any authenticated user can SELECT all.
--
-- PROBLEM 3: "orders_staff_update" and "orders_staff_delete" (from 008)
--   duplicate the 009 policies but use the weaker is_staff() (no-arg) function.
--
-- After this migration, only the 009 policies remain:
--   "Staff can view all orders" — SELECT using is_staff(auth.uid())
--   "Staff can update orders" — UPDATE using is_staff(auth.uid())
-- Plus anon policies from 007 for INSERT and code-based SELECT.

-- =============================================
-- 1. Drop overly permissive policies from migration 001
-- =============================================
DROP POLICY IF EXISTS "Staff acceso completo a pedidos" ON orders;

-- =============================================
-- 2. Drop weak policies from migration 008 (superseded by 009)
-- =============================================
DROP POLICY IF EXISTS "orders_staff_select" ON orders;
DROP POLICY IF EXISTS "orders_staff_update" ON orders;
DROP POLICY IF EXISTS "orders_staff_delete" ON orders;

-- =============================================
-- 3. Update is_staff() (no-arg) to delegate to is_staff(UUID)
--    so ALL RLS policies consistently check staff_members table
-- =============================================
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
  RETURN is_staff(auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_staff() IS
'No-argument wrapper that delegates to is_staff(auth.uid()). Ensures all RLS
policies consistently check the staff_members table, not just user_metadata.';

-- =============================================
-- 4. Verify remaining policies are correct
-- =============================================
-- After this migration, the active policies on orders should be:
--
-- FOR anon:
--   "Clientes pueden crear pedidos" — INSERT (from 007)
--   "Clientes no pueden actualizar pedidos" — UPDATE USING(false) (from 007)
--   "Clientes no pueden eliminar pedidos" — DELETE USING(false) (from 007)
--   "orders_select_by_code" — SELECT with path/session check (from 008)
--
-- FOR authenticated:
--   "Staff can view all orders" — SELECT using is_staff(auth.uid()) (from 009)
--   "Staff can update orders" — UPDATE using is_staff(auth.uid()) (from 009)
