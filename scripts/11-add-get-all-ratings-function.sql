-- Create function to get all partner ratings with averages
CREATE OR REPLACE FUNCTION get_all_partner_ratings()
RETURNS TABLE (
  partner_name TEXT,
  partner_type TEXT,
  average_rating NUMERIC,
  total_ratings BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.partner_name,
    pr.partner_type,
    ROUND(AVG(pr.rating), 2) as average_rating,
    COUNT(pr.rating) as total_ratings
  FROM partner_ratings pr
  GROUP BY pr.partner_name, pr.partner_type
  ORDER BY average_rating DESC, total_ratings DESC;
END;
$$ LANGUAGE plpgsql;
