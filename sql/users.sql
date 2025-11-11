-- Users Table Schema
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  business_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_business_id ON users(business_id);

-- Add comment for documentation
COMMENT ON TABLE users IS 'Stores user authentication and basic profile information';
COMMENT ON COLUMN users.id IS 'Primary key, auto-generated UUID';
COMMENT ON COLUMN users.email IS 'Unique email address for user login';
COMMENT ON COLUMN users.password IS 'Hashed password for authentication';
COMMENT ON COLUMN users.business_id IS 'Optional reference to associated business';
COMMENT ON COLUMN users.created_at IS 'Timestamp when user account was created';