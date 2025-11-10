// src/middleware/authMiddleware.js
import supabaseService from "../services/supabaseService.js";

export const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: "Access token required. Please provide a valid Bearer token." 
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        error: "No token provided" 
      });
    }

    console.log('Authenticating token for user...');

    // Get user from token using the service client
    const client = supabaseService.getClient();
    const { data, error } = await client.auth.getUser(token);

    if (error) {
      console.error('Token validation error:', error);
      return res.status(401).json({ 
        error: "Invalid or expired token" 
      });
    }

    if (!data.user) {
      return res.status(401).json({ 
        error: "No user found for this token" 
      });
    }

    console.log('User authenticated:', data.user.email);

    // Attach user to request object
    req.user = data.user;
    next();
    
  } catch (err) {
    console.error('Authentication middleware error:', err);
    res.status(500).json({ 
      error: "Authentication service error" 
    });
  }
};
