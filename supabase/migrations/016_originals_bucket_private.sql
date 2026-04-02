-- =============================================
-- Make originals bucket private - Migration 016
-- =============================================
-- Previously migration 006 set public = true on originals bucket,
-- making all customer photos accessible to anyone with the URL.
-- Now all access goes through signed URLs generated server-side.
--
-- PREREQUISITE: Code must be deployed with createSignedUrl() BEFORE
-- running this migration. If run before code deploy, print view and
-- photo previews will break (images return 403).

-- 1. Make bucket private
UPDATE storage.buckets SET public = false WHERE id = 'originals';

-- 2. Remove anonymous read policy (no longer needed with signed URLs)
DROP POLICY IF EXISTS "Allow anonymous read from originals" ON storage.objects;

-- 3. Ensure authenticated users can still read via signed URLs
-- (Signed URLs bypass RLS via the service role, so no policy needed
-- for that. But keep the existing upload policy for anon users.)
