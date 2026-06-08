-- Create partner ratings table
CREATE TABLE IF NOT EXISTS partner_ratings (
  id BIGSERIAL PRIMARY KEY,
  partner_name TEXT NOT NULL,
  partner_type TEXT NOT NULL CHECK (partner_type IN ('individual', 'firm')),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  rated_by TEXT, -- Could be user email or identifier
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_partner_ratings_name ON partner_ratings(partner_name);
CREATE INDEX IF NOT EXISTS idx_partner_ratings_type ON partner_ratings(partner_type);

-- Enable RLS
ALTER TABLE partner_ratings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now (you can restrict this later)
CREATE POLICY "Allow all operations on partner_ratings" ON partner_ratings
  FOR ALL USING (true);

-- Create function to calculate average rating
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
