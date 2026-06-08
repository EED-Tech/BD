-- Create partner_ratings table
CREATE TABLE IF NOT EXISTS partner_ratings (
  id BIGSERIAL PRIMARY KEY,
  partner_name TEXT NOT NULL,
  partner_type TEXT NOT NULL CHECK (partner_type IN ('firm', 'expert')),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  rated_by TEXT NOT NULL DEFAULT 'anonymous',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_partner_ratings_partner ON partner_ratings(partner_name, partner_type);
CREATE INDEX IF NOT EXISTS idx_partner_ratings_created_at ON partner_ratings(created_at);

-- Enable RLS
ALTER TABLE partner_ratings ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Anyone can read partner ratings" ON partner_ratings
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert partner ratings" ON partner_ratings
  FOR INSERT WITH CHECK (true);

-- Create function to get average rating
CREATE OR REPLACE FUNCTION get_partner_average_rating(p_name TEXT, p_type TEXT)
RETURNS TABLE(avg_rating NUMERIC, total_ratings BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(AVG(rating), 0)::NUMERIC(3,2) as avg_rating,
    COUNT(*)::BIGINT as total_ratings
  FROM partner_ratings 
  WHERE partner_name = p_name AND partner_type = p_type;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON partner_ratings TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE partner_ratings_id_seq TO anon, authenticated;
