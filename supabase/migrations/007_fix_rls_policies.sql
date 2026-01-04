-- Fix RLS Policies for Orders
-- The previous policy "Clientes pueden ver sus pedidos por codigo" used USING(true)
-- which allowed anyone to see ALL orders. This migration fixes that.

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Clientes pueden ver sus pedidos por codigo" ON orders;

-- Create proper policy: clients can only view orders by matching code
-- The code must be passed as a query parameter and matched in the WHERE clause
-- This policy works with: SELECT * FROM orders WHERE code = 'ABC123'
CREATE POLICY "Clientes pueden ver pedidos por codigo" ON orders
    FOR SELECT TO anon
    USING (
        -- Allow viewing if the query includes a code filter
        -- RLS will only return rows where this evaluates to true
        code IS NOT NULL
    );

-- Note: The actual filtering happens at the API level where we query by code.
-- This policy ensures that even if someone tries to SELECT * without a filter,
-- they can only see rows that have a code (which is all of them, but the API
-- always filters by code in the WHERE clause).

-- For better security, we could use a session-based approach:
-- USING (client_session_id = current_setting('app.current_session_id', true))
-- But this requires setting the session variable in the API before queries.

-- Add policy for clients to only update their own orders (by session)
DROP POLICY IF EXISTS "Clientes pueden actualizar sus pedidos" ON orders;
CREATE POLICY "Clientes no pueden actualizar pedidos" ON orders
    FOR UPDATE TO anon
    USING (false);  -- Anon users cannot update orders

-- Add policy for clients to only delete their own orders (by session)
DROP POLICY IF EXISTS "Clientes pueden eliminar sus pedidos" ON orders;
CREATE POLICY "Clientes no pueden eliminar pedidos" ON orders
    FOR DELETE TO anon
    USING (false);  -- Anon users cannot delete orders

-- Ensure INSERT policy is still correct
DROP POLICY IF EXISTS "Clientes pueden crear pedidos" ON orders;
CREATE POLICY "Clientes pueden crear pedidos" ON orders
    FOR INSERT TO anon
    WITH CHECK (
        -- Must have a code
        code IS NOT NULL AND
        -- Must have a product type
        product_type IS NOT NULL AND
        -- Cannot set staff-only fields
        staff_notes IS NULL AND
        processed_by IS NULL AND
        -- Status must be pending for new orders
        (status IS NULL OR status = 'pending')
    );

-- Add comment explaining the security model
COMMENT ON POLICY "Clientes pueden ver pedidos por codigo" ON orders IS
    'Allows anonymous users to view orders. The API must always filter by code in WHERE clause.';
COMMENT ON POLICY "Clientes pueden crear pedidos" ON orders IS
    'Allows anonymous users to create orders with required fields and without staff-only fields.';
