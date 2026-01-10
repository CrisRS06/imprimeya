-- Fix: Agregar politica SELECT para bucket originals
-- Problema: El INSERT falla porque Supabase necesita leer metadatos durante la operacion
-- Error: "new row violates row-level security policy"

-- Verificar si la politica ya existe antes de crearla
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Allow anonymous read from originals'
        AND tablename = 'objects'
        AND schemaname = 'storage'
    ) THEN
        -- Crear politica SELECT para usuarios anonimos en bucket originals
        CREATE POLICY "Allow anonymous read from originals"
        ON storage.objects FOR SELECT TO anon
        USING (bucket_id = 'originals');

        RAISE NOTICE 'Politica SELECT creada exitosamente';
    ELSE
        RAISE NOTICE 'La politica ya existe, no se requiere accion';
    END IF;
END $$;
