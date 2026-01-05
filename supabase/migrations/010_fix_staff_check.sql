-- =============================================
-- Fix Staff Check Function - Migration 010
-- =============================================
-- Problema: La función is_staff(UUID) solo verifica la tabla staff_members,
-- pero el usuario tiene user_metadata.role = 'staff' configurado via API.
-- Esta migración:
-- 1. Inserta el usuario en staff_members
-- 2. Actualiza is_staff(UUID) para verificar ambos métodos

-- =============================================
-- 1. Insertar usuario staff existente
-- =============================================
INSERT INTO staff_members (user_id, role, is_active)
VALUES ('a3692c6a-d238-41d4-8bd9-8bce1146feba', 'staff', true)
ON CONFLICT (user_id) DO UPDATE SET
    is_active = true,
    role = 'staff',
    updated_at = NOW();

-- =============================================
-- 2. Actualizar función is_staff(UUID) para verificar
--    tanto staff_members como user_metadata
-- =============================================
-- Usamos CREATE OR REPLACE para actualizar sin eliminar dependencias
CREATE OR REPLACE FUNCTION is_staff(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check 1: staff_members table (primary method)
    IF EXISTS (
        SELECT 1 FROM staff_members sm
        WHERE sm.user_id = is_staff.user_id
        AND sm.is_active = true
    ) THEN
        RETURN TRUE;
    END IF;

    -- Check 2: user_metadata fallback (for users added via API)
    -- Only check if the user_id matches the current auth user
    IF is_staff.user_id = auth.uid() THEN
        RETURN COALESCE(
            (auth.jwt() -> 'user_metadata' ->> 'role') = 'staff',
            (auth.jwt() -> 'user_metadata' ->> 'is_staff')::boolean,
            FALSE
        );
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 3. Comentario para documentación
-- =============================================
COMMENT ON FUNCTION is_staff(UUID) IS
'Verifica si un usuario tiene rol de staff. Primero verifica la tabla staff_members,
luego verifica user_metadata como fallback para usuarios configurados via API.';
