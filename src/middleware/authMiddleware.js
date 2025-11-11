// src/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import supabaseService from '../services/supabaseService.js';

/**
 * JWT Authentication Middleware
 * Validates JWT tokens and attaches user information to request
 */
export const authenticateToken = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Access token required. Please provide a valid Bearer token.' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        error: 'No token provided' 
      });
    }

    console.log('Authenticating token for user...');

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database to ensure they still exist
    const { data: user, error } = await supabaseService.getUserById(decoded.userId);
    
    if (error || !user) {
      return res.status(401).json({ 
        error: 'Invalid token or user not found' 
      });
    }

    console.log('User authenticated:', user.email);

    // Attach user to request object
    req.user = user;
    next();
    
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token format' 
      });
    }
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired' 
      });
    }
    
    console.error('Authentication middleware error:', err);
    res.status(500).json({ 
      error: 'Authentication service error' 
    });
  }
};

/**
 * Optional Authentication Middleware
 * Tries to authenticate but doesn't require it
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { data: user, error } = await supabaseService.getUserById(decoded.userId);
    
    req.user = error ? null : user;
    next();
    
  } catch (err) {
    // For optional auth, we don't return errors, just set user to null
    req.user = null;
    next();
  }
};