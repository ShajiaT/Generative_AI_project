-- Quick test to verify your business table structure
-- Run this in Supabase SQL Editor after running the main schema

-- Check if business table exists and has correct structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'business' 
ORDER BY ordinal_position;

-- Check if the PostgreSQL functions exist
SELECT 
    routine_name, 
    routine_type, 
    data_type
FROM information_schema.routines 
WHERE routine_name LIKE '%business%';

-- Show current businesses and their images
SELECT 
    id,
    name,
    images,
    array_length(images, 1) as image_count,
    created_at
FROM business 
ORDER BY created_at DESC;