-- Reset partner ratings - Delete all existing ratings to allow users to start fresh
-- This script will remove all current ratings from the partner_ratings table

-- Delete all existing ratings
DELETE FROM public.partner_ratings;

-- Reset the sequence counter to start from 1 again
ALTER SEQUENCE public.partner_ratings_id_seq RESTART WITH 1;

-- Verify the table is empty
SELECT COUNT(*) as remaining_ratings FROM public.partner_ratings;
