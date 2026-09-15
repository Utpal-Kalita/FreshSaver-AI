-- Run this in Supabase SQL Editor

-- Create the Storage bucket for CSV uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('csv-uploads', 'csv-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies (even though service_role bypasses RLS, it's good practice to secure the bucket)
CREATE POLICY "Admins can upload CSVs" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'csv-uploads');

CREATE POLICY "Admins can read CSVs" 
ON storage.objects FOR SELECT TO authenticated 
USING (bucket_id = 'csv-uploads');
