-- Migración de consolidación - Documenta estado final de enums
-- Los ALTER TYPE ADD VALUE ya fueron ejecutados manualmente en Supabase Dashboard
-- (PostgreSQL no permite ALTER TYPE ADD VALUE dentro de transacciones)

-- Documentar tipos
COMMENT ON TYPE product_type IS 'Tipos de producto: photo, document, single_photo, collage, poster';
COMMENT ON TYPE order_status IS 'Estados de orden: pending, processing, ready, delivered, cancelled';
COMMENT ON COLUMN orders.is_color IS 'true = impresión a color, false = blanco y negro';

-- Verificar integridad de enums
DO $$
DECLARE
    missing_values TEXT[];
BEGIN
    -- Verificar que photo y document existen en el enum product_type
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'photo' AND enumtypid = 'product_type'::regtype) THEN
        RAISE EXCEPTION 'ENUM product_type missing value: photo. Run ALTER TYPE manually in SQL Editor.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'document' AND enumtypid = 'product_type'::regtype) THEN
        RAISE EXCEPTION 'ENUM product_type missing value: document. Run ALTER TYPE manually in SQL Editor.';
    END IF;

    -- Verificar que todos los estados de orden existen
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'processing' AND enumtypid = 'order_status'::regtype) THEN
        RAISE EXCEPTION 'ENUM order_status missing value: processing. Run ALTER TYPE manually in SQL Editor.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ready' AND enumtypid = 'order_status'::regtype) THEN
        RAISE EXCEPTION 'ENUM order_status missing value: ready. Run ALTER TYPE manually in SQL Editor.';
    END IF;
END $$;
