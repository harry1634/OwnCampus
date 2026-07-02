-- Create public photos storage bucket for profile pictures and logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos', 'photos', true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Public read access (photos bucket is public)
CREATE POLICY IF NOT EXISTS "photos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'photos');

-- Authenticated users can upload photos
CREATE POLICY IF NOT EXISTS "photos_auth_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'photos' AND auth.role() = 'authenticated');

-- Authenticated users can replace (update) photos
CREATE POLICY IF NOT EXISTS "photos_auth_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'photos' AND auth.role() = 'authenticated');

-- Authenticated users can delete photos
CREATE POLICY IF NOT EXISTS "photos_auth_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'photos' AND auth.role() = 'authenticated');
