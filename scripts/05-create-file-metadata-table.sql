-- Create table to track Excel file metadata and processing status
CREATE TABLE IF NOT EXISTS bd_tracker_files (
  id BIGSERIAL PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  last_modified TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE,
  records_count INTEGER DEFAULT 0,
  processing_status TEXT DEFAULT 'pending', -- pending, processing, completed, error
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE bd_tracker_files ENABLE ROW LEVEL SECURITY;

-- Policy for public access
CREATE POLICY "Public access for BD tracker files" ON bd_tracker_files
FOR ALL USING (true);

-- Create unique index on file_path
CREATE UNIQUE INDEX IF NOT EXISTS idx_bd_tracker_files_path ON bd_tracker_files(file_path);
