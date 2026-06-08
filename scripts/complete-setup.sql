-- Complete Supabase setup script for BD Tracker Dashboard
-- Run this in your Supabase SQL Editor

-- 1. Create storage bucket for BD tracker Excel files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tracker',
  'tracker', 
  true,
  52428800, -- 50MB limit
  ARRAY['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on storage.objects and create storage policies
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Storage policies
CREATE POLICY "Public read access for tracker bucket" ON storage.objects
FOR SELECT USING (bucket_id = 'tracker');

CREATE POLICY "Public upload access for tracker bucket" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'tracker');

CREATE POLICY "Public update access for tracker bucket" ON storage.objects
FOR UPDATE USING (bucket_id = 'tracker');

CREATE POLICY "Public delete access for tracker bucket" ON storage.objects
FOR DELETE USING (bucket_id = 'tracker');

-- 3. Create table to store BD tracker records
CREATE TABLE IF NOT EXISTS bd_tracker_records (
  id BIGSERIAL PRIMARY KEY,
  serial_number INTEGER,
  bd TEXT,
  quarter TEXT,
  client TEXT,
  organization TEXT,
  title TEXT,
  business_line TEXT,
  service_offering TEXT,
  type_bd TEXT,
  country TEXT,
  origin TEXT,
  deadline TEXT,
  cvs_profiles TEXT,
  workplan_budget TEXT,
  methodology TEXT,
  other_activity TEXT,
  partners TEXT,
  pc TEXT,
  pd TEXT,
  budget DECIMAL(15,2) DEFAULT 0,
  status TEXT,
  timeframe TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bd_tracker_quarter ON bd_tracker_records(quarter);
CREATE INDEX IF NOT EXISTS idx_bd_tracker_status ON bd_tracker_records(status);
CREATE INDEX IF NOT EXISTS idx_bd_tracker_country ON bd_tracker_records(country);
CREATE INDEX IF NOT EXISTS idx_bd_tracker_business_line ON bd_tracker_records(business_line);
CREATE INDEX IF NOT EXISTS idx_bd_tracker_client ON bd_tracker_records(client);

-- 5. Enable RLS on bd_tracker_records table
ALTER TABLE bd_tracker_records ENABLE ROW LEVEL SECURITY;

-- RLS policies for bd_tracker_records
CREATE POLICY "Public read access for BD tracker records" ON bd_tracker_records
FOR SELECT USING (true);

CREATE POLICY "Public insert access for BD tracker records" ON bd_tracker_records
FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update access for BD tracker records" ON bd_tracker_records
FOR UPDATE USING (true);

CREATE POLICY "Public delete access for BD tracker records" ON bd_tracker_records
FOR DELETE USING (true);

-- 6. Create table to track Excel file metadata and processing status
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

-- Enable RLS on bd_tracker_files
ALTER TABLE bd_tracker_files ENABLE ROW LEVEL SECURITY;

-- Policy for public access to bd_tracker_files
CREATE POLICY "Public access for BD tracker files" ON bd_tracker_files
FOR ALL USING (true);

-- Create unique index on file_path
CREATE UNIQUE INDEX IF NOT EXISTS idx_bd_tracker_files_path ON bd_tracker_files(file_path);

-- 7. Create utility functions
-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_bd_tracker_records_updated_at ON bd_tracker_records;
CREATE TRIGGER update_bd_tracker_records_updated_at
    BEFORE UPDATE ON bd_tracker_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bd_tracker_files_updated_at ON bd_tracker_files;
CREATE TRIGGER update_bd_tracker_files_updated_at
    BEFORE UPDATE ON bd_tracker_files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to get BD tracker statistics
CREATE OR REPLACE FUNCTION get_bd_tracker_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_records', COUNT(*),
        'by_status', json_object_agg(status, status_count),
        'by_quarter', json_object_agg(quarter, quarter_count),
        'by_country', json_object_agg(country, country_count),
        'total_budget', SUM(budget),
        'last_updated', MAX(updated_at)
    ) INTO result
    FROM (
        SELECT 
            status,
            quarter,
            country,
            budget,
            updated_at,
            COUNT(*) OVER (PARTITION BY status) as status_count,
            COUNT(*) OVER (PARTITION BY quarter) as quarter_count,
            COUNT(*) OVER (PARTITION BY country) as country_count
        FROM bd_tracker_records
        WHERE status IS NOT NULL AND status != ''
    ) stats;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 8. Insert sample BD tracker data for testing
INSERT INTO bd_tracker_records (
    serial_number, bd, quarter, client, organization, title, business_line,
    service_offering, type_bd, country, origin, deadline, cvs_profiles,
    workplan_budget, methodology, other_activity, partners, pc, pd,
    budget, status, timeframe
) VALUES 
(1, 'RFP', 'Q1 2025', 'Ministry of Health', 'Government', 'Healthcare System Modernization', 'Health', 'Digital Transformation', 'RFP', 'Kenya', 'Direct', '2025-03-15', 'Senior Consultant, Technical Lead', 'Detailed workplan included', 'Agile methodology', 'Training workshops', 'Local tech partner', 'John Smith', 'Jane Doe', 250000.00, 'In Progress', '12 months'),
(2, 'EOI', 'Q1 2025', 'World Bank', 'International', 'Education Infrastructure Development', 'Education', 'Infrastructure Planning', 'EOI', 'Tanzania', 'Referral', '2025-02-28', 'Project Manager, Engineers', 'Budget framework provided', 'Traditional PM', 'Community engagement', 'Construction firm', 'Mike Johnson', 'Sarah Wilson', 180000.00, 'Submitted', '18 months'),
(3, 'RFP', 'Q2 2025', 'African Development Bank', 'International', 'Water Resource Management', 'Environment', 'Environmental Consulting', 'RFP', 'Ghana', 'Partnership', '2025-06-30', 'Environmental Specialist, Hydrologist', 'Comprehensive budget', 'Mixed methods', 'Stakeholder workshops', 'Environmental NGO', 'David Brown', 'Lisa Garcia', 320000.00, 'Preparation', '24 months'),
(4, 'Tender', 'Q2 2025', 'Private Mining Company', 'Private', 'Environmental Impact Assessment', 'Environment', 'EIA Services', 'Tender', 'Botswana', 'Direct', '2025-05-15', 'EIA Specialist, Biologist', 'Fixed price contract', 'Standard EIA', 'Public consultations', 'Local research institute', 'Robert Taylor', 'Emma Davis', 95000.00, 'Won', '8 months'),
(5, 'RFP', 'Q3 2025', 'European Union', 'International', 'Climate Change Adaptation', 'Climate', 'Climate Consulting', 'RFP', 'Multi-country', 'Network', '2025-09-01', 'Climate Expert, Policy Analyst', 'EU budget guidelines', 'Participatory approach', 'Policy workshops', 'European research center', 'Chris Anderson', 'Maria Rodriguez', 450000.00, 'Pipeline', '36 months')
ON CONFLICT DO NOTHING;

-- Success message
SELECT 'BD Tracker database setup completed successfully!' as message;
