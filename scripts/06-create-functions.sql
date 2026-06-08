-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for bd_tracker_records
DROP TRIGGER IF EXISTS update_bd_tracker_records_updated_at ON bd_tracker_records;
CREATE TRIGGER update_bd_tracker_records_updated_at
    BEFORE UPDATE ON bd_tracker_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for bd_tracker_files
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
