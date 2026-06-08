-- Add RLS policies for partner_ratings table to work in production

-- Enable RLS on partner_ratings table
ALTER TABLE partner_ratings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read partner ratings (public data)
CREATE POLICY "Allow public read access to partner ratings" 
ON partner_ratings FOR SELECT 
USING (true);

-- Allow anyone to insert partner ratings (anonymous ratings allowed)
CREATE POLICY "Allow public insert access to partner ratings" 
ON partner_ratings FOR INSERT 
WITH CHECK (true);

-- Optional: Allow users to update their own ratings if we track user sessions later
-- CREATE POLICY "Allow users to update their own ratings" 
-- ON partner_ratings FOR UPDATE 
-- USING (rated_by = current_user OR rated_by = 'anonymous');

-- Optional: Allow users to delete their own ratings if we track user sessions later
-- CREATE POLICY "Allow users to delete their own ratings" 
-- ON partner_ratings FOR DELETE 
-- USING (rated_by = current_user OR rated_by = 'anonymous');
