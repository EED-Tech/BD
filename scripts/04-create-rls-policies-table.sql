-- Enable RLS on bd_tracker_records table
ALTER TABLE bd_tracker_records ENABLE ROW LEVEL SECURITY;

-- Policy to allow public read access to BD tracker records
CREATE POLICY "Public read access for BD tracker records" ON bd_tracker_records
FOR SELECT USING (true);

-- Policy to allow public insert to BD tracker records (for data imports)
CREATE POLICY "Public insert access for BD tracker records" ON bd_tracker_records
FOR INSERT WITH CHECK (true);

-- Policy to allow public update to BD tracker records (for data updates)
CREATE POLICY "Public update access for BD tracker records" ON bd_tracker_records
FOR UPDATE USING (true);

-- Policy to allow public delete from BD tracker records (for data cleanup)
CREATE POLICY "Public delete access for BD tracker records" ON bd_tracker_records
FOR DELETE USING (true);
