-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('originals', 'originals', false),
  ('processed', 'processed', false),
  ('pdfs', 'pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies

-- Permitir uploads anónimos a originals
CREATE POLICY "Allow anonymous uploads to originals"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'originals');

-- Permitir lectura anónima de processed y pdfs
CREATE POLICY "Allow anonymous read from processed"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'processed');

CREATE POLICY "Allow anonymous read from pdfs"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'pdfs');

-- Service role tiene acceso completo (ya está por defecto)
