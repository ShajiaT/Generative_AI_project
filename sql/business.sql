-- Business Table Schema
CREATE TABLE business (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  address TEXT,
  contact TEXT,
  images TEXT[], -- array of image URLs from Supabase Storage
  reviews JSONB DEFAULT '[]',
  rating NUMERIC(3,2) DEFAULT 0.0,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_business_user_id ON business(user_id);
CREATE INDEX idx_business_type ON business(type);
CREATE INDEX idx_business_rating ON business(rating);
CREATE INDEX idx_business_created_at ON business(created_at);

-- Add constraints
ALTER TABLE business ADD CONSTRAINT check_rating_range CHECK (rating >= 0.0 AND rating <= 5.0);

-- Add comment for documentation
COMMENT ON TABLE business IS 'Stores business information and associated data';
COMMENT ON COLUMN business.id IS 'Primary key, auto-generated UUID';
COMMENT ON COLUMN business.user_id IS 'Foreign key reference to users table';
COMMENT ON COLUMN business.name IS 'Business name';
COMMENT ON COLUMN business.type IS 'Business type/category';
COMMENT ON COLUMN business.address IS 'Physical address of the business';
COMMENT ON COLUMN business.contact IS 'Contact information (phone, email, etc.)';
COMMENT ON COLUMN business.images IS 'Array of image URLs stored in Supabase Storage';
COMMENT ON COLUMN business.reviews IS 'JSON array of customer reviews';
COMMENT ON COLUMN business.rating IS 'Average rating (0.0 to 5.0)';
COMMENT ON COLUMN business.description IS 'Detailed business description';
COMMENT ON COLUMN business.created_at IS 'Timestamp when business was created';