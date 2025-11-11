// src/config/swagger.js
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Business Management API',
      version: '1.0.0',
      description: 'A comprehensive API for managing users and businesses with image upload functionality',
      contact: {
        name: 'API Support',
        email: 'support@businessapi.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/controllers/*.js',
    './src/routes/*.js'
  ]
};

const specs = swaggerJSDoc(options);

export { specs, swaggerUi };