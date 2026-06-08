-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy to allow public read access to tracker bucket
CREATE POLICY "Public read access for tracker bucket" ON storage.objects
FOR SELECT USING (bucket_id = 'tracker');

-- Policy to allow public upload to tracker bucket (optional - for file uploads)
CREATE POLICY "Public upload access for tracker bucket" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'tracker');

-- Policy to allow public update to tracker bucket (optional - for file updates)
CREATE POLICY "Public update access for tracker bucket" ON storage.objects
FOR UPDATE USING (bucket_id = 'tracker');

-- Policy to allow public delete from tracker bucket (optional - for file management)
CREATE POLICY "Public delete access for tracker bucket" ON storage.objects
FOR DELETE USING (bucket_id = 'tracker');
