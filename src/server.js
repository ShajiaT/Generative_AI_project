// src/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Import routes
import userRoutes from "./routes/userRoutes.js";
import businessRoutes from "./routes/businessRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";

// Import Swagger configuration
import { specs, swaggerUi } from "./config/swagger.js";

// Import service for connection testing
import supabaseService from "./services/supabaseService.js";

dotenv.config();

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET environment variable is required');
  process.exit(1);
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Business Management API Documentation'
}));

// API Routes
app.use("/api/users", userRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/upload-image", uploadRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "🚀 Business Management API is running!",
    version: "1.0.0",
    documentation: "http://localhost:5000/api-docs",
    endpoints: {
      users: "/api/users",
      business: "/api/business", 
      upload: "/api/upload-image"
    }
  });
});

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    const dbConnection = await supabaseService.testConnection();
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: dbConnection ? "connected" : "disconnected",
      environment: process.env.NODE_ENV || "development"
    });
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Debug endpoint to check database schema
app.get("/debug/schema", async (req, res) => {
  try {
    const client = supabaseService.getAdminClient();
    
    // Check business table schema
    const { data: schemaInfo, error: schemaError } = await client
      .rpc('get_column_info', { table_name: 'business' })
      .catch(() => {
        // Fallback: try to get basic table info
        return client.from('business').select('*').limit(1);
      });
    
    // Get sample business data
    const { data: sampleBusiness, error: sampleError } = await client
      .from('business')
      .select('*')
      .limit(5);
    
    res.json({
      schema: schemaInfo || 'Schema info not available',
      schemaError,
      sampleData: sampleBusiness || [],
      sampleError,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
    documentation: 'http://localhost:5000/api-docs'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Request entity too large'
    });
  }
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
  console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
});
