-- =====================================================
-- Remove Boston as default city
-- =====================================================
-- This patch removes "Boston" as the default value for the city column

-- Remove the default value from the city column
ALTER TABLE shows ALTER COLUMN city DROP DEFAULT;
