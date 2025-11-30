/**
 * Swagger/OpenAPI Configuration
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';
import { config } from './index';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'GigHub UK API',
    version: '1.0.0',
    description: 'API documentation for GigHub UK - Short-term gig marketplace platform',
    contact: {
      name: 'GigHub UK Support',
      email: 'support@gighub.uk',
    },
    license: {
      name: 'Private',
    },
  },
  servers: [
    {
      url: `http://localhost:${config.port}/api/v1`,
      description: 'Development server',
    },
    {
      url: 'https://api.gighub.uk/api/v1',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your access token',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          error: { type: 'string' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          role: { type: 'string', enum: ['user', 'admin'] },
          status: { type: 'string', enum: ['active', 'suspended', 'pending_deletion'] },
          emailVerified: { type: 'boolean' },
          phoneVerified: { type: 'boolean' },
          profilePhotoUrl: { type: 'string', nullable: true },
          bio: { type: 'string', nullable: true },
          dateOfBirth: { type: 'string', format: 'date', nullable: true },
          averageRating: { type: 'number', nullable: true },
          totalReviews: { type: 'integer' },
          totalJobsPosted: { type: 'integer' },
          totalJobsCompleted: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Job: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string' },
          categoryId: { type: 'string', format: 'uuid' },
          locationPostcode: { type: 'string' },
          locationCity: { type: 'string', nullable: true },
          locationLat: { type: 'number' },
          locationLng: { type: 'number' },
          jobDate: { type: 'string', format: 'date' },
          startTime: { type: 'string' },
          endTime: { type: 'string', nullable: true },
          payAmount: { type: 'number' },
          payType: { type: 'string', enum: ['hourly', 'fixed', 'daily'] },
          experienceLevel: { type: 'string', enum: ['entry', 'intermediate', 'expert'], nullable: true },
          status: { type: 'string', enum: ['draft', 'active', 'filled', 'completed', 'cancelled', 'expired'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Application: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          jobId: { type: 'string', format: 'uuid' },
          applicantId: { type: 'string', format: 'uuid' },
          message: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'accepted', 'rejected', 'withdrawn'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Review: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          comment: { type: 'string', nullable: true },
          reviewerId: { type: 'string', format: 'uuid' },
          revieweeId: { type: 'string', format: 'uuid' },
          jobId: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          slug: { type: 'string' },
          description: { type: 'string', nullable: true },
          icon: { type: 'string', nullable: true },
          parentId: { type: 'string', format: 'uuid', nullable: true },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          type: { type: 'string' },
          title: { type: 'string' },
          body: { type: 'string' },
          isRead: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { success: false, message: 'Unauthorized' },
          },
        },
      },
      Forbidden: {
        description: 'Insufficient permissions',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { success: false, message: 'Forbidden' },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { success: false, message: 'Not found' },
          },
        },
      },
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { success: false, message: 'Validation error', errors: [] },
          },
        },
      },
    },
  },
  tags: [
    { name: 'Auth', description: 'Authentication endpoints' },
    { name: 'Users', description: 'User management endpoints' },
    { name: 'Jobs', description: 'Job posting and search endpoints' },
    { name: 'Applications', description: 'Job application endpoints' },
    { name: 'Reviews', description: 'Review and rating endpoints' },
    { name: 'Messages', description: 'Messaging endpoints' },
    { name: 'Notifications', description: 'Notification endpoints' },
    { name: 'Categories', description: 'Category endpoints' },
    { name: 'Admin', description: 'Admin panel endpoints' },
    { name: 'Legal', description: 'Legal documents endpoints' },
    { name: 'GDPR', description: 'GDPR compliance endpoints' },
  ],
};

const options: swaggerJsdoc.Options = {
  swaggerDefinition,
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Application): void {
  // Swagger UI
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'GigHub UK API Documentation',
    })
  );

  // JSON spec endpoint
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

export { swaggerSpec };
export default setupSwagger;
