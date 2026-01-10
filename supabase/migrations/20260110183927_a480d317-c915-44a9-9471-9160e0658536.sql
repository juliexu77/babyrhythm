-- Create profile-photos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true);

-- Allow authenticated users to upload their own profile photos
CREATE POLICY "Users can upload their own profile photo"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'profile-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own profile photos
CREATE POLICY "Users can update their own profile photo"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'profile-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own profile photos
CREATE POLICY "Users can delete their own profile photo"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'profile-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to profile photos
CREATE POLICY "Profile photos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'profile-photos');