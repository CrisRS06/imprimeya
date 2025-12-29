-- Sincronizar base de datos con el nuevo sistema de layouts de fotos
-- NOTA: Los nuevos tipos de papel (bond_normal, fotografico, etc.) se manejan
-- via mapeo en el API, no en la BD. Esto evita problemas con enums.

-- ============================================
-- 1. AGREGAR NUEVOS TIPOS DE PRODUCTO
-- ============================================

-- Agregar nuevos tipos de producto al enum
-- NOTA: No usamos estos valores inmediatamente, solo los agregamos
ALTER TYPE product_type ADD VALUE IF NOT EXISTS 'photo';
ALTER TYPE product_type ADD VALUE IF NOT EXISTS 'document';

-- ============================================
-- NOTAS SOBRE TIPOS DE PAPEL:
-- ============================================
-- El frontend usa: bond_normal, fotografico, sticker_semigloss, cartulina_lino, opalina
-- La BD tiene: normal, glossy, matte, sticker, opalina, lino
--
-- El mapeo se hace en /app/api/orders/route.ts:
--   bond_normal -> normal
--   fotografico -> glossy
--   sticker_semigloss -> sticker
--   cartulina_lino -> lino
--   opalina -> opalina (ya existe)
--
-- Esto permite mantener compatibilidad sin modificar el enum existente.
-- ============================================
