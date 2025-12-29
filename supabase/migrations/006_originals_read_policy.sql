-- Agregar politica de lectura publica para el bucket originals
-- Necesario para que el cliente pueda ver los previews de las fotos

-- Opcion 1: Hacer el bucket publico (mas simple)
UPDATE storage.buckets
SET public = true
WHERE id = 'originals';

-- Opcion 2 (alternativa): Mantener privado pero agregar politica SELECT
-- Si prefieres mantener el bucket privado, comenta la linea UPDATE anterior
-- y descomenta las siguientes lineas:
--
-- CREATE POLICY "Allow anonymous read from originals"
-- ON storage.objects FOR SELECT TO anon
-- USING (bucket_id = 'originals');
