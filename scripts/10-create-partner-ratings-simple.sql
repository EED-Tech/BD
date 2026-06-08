-- Create partner_ratings table
CREATE TABLE IF NOT EXISTS public.partner_ratings (
    id BIGSERIAL PRIMARY KEY,
    partner_name TEXT NOT NULL,
    partner_type TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    rated_by TEXT NOT NULL DEFAULT 'anonymous',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_partner_ratings_partner ON public.partner_ratings(partner_name, partner_type);
CREATE INDEX IF NOT EXISTS idx_partner_ratings_created_at ON public.partner_ratings(created_at);

-- Enable RLS
ALTER TABLE public.partner_ratings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (you can make this more restrictive later)
CREATE POLICY "Allow all operations on partner_ratings" ON public.partner_ratings
    FOR ALL USING (true) WITH CHECK (true);

-- Create function to get average rating
CREATE OR REPLACE FUNCTION public.get_partner_average_rating(p_name TEXT, p_type TEXT)
RETURNS TABLE(avg_rating NUMERIC, total_ratings BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(AVG(rating), 0)::NUMERIC as avg_rating,
        COUNT(*)::BIGINT as total_ratings
    FROM public.partner_ratings 
    WHERE partner_name = p_name AND partner_type = p_type;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT ALL ON public.partner_ratings TO authenticated;
GRANT ALL ON public.partner_ratings TO anon;
GRANT USAGE ON SEQUENCE public.partner_ratings_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.partner_ratings_id_seq TO anon;
