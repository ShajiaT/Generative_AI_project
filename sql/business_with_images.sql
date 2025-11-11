-- Complete Business Table Schema with proper URL storage
-- This ensures the images column properly stores URLs from the business-images bucket

-- Drop existing table if you want to recreate (BE CAREFUL - THIS DELETES DATA)
-- DROP TABLE IF EXISTS business CASCADE;

-- Create business table with proper constraints
CREATE TABLE IF NOT EXISTS business (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) > 0),
  type TEXT NOT NULL CHECK (length(type) > 0),
  address TEXT,
  contact TEXT,
  images TEXT[] DEFAULT '{}' NOT NULL, -- Array of image URLs from business-images bucket
  reviews JSONB DEFAULT '[]' NOT NULL,
  rating NUMERIC(3,2) DEFAULT 0.0 CHECK (rating >= 0.0 AND rating <= 5.0),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_business_user_id ON business(user_id);
CREATE INDEX IF NOT EXISTS idx_business_type ON business(type);
CREATE INDEX IF NOT EXISTS idx_business_rating ON business(rating);
CREATE INDEX IF NOT EXISTS idx_business_created_at ON business(created_at);

-- Add a GIN index for array operations on images
CREATE INDEX IF NOT EXISTS idx_business_images_gin ON business USING GIN(images);

-- Function to validate image URLs (ensures they point to business-images bucket)
CREATE OR REPLACE FUNCTION validate_business_image_url(url TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if URL contains the business-images bucket path
  RETURN url LIKE '%business-images%' OR url = '';
END;
$$ LANGUAGE plpgsql;

-- Add constraint to ensure images URLs are from business-images bucket
-- ALTER TABLE business ADD CONSTRAINT check_image_urls 
-- CHECK (
--   images IS NULL OR 
--   array_length(images, 1) IS NULL OR 
--   (SELECT bool_and(validate_business_image_url(url)) FROM unnest(images) AS url)
-- );

-- Function to safely add image URL to business
CREATE OR REPLACE FUNCTION add_image_to_business(business_id UUID, image_url TEXT)
RETURNS TABLE(id UUID, user_id UUID, name TEXT, type TEXT, address TEXT, contact TEXT, images TEXT[], reviews JSONB, rating NUMERIC, description TEXT, created_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validate the image URL
  IF NOT validate_business_image_url(image_url) THEN
    RAISE EXCEPTION 'Invalid image URL. Must be from business-images bucket.';
  END IF;
  
  -- Update the business by appending the image URL to the images array
  UPDATE business 
  SET images = COALESCE(images, '{}') || ARRAY[image_url]
  WHERE business.id = business_id;
  
  -- Check if business was found and updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business with ID % not found', business_id;
  END IF;
  
  -- Return the updated business
  RETURN QUERY
  SELECT b.id, b.user_id, b.name, b.type, b.address, b.contact, b.images, b.reviews, b.rating, b.description, b.created_at
  FROM business b
  WHERE b.id = business_id;
END;
$$;

-- Function to remove image URL from business
CREATE OR REPLACE FUNCTION remove_image_from_business(business_id UUID, image_url TEXT)
RETURNS TABLE(id UUID, user_id UUID, name TEXT, type TEXT, address TEXT, contact TEXT, images TEXT[], reviews JSONB, rating NUMERIC, description TEXT, created_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update the business by removing the image URL from the images array
  UPDATE business 
  SET images = array_remove(images, image_url)
  WHERE business.id = business_id;
  
  -- Check if business was found and updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business with ID % not found', business_id;
  END IF;
  
  -- Return the updated business
  RETURN QUERY
  SELECT b.id, b.user_id, b.name, b.type, b.address, b.contact, b.images, b.reviews, b.rating, b.description, b.created_at
  FROM business b
  WHERE b.id = business_id;
END;
$$;

-- Function to get businesses with image count
CREATE OR REPLACE FUNCTION get_businesses_with_image_count()
RETURNS TABLE(id UUID, user_id UUID, name TEXT, type TEXT, address TEXT, contact TEXT, images TEXT[], reviews JSONB, rating NUMERIC, description TEXT, created_at TIMESTAMP WITH TIME ZONE, image_count INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT b.id, b.user_id, b.name, b.type, b.address, b.contact, b.images, b.reviews, b.rating, b.description, b.created_at,
         COALESCE(array_length(b.images, 1), 0) as image_count
  FROM business b
  ORDER BY b.created_at DESC;
END;
$$;

-- Add comments for documentation
COMMENT ON TABLE business IS 'Stores business information with image URLs from Supabase Storage';
COMMENT ON COLUMN business.images IS 'Array of image URLs from the business-images storage bucket';
COMMENT ON FUNCTION add_image_to_business(UUID, TEXT) IS 'Safely adds an image URL to a business images array';
COMMENT ON FUNCTION remove_image_from_business(UUID, TEXT) IS 'Removes an image URL from a business images array';
COMMENT ON FUNCTION validate_business_image_url(TEXT) IS 'Validates that image URL is from business-images bucket';