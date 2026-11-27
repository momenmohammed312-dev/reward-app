import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MO2 Loyalty API',
      version: '1.0.0',
      description: 'Multi-Tenant SaaS Loyalty & Rewards Platform API',
    },
    servers: [
      { url: 'http://localhost:4000', description: 'Development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Tenants', description: 'Tenant management' },
      { name: 'Loyalty', description: 'Customer loyalty operations' },
      { name: 'Admin', description: 'Admin dashboard APIs' },
      { name: 'SuperAdmin', description: 'Platform infrastructure' },
      { name: 'Rewards', description: 'Public rewards catalog' },
      { name: 'Webhooks', description: 'POS integration webhooks' },
      { name: 'POS', description: 'Synchronous POS terminal APIs (x-api-key)' },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
